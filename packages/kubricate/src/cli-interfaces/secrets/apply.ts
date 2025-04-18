import type { CommandModule } from 'yargs';
import { SecretsCommand, type SecretsCommandOptions } from '../../commands/secrets.js';
import { ExecaExecutor } from '../../executor/execa-executor.js';
import { KubectlExecutor } from '../../executor/kubectl-executor.js';
import type { GlobalConfigOptions } from '../../internal/types.js';
import { ConsoleLogger } from '../../internal/logger.js';
import { handlerError } from '../../internal/error.js';
import { verboseCliConfig } from '../../internal/utils.js';

export const secretsApplyCommand: CommandModule<GlobalConfigOptions, SecretsCommandOptions> = {
  command: 'apply',
  describe: 'Apply secrets to the target provider (e.g., kubectl)',
  handler: async argv => {
    const logger = argv.logger ?? new ConsoleLogger();
    try {
      verboseCliConfig(argv, logger, 'secrets apply');
      const executor = new KubectlExecutor('kubectl', logger, new ExecaExecutor());
      await new SecretsCommand(argv, logger, executor).apply();
    } catch (error) {
      handlerError(error, logger);
    }
  },
};
