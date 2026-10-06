"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExternalStorage = exports.StorageDriverClaim = void 0;
const errors_1 = require("../errors");
/**
 * Reference returned from {@link StorageDriver.store}. `claimData` is an
 * opaque key/value map the driver uses to retrieve the payload later.
 *
 * @experimental
 */
class StorageDriverClaim {
    claimData;
    constructor(claimData) {
        this.claimData = claimData;
    }
}
exports.StorageDriverClaim = StorageDriverClaim;
// ============================================================================
// Configuration
// ============================================================================
/** Default {@link ExternalStorage.payloadSizeThreshold}: 256 KiB. */
const DEFAULT_PAYLOAD_SIZE_THRESHOLD = 256 * 1024;
/**
 * Configuration for external storage. Holds the registered drivers, an
 * optional selector, and the size threshold above which payloads are
 * eligible for offloading to external storage. A selector function is
 * required when more than one driver is registered.
 *
 * @experimental
 */
class ExternalStorage {
    drivers;
    /**
     * Selects the destination driver for each payload, or returns `null` to keep
     * the payload inline.
     */
    driverSelector;
    payloadSizeThreshold;
    driversByName;
    constructor({ drivers, driverSelector, payloadSizeThreshold = DEFAULT_PAYLOAD_SIZE_THRESHOLD, }) {
        if (!Array.isArray(drivers) || drivers.length === 0) {
            throw new errors_1.ValueError('ExternalStorage requires at least one driver');
        }
        if (typeof payloadSizeThreshold !== 'number' ||
            !Number.isFinite(payloadSizeThreshold) ||
            payloadSizeThreshold < 0) {
            throw new errors_1.ValueError(`ExternalStorage.payloadSizeThreshold must be a non-negative finite number, got ${String(payloadSizeThreshold)}`);
        }
        const driversByName = new Map();
        for (const driver of drivers) {
            if (typeof driver?.name !== 'string' || driver.name.length === 0) {
                throw new errors_1.ValueError("Storage driver 'name' must be a non-empty string");
            }
            if (driversByName.has(driver.name)) {
                throw new errors_1.ValueError(`Duplicate storage driver name: '${driver.name}'`);
            }
            driversByName.set(driver.name, driver);
        }
        if (driverSelector === undefined && driversByName.size > 1) {
            throw new errors_1.ValueError('ExternalStorage.driverSelector is required when more than one driver is registered');
        }
        this.drivers = [...drivers];
        this.driverSelector = driverSelector ?? (() => drivers[0]);
        this.payloadSizeThreshold = payloadSizeThreshold;
        this.driversByName = driversByName;
    }
    /** Look up a registered driver by name. Returns `null` if no driver with that name is registered. */
    getDriver(name) {
        return this.driversByName.get(name) ?? null;
    }
}
exports.ExternalStorage = ExternalStorage;
//# sourceMappingURL=extstore.js.map