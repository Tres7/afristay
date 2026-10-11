// Que faut-il produire pour l'état actuel de main ? Sortie au format GITHUB_OUTPUT (clé=valeur).
import { parseArgs } from 'node:util';

import { lastCommitTouching, latestManifest, plan } from './lib.mjs';

const { values } = parseArgs({ options: { dir: { type: 'string', default: 'deploy/manifests' } } });

const previous = latestManifest(values.dir);
const serverRevision = lastCommitTouching('server');
const clientRevision = lastCommitTouching('client');
const { buildServer, changed } = plan({ previous, serverRevision, clientRevision });

console.log(`changed=${changed}`);
console.log(`build_server=${buildServer}`);
console.log(`server_revision=${serverRevision}`);
console.log(`client_revision=${clientRevision}`);
console.log(`previous_version=${previous?.data.manifestVersion ?? 0}`);
