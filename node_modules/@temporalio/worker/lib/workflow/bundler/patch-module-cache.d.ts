import type { Compiler } from 'webpack';
/**
 * Webpack plugin that redirects the Workflow bundle's top-level module cache to a
 * runtime-injected global (`globalThis.__webpack_module_cache__`).
 *
 * This plugin operates inside the webpack render pipeline using in two phases:
 *   1. `renderRequire` injects a stable marker into the top-level runtime's
 *      `__webpack_require__` body. That hook is only ever invoked for the bundle's own
 *      runtime, so the marker unambiguously identifies the real module cache — nested,
 *      pre-bundled runtimes carry their own already-rendered require functions and never
 *      pass through this hook.
 *   2. `renderMain` uses the marker to locate the top-level module-cache declaration
 *      (the nearest one preceding the marker), redirects it to the injected global, and
 *      strips the marker. This runs during chunk rendering — before any `processAssets`
 *      stage, hence before minification — and returns a `ReplaceSource` so source maps
 *      are preserved.
 */
export declare class InjectWorkflowModuleCacheGlobalPlugin {
    apply(compiler: Compiler): void;
    private redirectModuleCache;
}
/**
 * Asserts that the generated Workflow bundle has been correctly patched to redirect the
 * module cache to the runtime-injected global (`globalThis.__webpack_module_cache__`)
 * by `InjectWorkflowModuleCacheGlobalPlugin`.
 *
 * These sanity checks are meant to catch and fail loudly on some specific eventual regressions
 * in the webpack library or configuration that would prevent hijacking webpack's module cache,
 * and thus result in silent reoccurences of #2170 or #2188.
 */
export declare function assertWorkflowModuleCacheGlobalApplied(code: string): void;
