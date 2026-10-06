import { OperationDefinition, OperationKey, OperationMap, ServiceDefinition } from "../service";
import { CompiledOperationHandlerFor, OperationHandler, SyncOperationHandler } from "./operation-handler";
/**
 * A Nexus Service implementation, that provides handlers for each of its operations.
 *
 * @experimental
 */
export declare class ServiceHandler<Ops extends OperationMap = OperationMap> {
    readonly definition: ServiceDefinition<Ops>;
    readonly handlers: ServiceHandlerFor<Ops>;
    private readonly operationsMap;
    /**
     * Build a `ServiceHandler` from a service definition and a collection of operation handlers.
     *
     * There must be an operation handler for every operation in the service definition.
     *
     * @param service The service definition
     * @param handlers The collection of handlers
     * @returns The compiled service handler
     *
     * @internal
     * @hidden
     */
    static build<Ops extends OperationMap>(service: ServiceDefinition<Ops>, handlers: ServiceHandlerFor<Ops>): ServiceHandler<Ops>;
    private constructor();
    /**
     * Returns the definition and handler for a given operation.
     *
     * @param operationName
     */
    getOperationHandler<K extends OperationKey<Ops>>(operationName: K): CompiledOperationHandlerFor<Ops>;
}
/**
 * Constructs a service handler for a given service contract.
 *
 * @experimental
 */
export declare function serviceHandler<Ops extends OperationMap>(service: ServiceDefinition<Ops>, handlers: ServiceHandlerFor<Ops>): ServiceHandler<Ops>;
/**
 * A type that defines a handler for a given operation.
 *
 * @experimental
 */
export type OperationHandlerFor<T> = T extends OperationDefinition<infer I, infer O> ? OperationHandler<I, O> | SyncOperationHandler<I, O> : never;
/**
 * A type that defines a collection of handlers for a given collection of operation interfaces.
 *
 * @experimental
 */
export type ServiceHandlerFor<T extends OperationMap = OperationMap> = {
    [K in keyof T & string]: OperationHandlerFor<T[K]>;
};
