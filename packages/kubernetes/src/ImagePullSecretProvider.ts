import type {
  BaseLogger,
  BaseProvider,
  PreparedEffect,
  ProviderInjection,
  SecretInjectionStrategy,
  SecretValue,
} from '@kubricate/core';
import { Base64 } from 'js-base64';
import { z } from 'zod';
import { createKubernetesMergeHandler } from './merge-utils.js';
import { parseZodSchema } from './utils.js';

export const dockerRegistrySecretSchema = z.object({
  username: z.string(),
  password: z.string(),
  registry: z.string(),
});

export interface ImagePullSecretProviderConfig {
  /**
   * Name of the Kubernetes Secret.
   */
  name: string;

  /**
   * Namespace for the secret.
   * @default 'default'
   */
  namespace?: string;
}

type SupportedStrategies = 'imagePullSecret';

export class ImagePullSecretProvider implements BaseProvider<
  ImagePullSecretProviderConfig,
  SupportedStrategies
> {
  name: string | undefined;
  injectes: ProviderInjection[] = [];
  logger?: BaseLogger;
  readonly targetKind = 'Deployment';
  readonly supportedStrategies: SupportedStrategies[] = ['imagePullSecret'];

  constructor(public config: ImagePullSecretProviderConfig) { }

  setInjects(injectes: ProviderInjection[]): void {
    this.injectes = injectes;
  }

  getTargetPath(strategy: SecretInjectionStrategy): string {
    if (strategy.kind === 'imagePullSecret') {
      return `spec.template.spec.imagePullSecret`;
    }
    throw new Error(`[ImagePullSecretProvider] Unsupported injection strategy: ${strategy.kind}`);
  }

  getInjectionPayload(): Array<{ name: string }> {
    return [{ name: this.config.name }];
  }

  getEffectIdentifier(effect: PreparedEffect): string {
    const meta = effect.value?.metadata ?? {};
    return `${meta.namespace ?? 'default'}/${meta.name}`;
  }

  /**
   * Merge provider-level effects into final applyable resources.
   * Used to deduplicate (e.g. K8s secret name + ns).
   */
  mergeSecrets(effects: PreparedEffect[]): PreparedEffect[] {
    const merge = createKubernetesMergeHandler();
    return merge(effects);
  }

  prepare(name: string, value: SecretValue): PreparedEffect[] {
    const parsedValue = parseZodSchema(dockerRegistrySecretSchema, value);

    const dockerConfig = {
      auths: {
        [parsedValue.registry]: {
          username: parsedValue.username,
          password: parsedValue.password,
          auth: Base64.encode(`${parsedValue.username}:${parsedValue.password}`),
        },
      },
    };

    return [
      {
        providerName: this.name,
        type: 'kubectl',
        value: {
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: {
            name: this.config.name,
            namespace: this.config.namespace ?? 'default',
          },
          type: 'kubernetes.io/dockerconfigjson',
          data: {
            '.dockerconfigjson': Base64.encode(JSON.stringify(dockerConfig)),
          },
        },
      },
    ];
  }
}
