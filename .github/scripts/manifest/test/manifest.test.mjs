import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildManifest, fileName, loadValidator, plan, toYaml, validateAll } from '../lib.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPTS = dirname(HERE);
const SCHEMA = join(SCRIPTS, '..', '..', '..', 'deploy', 'manifests', 'schema.json');
const SHA = (c) => c.repeat(40);
const IMAGE = `ghcr.io/tres7/afristay-server@sha256:${'0'.repeat(64)}`;

function manifest(version, overrides = {}) {
  return {
    schemaVersion: 1,
    manifestVersion: version,
    sourceRevision: SHA('a'),
    createdAt: '2026-10-11T08:00:00Z',
    services: {
      server: { kind: 'image', sourceRevision: SHA('b'), image: IMAGE },
      client: { kind: 'git', sourceRevision: SHA('c') },
    },
    ...overrides,
  };
}

function manifestsDir(...manifests) {
  const dir = mkdtempSync(join(tmpdir(), 'manifests-'));
  copyFileSync(SCHEMA, join(dir, 'schema.json'));
  for (const [name, content] of manifests) writeFileSync(join(dir, name), toYaml(content));
  return dir;
}

const validate = loadValidator(SCHEMA);

describe('fileName', () => {
  test('pads the version and keeps 7 characters of the revision', () => {
    assert.equal(fileName(42, SHA('a')), 'manifest-0042-aaaaaaa.yaml');
  });
});

describe('plan', () => {
  const previous = { data: manifest(1) };

  test('first manifest builds the server image', () => {
    assert.deepEqual(plan({ previous: null, serverRevision: SHA('b'), clientRevision: SHA('c') }),
      { buildServer: true, changed: true });
  });

  test('nothing changed: no manifest', () => {
    assert.deepEqual(plan({ previous, serverRevision: SHA('b'), clientRevision: SHA('c') }),
      { buildServer: false, changed: false });
  });

  test('client only: new manifest without rebuilding the image', () => {
    assert.deepEqual(plan({ previous, serverRevision: SHA('b'), clientRevision: SHA('d') }),
      { buildServer: false, changed: true });
  });

  test('server changed: rebuild', () => {
    assert.deepEqual(plan({ previous, serverRevision: SHA('e'), clientRevision: SHA('c') }),
      { buildServer: true, changed: true });
  });
});

describe('buildManifest', () => {
  const base = { version: 2, sourceRevision: SHA('f'), createdAt: '2026-10-11T09:00:00Z', clientRevision: SHA('d') };

  test('reuses the previous server image when the server did not change', () => {
    const built = buildManifest({ ...base, previous: { data: manifest(1) }, serverImage: '', serverRevision: SHA('b') });
    assert.deepEqual(built.services.server, manifest(1).services.server);
    assert.equal(built.services.client.sourceRevision, SHA('d'));
    assert.ok(validate(built));
  });

  test('refuses to reuse an image when the server changed', () => {
    assert.throws(() => buildManifest({ ...base, previous: { data: manifest(1) }, serverImage: '', serverRevision: SHA('e') }),
      /nouvelle image est requise/);
  });

  test('refuses a first manifest without an image', () => {
    assert.throws(() => buildManifest({ ...base, previous: null, serverImage: '', serverRevision: SHA('b') }),
      /Aucune image serveur/);
  });
});

