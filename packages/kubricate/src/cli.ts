import c from 'ansis';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateCommand } from './commands/generate.js';

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { logger } from './bootstrap.js';

const pkg = {
  version: '0.0.0',
};
try {
  pkg.version = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8')).version;
} catch {
  logger.warn('Could not read version from package.json');
}

yargs(hideBin(process.argv))
  .scriptName(c.blue(c.bold('kubricate')))
  .usage('$0 <command>')
  .version(pkg.version)
  .epilog(c.red('Kubricate CLI - A CLI for managing Kubernetes stacks'))
  .command(generateCommand)
  .help()
  .alias('h', 'help')
  .alias('v', 'version')
  .demandCommand(1, '') // do not show "command required" error
  .fail((msg, err, yargs) => {
    if (!msg && !err) {
      yargs.showHelp(); // when no command is given
    } else {
      console.error(msg);
      process.exit(1);
    }
  })
  .strict()
  .parse();
