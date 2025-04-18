import { merge } from 'lodash-es';
import type { AnyClass } from './types.js';
import type { Call, Objects } from 'hotscript';
import { get, set } from 'lodash-es';

export interface ResourceEntry {
  type?: AnyClass;
  config: Record<string, unknown>;
  /**
   * The kind of resource. This is used to determine how to handle the resource.
   * - `class`: A class that will be instantiated with the config.
   * - `object`: An object that will be used as is.
   * - `instance`: An instance of a class that will be used as is.
   */
  entryType: 'class' | 'object' | 'instance';
}

export const LABEL_MANAGED_BY_KEY = 'thaitype.dev/managed-by';
export const LABEL_MANAGED_BY_VALUE = 'kubricate';
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export class ResourceComposer<Entries extends Record<string, unknown> = {}> {
  _entries: Record<string, ResourceEntry> = {};
  _override: Record<string, unknown> = {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private attachLabels(config: Record<string, any>, labels: Record<string, string>) {
    if (!config.metadata?.labels) {
      config.metadata.labels = {};
    }
    config.metadata.labels = { ...config.metadata?.labels, ...labels };
    return config;
  }

  inject(resourceId: string, path: string, value: unknown) {
    const composed = this._entries[resourceId];
    if (!composed) {
      throw new Error(`Cannot inject, resource with ID ${resourceId} not found.`);
    }
    if (!(composed.entryType === 'object' || composed.entryType === 'class')) {
      throw new Error(`Cannot inject, resource with ID ${resourceId} is not an object or class.`);
    }
    const existingConfigFromPath = get(composed.config, path);
    if (!existingConfigFromPath) {
      set(composed.config, path, value);
      return;
    }
    // TODO: Merge the existing config with the new value
    throw new Error(
      `Cannot inject, resource with ID ${resourceId} already has a value at path ${path}. Existing value: ${JSON.stringify(existingConfigFromPath)}`
    );
  }

  build() {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(this._entries)) {
      const { type, entryType: kind } = this._entries[key];
      let { config } = this._entries[key];

      if (kind === 'instance') {
        result[key] = config;
        continue;
      }
      // Inject the managed-by label
      const injectedLabel: Record<string, string> = {};
      injectedLabel[LABEL_MANAGED_BY_KEY] = LABEL_MANAGED_BY_VALUE;
      config = this.attachLabels(config, injectedLabel);
      const mergedConfig = merge({}, config, this._override ? this._override[key] : {});
      if (kind === 'object') {
        result[key] = mergedConfig;
        continue;
      }
      if (!type) continue;
      // Create the resource
      result[key] = new type(mergedConfig);
    }
    return Object.values(result);
  }

  /**
   * Add a resource to the composer, extracting the type and data from the arguments.
   *
   * @deprecated This method is deprecated and will be removed in the future. Use `addClass` instead.
   */

  add<Id extends string, T extends AnyClass>(params: { id: Id; type: T; config: ConstructorParameters<T>[0] }) {
    this._entries[params.id] = {
      type: params.type,
      config: params.config,
      entryType: 'class',
    };
    return this as ResourceComposer<Entries & Record<Id, ConstructorParameters<T>[0]>>;
  }

  /**
   * Add a resource to the composer, extracting the type and data from the arguments.
   */

  addClass<const Id extends string, T extends AnyClass>(params: {
    id: Id;
    type: T;
    config: ConstructorParameters<T>[0];
  }) {
    this._entries[params.id] = {
      type: params.type,
      config: params.config,
      entryType: 'class',
    };
    return this as ResourceComposer<Entries & Record<Id, ConstructorParameters<T>[0]>>;
  }

  /**
   * Add an object to the composer directly. Using this method will support overriding the resource.
   */
  addObject<const Id extends string, T extends object = object>(params: { id: Id; config: T }) {
    this._entries[params.id] = {
      config: params.config as Record<string, unknown>,
      entryType: 'object',
    };
    return this as ResourceComposer<Entries & Record<Id, T>>;
  }

  /**
   * Add an instance to the composer directly. Using this method will not support overriding the resource.
   *
   * @deprecated This method is deprecated and will be removed in the future. Use `addObject` instead for supporting overrides.
   */

  addInstance<Id extends string, T extends object = object>(params: { id: Id; config: T }) {
    this._entries[params.id] = {
      config: params.config as Record<string, unknown>,
      entryType: 'instance',
    };
    return this as ResourceComposer<Entries & Record<Id, T>>;
  }

  public override(overrideResources: Call<Objects.PartialDeep, Entries>) {
    this._override = overrideResources;
    return this;
  }
}
