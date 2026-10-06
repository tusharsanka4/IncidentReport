"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateScope = exports.AsyncLocalStorage = void 0;
// AsyncLocalStorage is injected via vm module into global scope.
// In case Workflow code is imported in Node.js context, replace with an empty class.
exports.AsyncLocalStorage = globalThis.AsyncLocalStorage ?? class {
};
class UpdateScope {
    /**
     *  A workflow-unique identifier for this update.
     */
    id;
    /**
     *  The update type name.
     */
    name;
    constructor(options) {
        this.id = options.id;
        this.name = options.name;
    }
    /**
     * Activate the scope as current and run the update handler `fn`.
     *
     * @return the result of `fn`
     */
    run(fn) {
        return storage.run(this, fn);
    }
    /**
     * Get the current "active" update scope.
     */
    static current() {
        return storage.getStore();
    }
    /** Alias to `new UpdateScope({ id, name }).run(fn)` */
    static updateWithInfo(id, name, fn) {
        return new this({ id, name }).run(fn);
    }
}
exports.UpdateScope = UpdateScope;
const storage = new exports.AsyncLocalStorage();
//# sourceMappingURL=update-scope.js.map