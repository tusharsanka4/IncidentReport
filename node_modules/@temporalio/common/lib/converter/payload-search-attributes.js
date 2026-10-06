"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typedSearchAttributePayloadConverter = exports.TypedSearchAttributePayloadConverter = exports.searchAttributePayloadConverter = exports.SearchAttributePayloadConverter = void 0;
exports.encodeUnifiedSearchAttributes = encodeUnifiedSearchAttributes;
exports.decodeSearchAttributes = decodeSearchAttributes;
exports.decodeTypedSearchAttributes = decodeTypedSearchAttributes;
const encoding_1 = require("../encoding");
const errors_1 = require("../errors");
const search_attributes_1 = require("../search-attributes");
const payload_converter_1 = require("./payload-converter");
/**
 * Converts Search Attribute values using JsonPayloadConverter
 */
class SearchAttributePayloadConverter {
    jsonConverter = new payload_converter_1.JsonPayloadConverter();
    validNonDateTypes = ['string', 'number', 'boolean'];
    toPayload(values) {
        if (!Array.isArray(values)) {
            throw new errors_1.ValueError(`SearchAttribute value must be an array`);
        }
        if (values.length > 0) {
            const firstValue = values[0];
            const firstType = typeof firstValue;
            if (firstType === 'object') {
                for (const [idx, value] of values.entries()) {
                    if (!(value instanceof Date)) {
                        throw new errors_1.ValueError(`SearchAttribute values must arrays of strings, numbers, booleans, or Dates. The value ${value} at index ${idx} is of type ${typeof value}`);
                    }
                }
            }
            else {
                if (!this.validNonDateTypes.includes(firstType)) {
                    throw new errors_1.ValueError(`SearchAttribute array values must be: string | number | boolean | Date`);
                }
                for (const [idx, value] of values.entries()) {
                    if (typeof value !== firstType) {
                        throw new errors_1.ValueError(`All SearchAttribute array values must be of the same type. The first value ${firstValue} of type ${firstType} doesn't match value ${value} of type ${typeof value} at index ${idx}`);
                    }
                }
            }
        }
        // JSON.stringify takes care of converting Dates to ISO strings
        const ret = this.jsonConverter.toPayload(values);
        if (ret === undefined) {
            throw new errors_1.ValueError('Could not convert search attributes to payloads');
        }
        return ret;
    }
    /**
     * Datetime Search Attribute values are converted to `Date`s
     */
    fromPayload(payload) {
        if (payload.metadata == null) {
            throw new errors_1.ValueError('Missing payload metadata');
        }
        const value = this.jsonConverter.fromPayload(payload);
        let arrayWrappedValue = Array.isArray(value) ? value : [value];
        const searchAttributeType = payload.metadata.type ? (0, encoding_1.decode)(payload.metadata.type) : undefined;
        if (searchAttributeType === 'Datetime') {
            arrayWrappedValue = arrayWrappedValue.map((dateString) => new Date(dateString));
        }
        return arrayWrappedValue;
    }
}
exports.SearchAttributePayloadConverter = SearchAttributePayloadConverter;
exports.searchAttributePayloadConverter = new SearchAttributePayloadConverter();
class TypedSearchAttributePayloadConverter {
    jsonConverter = new payload_converter_1.JsonPayloadConverter();
    toPayload(attr) {
        if (!(attr instanceof search_attributes_1.TypedSearchAttributeValue || attr instanceof search_attributes_1.TypedSearchAttributeUpdateValue)) {
            throw new errors_1.ValueError(`Expect input to be instance of TypedSearchAttributeValue or TypedSearchAttributeUpdateValue, got: ${JSON.stringify(attr)}`);
        }
        // We check for deletion as well as regular typed search attributes.
        if (attr.value !== null && !(0, search_attributes_1.isValidValueForType)(attr.type, attr.value)) {
            throw new errors_1.ValueError(`Invalid search attribute value ${attr.value} for given type ${attr.type}`);
        }
        // For server search attributes to work properly, we cannot set the metadata
        // type when we set null
        if (attr.value === null) {
            const payload = this.jsonConverter.toPayload(attr.value);
            if (payload === undefined) {
                throw new errors_1.ValueError('Could not convert typed search attribute to payload');
            }
            return payload;
        }
        // JSON.stringify takes care of converting Dates to ISO strings
        const payload = this.jsonConverter.toPayload(attr.value);
        if (payload === undefined) {
            throw new errors_1.ValueError('Could not convert typed search attribute to payload');
        }
        // Note: this shouldn't be the case but the compiler complains without this check.
        if (payload.metadata == null) {
            throw new errors_1.ValueError('Missing payload metadata');
        }
        // Add encoded type of search attribute to metatdata
        payload.metadata['type'] = (0, encoding_1.encode)(search_attributes_1.TypedSearchAttributes.toMetadataType(attr.type));
        return payload;
    }
    // Note: type casting undefined values is not clear to caller.
    // We can't change the typing of the method to return undefined, it's not allowed by the interface.
    fromPayload(payload) {
        if (payload.metadata == null) {
            throw new errors_1.ValueError('Missing payload metadata');
        }
        // If no 'type' metadata field or no given value, we skip.
        if (payload.metadata.type == null) {
            return undefined;
        }
        const type = search_attributes_1.TypedSearchAttributes.toSearchAttributeType((0, encoding_1.decode)(payload.metadata.type));
        // Unrecognized metadata type (sanity check).
        if (type === undefined) {
            return undefined;
        }
        let value = this.jsonConverter.fromPayload(payload);
        // Handle legacy values without KEYWORD_LIST type.
        if (type !== search_attributes_1.SearchAttributeType.KEYWORD_LIST && Array.isArray(value)) {
            // Cannot have an array with multiple values for non-KEYWORD_LIST type.
            if (value.length > 1) {
                return undefined;
            }
            // Unpack single value array.
            value = value[0];
        }
        if (type === search_attributes_1.SearchAttributeType.DATETIME && value) {
            value = new Date(value);
        }
        // Check if the value is a valid for the given type. If not, skip.
        if (!(0, search_attributes_1.isValidValueForType)(type, value)) {
            return undefined;
        }
        return new search_attributes_1.TypedSearchAttributeValue(type, value);
    }
}
exports.TypedSearchAttributePayloadConverter = TypedSearchAttributePayloadConverter;
exports.typedSearchAttributePayloadConverter = new TypedSearchAttributePayloadConverter();
// If both params are provided, conflicting keys will be overwritten by typedSearchAttributes.
function encodeUnifiedSearchAttributes(searchAttributes, typedSearchAttributes) {
    return {
        ...(searchAttributes ? (0, payload_converter_1.mapToPayloads)(exports.searchAttributePayloadConverter, searchAttributes) : {}),
        ...(typedSearchAttributes
            ? (0, payload_converter_1.mapToPayloads)(exports.typedSearchAttributePayloadConverter, Object.fromEntries((Array.isArray(typedSearchAttributes) ? typedSearchAttributes : typedSearchAttributes.getAll()).map((pair) => {
                return [pair.key.name, new search_attributes_1.TypedSearchAttributeUpdateValue(pair.key.type, pair.value)];
            })))
            : {}),
    };
}
function decodeSearchAttributes(indexedFields) {
    if (!indexedFields)
        return {};
    return Object.fromEntries(Object.entries((0, payload_converter_1.mapFromPayloads)(exports.searchAttributePayloadConverter, indexedFields)).filter(([_, v]) => v && v.length > 0) // Filter out empty arrays returned by pre 1.18 servers
    );
}
function decodeTypedSearchAttributes(indexedFields) {
    return new search_attributes_1.TypedSearchAttributes(Object.entries((0, payload_converter_1.mapFromPayloads)(exports.typedSearchAttributePayloadConverter, indexedFields) ?? {}).reduce((acc, [k, attr]) => {
        // Filter out undefined values from converter.
        if (!attr) {
            return acc;
        }
        const key = { name: k, type: attr.type };
        // Ensure is valid pair.
        if ((0, search_attributes_1.isValidValueForType)(key.type, attr.value)) {
            acc.push({ key, value: attr.value });
        }
        return acc;
    }, []));
}
//# sourceMappingURL=payload-search-attributes.js.map