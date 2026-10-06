"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceBasedController = void 0;
exports.asNativeTuner = asNativeTuner;
const core_bridge_1 = require("@temporalio/core-bridge");
const time_1 = require("@temporalio/common/lib/time");
/**
 * Coordinates resource-based slot allocation using a shared resource sampler and PID controller.
 *
 * Share one instance across resource-based tuners to enforce a single resource target across
 * multiple Workers in the same process.
 */
class ResourceBasedController {
    nativeController;
    constructor(nativeController) {
        this.nativeController = nativeController;
    }
    /** Create a resource controller with the given target resource usage. */
    static create(options) {
        return new ResourceBasedController(core_bridge_1.native.newResourceBasedController(options));
    }
}
exports.ResourceBasedController = ResourceBasedController;
function extractNativeResourceBasedController(controller) {
    return controller.nativeController;
}
////////////////////////////////////////////////////////////////////////////////////////////////////
function asNativeTuner(tuner, logger) {
    if (isTunerHolder(tuner)) {
        const resourceBasedTunerConfig = sharedResourceBasedTunerConfig([
            tuner.workflowTaskSlotSupplier,
            tuner.activityTaskSlotSupplier,
            tuner.localActivityTaskSlotSupplier,
            tuner.nexusTaskSlotSupplier,
        ]);
        return {
            workflowTaskSlotSupplier: nativeifySupplier(tuner.workflowTaskSlotSupplier, 'workflow', logger),
            activityTaskSlotSupplier: nativeifySupplier(tuner.activityTaskSlotSupplier, 'activity', logger),
            localActivityTaskSlotSupplier: nativeifySupplier(tuner.localActivityTaskSlotSupplier, 'activity', logger),
            nexusTaskSlotSupplier: nativeifySupplier(tuner.nexusTaskSlotSupplier, 'nexus', logger),
            resourceBasedTunerConfig,
        };
    }
    else if (isResourceBasedTuner(tuner)) {
        const wftSO = addResourceBasedSlotDefaults(tuner.workflowTaskSlotOptions ?? {}, 'workflow');
        const atSO = addResourceBasedSlotDefaults(tuner.activityTaskSlotOptions ?? {}, 'activity');
        const latSO = addResourceBasedSlotDefaults(tuner.localActivityTaskSlotOptions ?? {}, 'activity');
        const nexusSO = addResourceBasedSlotDefaults(tuner.nexusTaskSlotOptions ?? {}, 'nexus');
        return {
            workflowTaskSlotSupplier: {
                type: 'resource-based',
                ...wftSO,
                rampThrottle: (0, time_1.msToNumber)(wftSO.rampThrottle),
            },
            activityTaskSlotSupplier: {
                type: 'resource-based',
                ...atSO,
                rampThrottle: (0, time_1.msToNumber)(atSO.rampThrottle),
            },
            localActivityTaskSlotSupplier: {
                type: 'resource-based',
                ...latSO,
                rampThrottle: (0, time_1.msToNumber)(latSO.rampThrottle),
            },
            nexusTaskSlotSupplier: {
                type: 'resource-based',
                ...nexusSO,
                rampThrottle: (0, time_1.msToNumber)(nexusSO.rampThrottle),
            },
            resourceBasedTunerConfig: nativeifyResourceBasedTunerConfig(tuner),
        };
    }
    else {
        throw new TypeError('Invalid worker tuner configuration');
    }
}
const isResourceBasedTuner = (tuner) => Object.hasOwnProperty.call(tuner, 'tunerOptions') || Object.hasOwnProperty.call(tuner, 'controller');
const isTunerHolder = (tuner) => Object.hasOwnProperty.call(tuner, 'workflowTaskSlotSupplier');
const isResourceBased = (supplier) => supplier.type === 'resource-based';
const isCustom = (sup) => sup.type === 'custom';
////////////////////////////////////////////////////////////////////////////////////////////////////
function nativeifySupplier(supplier, kind, logger) {
    if (isResourceBased(supplier)) {
        const defaulted = addResourceBasedSlotDefaults(supplier, kind);
        return {
            type: 'resource-based',
            minimumSlots: defaulted.minimumSlots,
            maximumSlots: defaulted.maximumSlots,
            rampThrottle: (0, time_1.msToNumber)(defaulted.rampThrottle),
        };
    }
    if (isCustom(supplier)) {
        return new NativeifiedCustomSlotSupplier(supplier, logger);
    }
    return {
        type: 'fixed-size',
        numSlots: supplier.numSlots,
    };
}
function sharedResourceBasedTunerConfig(suppliers) {
    let sharedConfig;
    for (const supplier of suppliers) {
        if (!isResourceBased(supplier))
            continue;
        const config = nativeifyResourceBasedTunerConfig(supplier);
        if (sharedConfig !== undefined && !resourceBasedTunerConfigsEqual(sharedConfig, config)) {
            throw new TypeError('Cannot construct worker tuner with multiple different resource-based tuner configurations');
        }
        sharedConfig = config;
    }
    return sharedConfig ?? null;
}
function nativeifyResourceBasedTunerConfig(config) {
    const hasController = config.controller !== undefined;
    const hasOptions = config.tunerOptions !== undefined;
    if (hasController === hasOptions) {
        throw new TypeError('Resource-based tuner must specify exactly one of controller or tunerOptions');
    }
    if (config.controller !== undefined) {
        if (!(config.controller instanceof ResourceBasedController)) {
            throw new TypeError('Resource-based tuner controller must be a ResourceBasedController');
        }
        return {
            type: 'controller',
            controller: extractNativeResourceBasedController(config.controller),
        };
    }
    return {
        type: 'options',
        targetMemoryUsage: config.tunerOptions.targetMemoryUsage,
        targetCpuUsage: config.tunerOptions.targetCpuUsage,
    };
}
function resourceBasedTunerConfigsEqual(left, right) {
    if (left.type !== right.type)
        return false;
    if (left.type === 'controller' && right.type === 'controller') {
        return left.controller === right.controller;
    }
    if (left.type === 'options' && right.type === 'options') {
        return left.targetCpuUsage === right.targetCpuUsage && left.targetMemoryUsage === right.targetMemoryUsage;
    }
    return false;
}
function addResourceBasedSlotDefaults(slotOptions, kind) {
    if (kind === 'workflow') {
        return {
            minimumSlots: slotOptions.minimumSlots ?? 2,
            maximumSlots: slotOptions.maximumSlots ?? 1000,
            rampThrottle: slotOptions.rampThrottle ?? 10,
        };
    }
    else {
        return {
            minimumSlots: slotOptions.minimumSlots ?? 1,
            maximumSlots: slotOptions.maximumSlots ?? 2000,
            rampThrottle: slotOptions.rampThrottle ?? 50,
        };
    }
}
class NativeifiedCustomSlotSupplier {
    supplier;
    logger;
    type = 'custom';
    constructor(supplier, logger) {
        this.supplier = supplier;
        this.logger = logger;
        this.reserveSlot = this.reserveSlot.bind(this);
        this.tryReserveSlot = this.tryReserveSlot.bind(this);
        this.markSlotUsed = this.markSlotUsed.bind(this);
        this.releaseSlot = this.releaseSlot.bind(this);
    }
    async reserveSlot(ctx, abortSignal) {
        if (ctx.slotType === 'nexus') {
            throw new Error('nexus not yet supported in slot suppliers');
        }
        try {
            const result = await this.supplier.reserveSlot({
                slotType: ctx.slotType,
                taskQueue: ctx.taskQueue,
                workerIdentity: ctx.workerIdentity,
                workerBuildId: ctx.workerDeploymentVersion?.buildId ?? '',
                workerDeploymentVersion: ctx.workerDeploymentVersion ?? undefined,
                isSticky: ctx.isSticky,
            }, abortSignal);
            return result;
        }
        catch (error) {
            if (abortSignal.aborted && error !== abortSignal.reason) {
                this.logger.error('Error in custom slot supplier `reserveSlot`', { error });
            }
            throw error;
        }
    }
    tryReserveSlot(ctx) {
        if (ctx.slotType === 'nexus') {
            throw new Error('nexus not yet supported in slot suppliers');
        }
        try {
            const result = this.supplier.tryReserveSlot({
                slotType: ctx.slotType,
                taskQueue: ctx.taskQueue,
                workerIdentity: ctx.workerIdentity,
                workerBuildId: ctx.workerDeploymentVersion?.buildId ?? '',
                workerDeploymentVersion: ctx.workerDeploymentVersion ?? undefined,
                isSticky: ctx.isSticky,
            });
            return result ?? null;
        }
        catch (error) {
            this.logger.error(`Error in custom slot supplier tryReserveSlot`, { error });
            return null;
        }
    }
    markSlotUsed(ctx) {
        try {
            this.supplier.markSlotUsed({
                slotInfo: ctx.slotInfo,
                permit: ctx.permit,
            });
        }
        catch (error) {
            this.logger.error(`Error in custom slot supplier markSlotUsed`, { error });
        }
    }
    releaseSlot(ctx) {
        try {
            this.supplier.releaseSlot({
                slotInfo: ctx.slotInfo ?? undefined,
                permit: ctx.permit,
            });
        }
        catch (error) {
            this.logger.error(`Error in custom slot supplier releaseSlot`, { error });
        }
    }
}
//# sourceMappingURL=worker-tuner.js.map