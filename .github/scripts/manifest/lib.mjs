// Manifests de déploiement : un fichier par état déployable de main (deploy/manifests).
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import YAML from 'yaml';

const FILE_PATTERN = /^manifest-(\d{4,})-([a-f0-9]{7})\.yaml$/;

export function fileName(version, sourceRevision) {
  return `manifest-${String(version).padStart(4, '0')}-${sourceRevision.slice(0, 7)}.yaml`;
}

export function loadValidator(schemaPath) {
  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);
  return ajv.compile(JSON.parse(readFileSync(schemaPath, 'utf8')));
}

/** Manifests du dossier, triés par numéro de version (celui du nom de fichier). */
export function readManifests(dir) {
  return readdirSync(dir)
    .filter((file) => file.startsWith('manifest-'))
    .map((file) => {
      const match = FILE_PATTERN.exec(file);
      return {
        file,
        path: join(dir, file),
        nameVersion: match ? Number(match[1]) : null,
        nameRevision: match ? match[2] : null,
        data: YAML.parse(readFileSync(join(dir, file), 'utf8')),
      };
    })
    .sort((a, b) => (a.nameVersion ?? -1) - (b.nameVersion ?? -1));
}

export function latestManifest(dir) {
  return readManifests(dir).at(-1) ?? null;
}

/** Dernier commit qui modifie `path` : la révision réellement déployée d'un service. */
export function lastCommitTouching(path, cwd = '.') {
  return execFileSync('git', ['log', '-1', '--format=%H', '--', path], { cwd, encoding: 'utf8' }).trim();
}

/**
 * Compare l'état de main au dernier manifest. Une image n'est reconstruite que si le serveur a changé ;
 * sans changement du serveur ni du client, aucun manifest n'est créé.
 */
export function plan({ previous, serverRevision, clientRevision }) {
  const services = previous?.data.services;
  const buildServer = !services || services.server.sourceRevision !== serverRevision;
  const clientChanged = !services || services.client.sourceRevision !== clientRevision;
  return { buildServer, changed: buildServer || clientChanged };
}

export function buildManifest({ previous, version, sourceRevision, createdAt, serverImage, serverRevision, clientRevision }) {
  const server = serverImage
    ? { kind: 'image', sourceRevision: serverRevision, image: serverImage }
    : previous?.data.services.server;
  if (!server) {
    throw new Error("Aucune image serveur : ni nouvelle image, ni manifest précédent dont la reprendre");
  }
  if (!serverImage && server.sourceRevision !== serverRevision) {
    throw new Error(`Le serveur a changé (${serverRevision.slice(0, 7)}) : une nouvelle image est requise`);
  }
  return {
    schemaVersion: 1,
    manifestVersion: version,
    sourceRevision,
    createdAt,
    services: {
      server,
      client: { kind: 'git', sourceRevision: clientRevision },
    },
  };
}

export function toYaml(manifest) {
  return YAML.stringify(manifest, { lineWidth: 0 });
}

/** Erreurs de tout le dossier : schéma, cohérence nom/contenu, versions strictement croissantes. */
export function validateAll(dir, validate) {
  const errors = [];
  let previousVersion = 0;
  for (const manifest of readManifests(dir)) {
    const where = manifest.file;
    if (manifest.nameVersion === null) {
      errors.push(`${where} : nom attendu manifest-<version sur 4 chiffres>-<sha7>.yaml`);
      continue;
    }
    if (!validate(manifest.data)) {
      for (const e of validate.errors) errors.push(`${where} : ${e.instancePath || '/'} ${e.message}`);
      continue;
    }
    const { manifestVersion, sourceRevision } = manifest.data;
    if (manifestVersion !== manifest.nameVersion) {
      errors.push(`${where} : manifestVersion ${manifestVersion} ne correspond pas au nom du fichier`);
    }
    if (sourceRevision.slice(0, 7) !== manifest.nameRevision) {
      errors.push(`${where} : sourceRevision ${sourceRevision.slice(0, 7)} ne correspond pas au nom du fichier`);
    }
    if (manifestVersion <= previousVersion) {
      errors.push(`${where} : manifestVersion ${manifestVersion} doit être strictement supérieure à ${previousVersion}`);
    }
    previousVersion = Math.max(previousVersion, manifestVersion);
  }
  return errors;
}

/** Lit un champ pointé (« services.server.image ») d'un manifest. */
export function field(manifest, path) {
  return path.split('.').reduce((value, key) => value?.[key], manifest.data);
}
