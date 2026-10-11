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

export const SCHEMA_VERSION = 2;

/** Un service doit-il être reconstruit ? Oui s'il a changé, ou si le manifest précédent ne l'avait pas en image (v1). */
function needsImage(previousService, revision) {
  return !previousService || previousService.kind !== 'image' || previousService.sourceRevision !== revision;
}

/**
 * Compare l'état de main au dernier manifest : une image n'est reconstruite que pour un service qui a changé ;
 * sans aucun changement, aucun manifest n'est créé.
 */
export function plan({ previous, serverRevision, clientRevision }) {
  const services = previous?.data.services;
  const buildServer = needsImage(services?.server, serverRevision);
  const buildClient = needsImage(services?.client, clientRevision);
  return { buildServer, buildClient, changed: buildServer || buildClient };
}

/** Service du nouveau manifest : nouvelle image si elle a été construite, sinon celle du manifest précédent. */
function service(name, { image, revision, previous }) {
  if (image) return { kind: 'image', sourceRevision: revision, image };
  const reused = previous?.data.services[name];
  if (!reused || reused.kind !== 'image') {
    throw new Error(`Aucune image ${name} : ni nouvelle image, ni image à reprendre du manifest précédent`);
  }
  if (reused.sourceRevision !== revision) {
    throw new Error(`Le ${name} a changé (${revision.slice(0, 7)}) : une nouvelle image est requise`);
  }
  return reused;
}

export function buildManifest({ previous, version, sourceRevision, createdAt, serverImage, serverRevision,
  clientImage, clientRevision }) {
  return {
    schemaVersion: SCHEMA_VERSION,
    manifestVersion: version,
    sourceRevision,
    createdAt,
    services: {
      server: service('server', { image: serverImage, revision: serverRevision, previous }),
      client: service('client', { image: clientImage, revision: clientRevision, previous }),
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
