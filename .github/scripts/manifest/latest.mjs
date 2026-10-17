// Affiche un champ du dernier manifest (ex. --field services.server.image), ou rien s'il n'y en a pas.
import { parseArgs } from 'node:util';

import { field, latestManifest } from './lib.mjs';

const { values } = parseArgs({
  options: {
    dir: { type: 'string', default: 'deploy/manifests' },
    field: { type: 'string' },
  },
});

const latest = latestManifest(values.dir);
if (latest) console.log(values.field ? field(latest, values.field) ?? '' : latest.path);
