// Prints the manifest to deploy and its images (key=value, for $GITHUB_OUTPUT): --manifest <file>, latest if empty.
import { parseArgs } from 'node:util';

import { deployTarget } from './lib.mjs';

const { values } = parseArgs({
  options: {
    dir: { type: 'string', default: 'deploy/manifests' },
    manifest: { type: 'string', default: '' },
  },
});

try {
  const target = deployTarget(values.dir, values.manifest.trim());
  console.log(`file=${target.file}`);
  console.log(`server_image=${target.serverImage}`);
  console.log(`client_image=${target.clientImage}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
