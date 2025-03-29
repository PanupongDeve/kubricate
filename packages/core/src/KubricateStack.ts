import { KubricateController } from './KubricateController';
import { FunctionLike, InferResourceBuilderFunction } from './types';


export abstract class KubricateStack<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends FunctionLike<any[], KubricateController> = FunctionLike<any, KubricateController>,
> {
  controller!: ReturnType<T>;

  /**
   * Configure the stack with the provided data.
   * @param data The configuration data for the stack.
   * @returns The Kubricate Controller instance.
   */
  abstract configureStack(data: unknown): unknown;

  overrideStack(data: Partial<InferResourceBuilderFunction<T>>) {
    console.log('overriding stack', data);
    return this;
  }
}
