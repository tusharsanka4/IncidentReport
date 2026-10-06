"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypedSearchAttributes = exports.TypedSearchAttributeUpdateValue = exports.TypedSearchAttributeValue = exports._ = exports.encodeSearchAttributeIndexedValueType = exports.SearchAttributeType = void 0;
exports.isValidValueForType = isValidValueForType;
exports.defineSearchAttributeKey = defineSearchAttributeKey;
const internal_workflow_1 = require("./internal-workflow");
exports.SearchAttributeType = {
    TEXT: 'TEXT',
    KEYWORD: 'KEYWORD',
    INT: 'INT',
    DOUBLE: 'DOUBLE',
    BOOL: 'BOOL',
    DATETIME: 'DATETIME',
    KEYWORD_LIST: 'KEYWORD_LIST',
};
// Note: encodeSearchAttributeIndexedValueType exported for use in tests to register search attributes
// ts-prune-ignore-next
_a = (0, internal_workflow_1.makeProtoEnumConverters)({
    [exports.SearchAttributeType.TEXT]: 1,
    [exports.SearchAttributeType.KEYWORD]: 2,
    [exports.SearchAttributeType.INT]: 3,
    [exports.SearchAttributeType.DOUBLE]: 4,
    [exports.SearchAttributeType.BOOL]: 5,
    [exports.SearchAttributeType.DATETIME]: 6,
    [exports.SearchAttributeType.KEYWORD_LIST]: 7,
    UNSPECIFIED: 0,
}, 'INDEXED_VALUE_TYPE_'), exports.encodeSearchAttributeIndexedValueType = _a[0], exports._ = _a[1];
function isValidValueForType(type, value) {
    switch (type) {
        case exports.SearchAttributeType.TEXT:
        case exports.SearchAttributeType.KEYWORD:
            return typeof value === 'string';
        case exports.SearchAttributeType.INT:
            return Number.isInteger(value);
        case exports.SearchAttributeType.DOUBLE:
            return typeof value === 'number';
        case exports.SearchAttributeType.BOOL:
            return typeof value === 'boolean';
        case exports.SearchAttributeType.DATETIME:
            return value instanceof Date;
        case exports.SearchAttributeType.KEYWORD_LIST:
            return Array.isArray(value) && value.every((item) => typeof item === 'string');
        default:
            return false;
    }
}
function defineSearchAttributeKey(name, type) {
    return { name, type };
}
class BaseSearchAttributeValue {
    _type;
    _value;
    constructor(type, value) {
        this._type = type;
        this._value = value;
    }
    get type() {
        return this._type;
    }
    get value() {
        return this._value;
    }
}
// Internal type for class private data.
// Exported for use in payload conversion.
class TypedSearchAttributeValue extends BaseSearchAttributeValue {
}
exports.TypedSearchAttributeValue = TypedSearchAttributeValue;
// ts-prune-ignore-next
class TypedSearchAttributeUpdateValue extends BaseSearchAttributeValue {
}
exports.TypedSearchAttributeUpdateValue = TypedSearchAttributeUpdateValue;
class TypedSearchAttributes {
    searchAttributes = {};
    constructor(initialAttributes) {
        if (initialAttributes === undefined)
            return;
        for (const pair of initialAttributes) {
            if (pair.key.name in this.searchAttributes) {
                throw new Error(`Duplicate search attribute key: ${pair.key.name}`);
            }
            this.searchAttributes[pair.key.name] = new TypedSearchAttributeValue(pair.key.type, pair.value);
        }
    }
    get(key) {
        const attr = this.searchAttributes[key.name];
        // Key not found or type mismatch.
        if (attr === undefined || !isValidValueForType(key.type, attr.value)) {
            return undefined;
        }
        return attr.value;
    }
    /** Returns a deep copy of the given TypedSearchAttributes instance */
    copy() {
        const state = {};
        for (const [key, attr] of Object.entries(this.searchAttributes)) {
            // Create a new instance with the same properties
            let value = attr.value;
            // For non-primitive types, create a deep copy
            if (attr.value instanceof Date) {
                value = new Date(attr.value);
            }
            else if (Array.isArray(attr.value)) {
                value = [...attr.value];
            }
            state[key] = new TypedSearchAttributeValue(attr.type, value);
        }
        // Create return value with manually assigned state.
        const res = new TypedSearchAttributes();
        res.searchAttributes = state;
        return res;
    }
    /**
     * @hidden
     * Return JSON representation of this class as SearchAttributePair[]
     * Default toJSON method is not used because it's JSON representation includes private state.
     */
    toJSON() {
        return this.getAll();
    }
    /** Returns a copy of the current TypedSearchAttributes instance with the updated attributes. */
    updateCopy(updates) {
        // Create a deep copy of the current instance.
        const res = this.copy();
        // Apply updates.
        res.update(updates);
        return res;
    }
    // Performs direct mutation on the current instance.
    update(updates) {
        // Apply updates.
        for (const pair of updates) {
            // Delete attribute.
            if (pair.value === null) {
                // Delete only if the update matches a key and type.
                const attrVal = this.searchAttributes[pair.key.name];
                if (attrVal && attrVal.type === pair.key.type) {
                    delete this.searchAttributes[pair.key.name];
                }
                continue;
            }
            // Add or update attribute.
            this.searchAttributes[pair.key.name] = new TypedSearchAttributeValue(pair.key.type, pair.value);
        }
    }
    getAll() {
        const res = [];
        for (const [key, attr] of Object.entries(this.searchAttributes)) {
            const attrKey = { name: key, type: attr.type };
            // Sanity check, should always be legal.
            if (isValidValueForType(attrKey.type, attr.value)) {
                res.push({ key: attrKey, value: attr.value });
            }
        }
        return res;
    }
    static getKeyFromUntyped(key, value) {
        if (value == null) {
            return;
        }
        // Unpack single-element arrays.
        const val = value.length === 1 ? value[0] : value;
        switch (typeof val) {
            case 'string':
                // Check if val is an ISO string, if so, return a DATETIME key.
                if (!isNaN(Date.parse(val)) && Date.parse(val) === new Date(val).getTime()) {
                    return { name: key, type: exports.SearchAttributeType.DATETIME };
                }
                return { name: key, type: exports.SearchAttributeType.TEXT };
            case 'number':
                return {
                    name: key,
                    type: Number.isInteger(val) ? exports.SearchAttributeType.INT : exports.SearchAttributeType.DOUBLE,
                };
            case 'boolean':
                return { name: key, type: exports.SearchAttributeType.BOOL };
            case 'object':
                if (val instanceof Date) {
                    return { name: key, type: exports.SearchAttributeType.DATETIME };
                }
                if (Array.isArray(val) && val.every((item) => typeof item === 'string')) {
                    return { name: key, type: exports.SearchAttributeType.KEYWORD_LIST };
                }
                return;
            default:
                return;
        }
    }
    static toMetadataType(type) {
        switch (type) {
            case exports.SearchAttributeType.TEXT:
                return 'Text';
            case exports.SearchAttributeType.KEYWORD:
                return 'Keyword';
            case exports.SearchAttributeType.INT:
                return 'Int';
            case exports.SearchAttributeType.DOUBLE:
                return 'Double';
            case exports.SearchAttributeType.BOOL:
                return 'Bool';
            case exports.SearchAttributeType.DATETIME:
                return 'Datetime';
            case exports.SearchAttributeType.KEYWORD_LIST:
                return 'KeywordList';
            default:
                throw new Error(`Unknown search attribute type: ${type}`);
        }
    }
    static toSearchAttributeType(type) {
        // The type metadata is usually in PascalCase (e.g. "KeywordList") but in
        // rare cases may be in SCREAMING_SNAKE_CASE (e.g. "INDEXED_VALUE_TYPE_KEYWORD_LIST").
        switch (type) {
            case 'Text':
            case 'INDEXED_VALUE_TYPE_TEXT':
                return exports.SearchAttributeType.TEXT;
            case 'Keyword':
            case 'INDEXED_VALUE_TYPE_KEYWORD':
                return exports.SearchAttributeType.KEYWORD;
            case 'Int':
            case 'INDEXED_VALUE_TYPE_INT':
                return exports.SearchAttributeType.INT;
            case 'Double':
            case 'INDEXED_VALUE_TYPE_DOUBLE':
                return exports.SearchAttributeType.DOUBLE;
            case 'Bool':
            case 'INDEXED_VALUE_TYPE_BOOL':
                return exports.SearchAttributeType.BOOL;
            case 'Datetime':
            case 'INDEXED_VALUE_TYPE_DATETIME':
                return exports.SearchAttributeType.DATETIME;
            case 'KeywordList':
            case 'INDEXED_VALUE_TYPE_KEYWORD_LIST':
                return exports.SearchAttributeType.KEYWORD_LIST;
            default:
                return;
        }
    }
}
exports.TypedSearchAttributes = TypedSearchAttributes;
//# sourceMappingURL=search-attributes.js.map