describe('validateAll', () => {
  test('accepts a consistent sequence', () => {
    const dir = manifestsDir(['manifest-0001-aaaaaaa.yaml', manifest(1)], ['manifest-0002-aaaaaaa.yaml', manifest(2)]);
    assert.deepEqual(validateAll(dir, validate), []);
  });

  test('rejects a version that does not match the file name', () => {
    const dir = manifestsDir(['manifest-0003-aaaaaaa.yaml', manifest(2)]);
    assert.match(validateAll(dir, validate).join(), /ne correspond pas au nom du fichier/);
  });

  test('rejects a revision that does not match the file name', () => {
    const dir = manifestsDir(['manifest-0001-bbbbbbb.yaml', manifest(1)]);
    assert.match(validateAll(dir, validate).join(), /sourceRevision aaaaaaa/);
  });

  test('rejects versions that do not strictly increase', () => {
    const dir = manifestsDir(['manifest-0002-aaaaaaa.yaml', manifest(2)], ['manifest-0002-bbbbbbb.yaml',
      manifest(2, { sourceRevision: SHA('b') })]);
    assert.match(validateAll(dir, validate).join(), /strictement supérieure/);
  });

  test('rejects an image outside the project registry or not pinned by digest', () => {
    for (const image of ['docker.io/library/nginx@sha256:' + '0'.repeat(64), 'ghcr.io/tres7/afristay-server:main']) {
      const bad = manifest(1);
      bad.services.server.image = image;
      const dir = manifestsDir(['manifest-0001-aaaaaaa.yaml', bad]);
      assert.match(validateAll(dir, validate).join(), /must match pattern/);
    }
  });

  test('rejects an invalid date and a bad file name', () => {
    const dir = manifestsDir(['manifest-0001-aaaaaaa.yaml', manifest(1, { createdAt: 'hier' })], ['manifest-1.yaml', manifest(1)]);
    const errors = validateAll(dir, validate).join('\n');
    assert.match(errors, /must match format "date-time"/);
    assert.match(errors, /nom attendu/);
  });
});

describe('command line, on a real git history', () => {
  function git(cwd, ...args) {
    return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  }

  function commit(repo, path, message) {
    mkdirSync(join(repo, dirname(path)), { recursive: true });
    writeFileSync(join(repo, path), message);
    git(repo, 'add', '-A');
    git(repo, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', message);
    return git(repo, 'rev-parse', 'HEAD');
  }

  function run(repo, script, ...args) {
    const out = execFileSync('node', [join(SCRIPTS, script), '--dir', 'deploy/manifests', ...args], { cwd: repo, encoding: 'utf8' });
    return Object.fromEntries(out.trim().split('\n').filter((l) => l.includes('=')).map((l) => l.split(/=(.*)/s).slice(0, 2)));
  }

  test('first manifest, then a client-only change reuses the server image', () => {
    const repo = mkdtempSync(join(tmpdir(), 'repo-'));
    git(repo, 'init', '-q');
    mkdirSync(join(repo, 'deploy', 'manifests'), { recursive: true });
    copyFileSync(SCHEMA, join(repo, 'deploy', 'manifests', 'schema.json'));
    const serverRev = commit(repo, 'server/app.py', 'serveur');
    let head = commit(repo, 'client/page.tsx', 'client v1');

    let planned = run(repo, 'plan.mjs');
    assert.equal(planned.build_server, 'true');
    let created = run(repo, 'create.mjs', '--source-revision', head, '--server-revision', planned.server_revision,
      '--client-revision', planned.client_revision, '--server-image', IMAGE);
    assert.equal(created.version, '1');
    assert.equal(planned.server_revision, serverRev);
    git(repo, 'add', '-A');
    git(repo, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'manifest 1');

    head = commit(repo, 'client/page.tsx', 'client v2');
    planned = run(repo, 'plan.mjs');
    assert.deepEqual([planned.changed, planned.build_server, planned.previous_version], ['true', 'false', '1']);
    created = run(repo, 'create.mjs', '--source-revision', head, '--server-revision', planned.server_revision,
      '--client-revision', planned.client_revision);
    assert.equal(created.file, `deploy/manifests/manifest-0002-${head.slice(0, 7)}.yaml`);

    const latestImage = execFileSync('node', [join(SCRIPTS, 'latest.mjs'), '--field', 'services.server.image'],
      { cwd: repo, encoding: 'utf8' }).trim();
    assert.equal(latestImage, IMAGE);
    assert.match(execFileSync('node', [join(SCRIPTS, 'validate.mjs')], { cwd: repo, encoding: 'utf8' }), /2 manifest/);
  });
});
