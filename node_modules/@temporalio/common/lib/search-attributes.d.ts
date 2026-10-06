import type { temporal } from '@temporalio/proto';
/** @deprecated: Use {@link TypedSearchAttributes} instead */
export type SearchAttributeValueOrReadonly = SearchAttributeValue | Readonly<SearchAttributeValue> | undefined;
/** @deprecated: Use {@link TypedSearchAttributes} instead */
export type SearchAttributes = Record<string, SearchAttributeValueOrReadonly>;
/** @deprecated: Use {@link TypedSearchAttributes} instead */
export type SearchAttributeValue = string[] | number[] | boolean[] | Date[];
export declare const SearchAttributeType: {
    readonly TEXT: "TEXT";
    readonly KEYWORD: "KEYWORD";
    readonly INT: "INT";
    readonly DOUBLE: "DOUBLE";
    readonly BOOL: "BOOL";
    readonly DATETIME: "DATETIME";
    readonly KEYWORD_LIST: "KEYWORD_LIST";
};
export type SearchAttributeType = (typeof SearchAttributeType)[keyof typeof SearchAttributeType];
export declare const encodeSearchAttributeIndexedValueType: (input: "TEXT" | "KEYWORD" | "INT" | "DOUBLE" | "BOOL" | "DATETIME" | "KEYWORD_LIST" | temporal.api.enums.v1.IndexedValueType | "INDEXED_VALUE_TYPE_TEXT" | "INDEXED_VALUE_TYPE_KEYWORD" | "INDEXED_VALUE_TYPE_INT" | "INDEXED_VALUE_TYPE_DOUBLE" | "INDEXED_VALUE_TYPE_BOOL" | "INDEXED_VALUE_TYPE_DATETIME" | "INDEXED_VALUE_TYPE_KEYWORD_LIST" | null | undefined) => temporal.api.enums.v1.IndexedValueType | undefined, _: (input: temporal.api.enums.v1.IndexedValueType | null | undefined) => "TEXT" | "KEYWORD" | "INT" | "DOUBLE" | "BOOL" | "DATETIME" | "KEYWORD_LIST" | undefined;
interface IndexedValueTypeMapping {
    TEXT: string;
    KEYWORD: string;
    INT: number;
    DOUBLE: number;
    BOOL: boolean;
    DATETIME: Date;
    KEYWORD_LIST: string[];
}
export declare function isValidValueForType<T extends SearchAttributeType>(type: T, value: unknown): value is IndexedValueTypeMapping[T];
export interface SearchAttributeKey<T extends SearchAttributeType> {
    name: string;
    type: T;
}
export declare function defineSearchAttributeKey<T extends SearchAttributeType>(name: string, type: T): SearchAttributeKey<T>;
declare class BaseSearchAttributeValue<T extends SearchAttributeType, V = IndexedValueTypeMapping[T]> {
    private readonly _type;
    private readonly _value;
    constructor(type: T, value: V);
    get type(): T;
    get value(): V;
}
export declare class TypedSearchAttributeValue<T extends SearchAttributeType> extends BaseSearchAttributeValue<T> {
}
export declare class TypedSearchAttributeUpdateValue<T extends SearchAttributeType> extends BaseSearchAttributeValue<T, IndexedValueTypeMapping[T] | null> {
}
export type SearchAttributePair = {
    [T in SearchAttributeType]: {
        key: SearchAttributeKey<T>;
        value: IndexedValueTypeMapping[T];
    };
}[SearchAttributeType];
export type SearchAttributeUpdatePair = {
    [T in SearchAttributeType]: {
        key: SearchAttributeKey<T>;
        value: IndexedValueTypeMapping[T] | null;
    };
}[SearchAttributeType];
export declare class TypedSearchAttributes {
    private searchAttributes;
    constructor(initialAttributes?: SearchAttributePair[]);
    get<T extends SearchAttributeType>(key: SearchAttributeKey<T>): IndexedValueTypeMapping[T] | undefined;
    /** Returns a deep copy of the given TypedSearchAttributes instance */
    copy(): TypedSearchAttributes;
    /**
     * @hidden
     * Return JSON representation of this class as SearchAttributePair[]
     * Default toJSON method is not used because it's JSON representation includes private state.
     */
    toJSON(): SearchAttributePair[];
    /** Returns a copy of the current TypedSearchAttributes instance with the updated attributes. */
    updateCopy(updates: SearchAttributeUpdatePair[]): TypedSearchAttributes;
    private update;
    getAll(): SearchAttributePair[];
    static getKeyFromUntyped(key: string, value: SearchAttributeValueOrReadonly): SearchAttributeKey<SearchAttributeType> | undefined;
    static toMetadataType(type: SearchAttributeType): string;
    static toSearchAttributeType(type: string): SearchAttributeType | undefined;
}
export {};
