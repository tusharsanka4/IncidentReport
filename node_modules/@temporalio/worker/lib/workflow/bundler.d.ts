import * as unionfs from 'unionfs';
import * as memfs from 'memfs';
import type { Configuration } from 'webpack';
import type { Logger } from '../logger';
export declare const defaultWorkflowInterceptorModules: string[];
export declare const allowedBuiltinModules: string[];
export declare const disallowedBuiltinModules: string[];
export declare const disallowedModules: string[];
export declare function moduleMatches(userModule: string, modules: string[]): boolean;
export interface WorkflowBundleWithSourceMap {
    /**
     * Source maps are generated inline - this is no longer used
     * @deprecated
     */
    sourceMap: string;
    code: string;
}
/**
 * Builds a V8 Isolate by bundling provided Workflows using webpack.
 *
 * @param workflowsPath all Workflows found in path will be put in the bundle
 * @param workflowInterceptorModules list of interceptor modules to register on Workflow creation
 */
export declare class WorkflowCodeBundler {
    private foundProblematicModules;
    readonly logger: Logger;
    readonly workflowsPath: string;
    readonly workflowInterceptorModules: string[];
    protected readonly payloadConverterPath?: string;
    protected readonly failureConverterPath?: string;
    protected readonly ignoreModules: string[];
    protected readonly preloadModules: string[];
    protected readonly webpackConfigHook: (config: Configuration) => Configuration;
    protected readonly plugins: BundlerPlugin[];
    constructor(options: BundleOptions);
    /**
     * @return a {@link WorkflowBundle} containing bundled code, including inlined source map
     */
    createBundle(): Promise<WorkflowBundleWithSourceMap>;
    protected makeEntrypointPath(fs: typeof unionfs.ufs, workflowsPath: string): string;
    /**
     * Creates the main entrypoint for the generated webpack library.
     *
     * Exports all detected Workflow implementations and some workflow libraries to be used by the Worker.
     */
    protected genEntrypoint(vol: typeof memfs.vol, target: string): void;
    /**
     * Run webpack
     */
    protected bundle(inputFilesystem: typeof unionfs.ufs, outputFilesystem: memfs.IFs, entry: string, distDir: string): Promise<string>;
}
/**
 * Plugin interface for bundler functionality.
 *
 * Plugins provide a way to extend and customize the behavior of Temporal bundlers.
 *
 * @experimental Plugins is an experimental feature; APIs may change without notice.
 */
export interface BundlerPlugin {
    /**
     * Gets the name of this plugin.
     *
     * Returns:
     *   The name of the plugin.
     */
    get name(): string;
    /**
     * Hook called when creating a bundler to allow modification of configuration.
     */
    configureBundler?(options: BundleOptions): BundleOptions;
}
/**
 * Options for bundling Workflow code using Webpack
 */
export interface BundleOptions {
    /**
     * Path to look up workflows in, any function exported in this path will be registered as a Workflows when the bundle is loaded by a Worker.
     */
    workflowsPath: string;
    /**
     * List of modules to import Workflow interceptors from.
     *
     * Modules should export an `interceptors` variable of type {@link WorkflowInterceptorsFactory}.
     */
    workflowInterceptorModules?: string[];
    /**
     * Optional logger for logging Webpack output
     */
    logger?: Logger;
    /**
     * Path to a module with a `payloadConverter` named export.
     * `payloadConverter` should be an instance of a class that implements {@link PayloadConverter}.
     */
    payloadConverterPath?: string;
    /**
     * Path to a module with a `failureConverter` named export.
     * `failureConverter` should be an instance of a class that implements {@link FailureConverter}.
     */
    failureConverterPath?: string;
    /**
     * List of modules to be excluded from the Workflows bundle.
     *
     * Use this option when your Workflow code references an import that cannot be used in isolation,
     * e.g. a Node.js built-in module. Modules listed here **MUST** not be used at runtime.
     *
     * > NOTE: This is an advanced option that should be used with care.
     */
    ignoreModules?: string[];
    /**
     * List of modules to load once during reusable V8 context bootstrap.
     *
     * Preloaded modules are shared across workflows that execute in the same reusable V8 context.
     * Module scope in these modules runs before a workflow activator exists, so this option is only
     * appropriate for modules that are safe to initialize that early.
     *
     * > NOTE: This is an advanced option that should be used with care. Preloading modules that
     * internally stores some form of per-workflow state will very likely cause workflow context
     * leak, which may result in non-deterministic behavior and/or cause other unexpected behaviors.
     */
    preloadModules?: string[];
    /**
     * Before Workflow code is bundled with Webpack, `webpackConfigHook` is called with the Webpack
     * {@link https://webpack.js.org/configuration/ | configuration} object so you can modify it.
     */
    webpackConfigHook?: (config: Configuration) => Configuration;
    /**
     * List of plugins to register with the bundler.
     */
    plugins?: BundlerPlugin[];
}
/**
 * Create a bundle to pass to {@link WorkerOptions.workflowBundle}. Helpful for reducing Worker startup time in
 * production.
 *
 * When using with {@link Worker.runReplayHistory}, make sure to pass the same interceptors and payload converter used
 * when the history was generated.
 */
export declare function bundleWorkflowCode(options: BundleOptions): Promise<WorkflowBundleWithSourceMap>;
