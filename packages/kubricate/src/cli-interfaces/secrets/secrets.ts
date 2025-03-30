import type { CommandModule } from 'yargs';
import { secretsValidateCommand } from './validate.js';
import { secretsApplyCommand } from './apply.js';

export const secretsCommand: CommandModule = {
  command: 'secrets <command>',
  describe: 'Manage secrets with SecretManager',
  builder: yargs =>
    yargs
      .command(secretsValidateCommand)
      .command(secretsApplyCommand)
      .option('root', {
        type: 'string',
        describe: 'Root directory',
        default: process.cwd(),
      })
      .option('config', {
        type: 'string',
        describe: 'Config file path',
      })
      .demandCommand(1, 'You must specify a subcommand'),
  handler: () => {}, // handled by subcommands
};
