// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

// Original code by OURO Interactive
//------------------------------------
//
//                   @
//                   @@@@
//                    @@@@@
//             @@@      @@@@@
//           @@@@@@      @@@@@
//          @@@@@         @@@@@@
//        @@@@@              @@@@@
//         @@@@@@           @@@@@
//           @@@@@         @@@@@
//             @@@@@@   @@@@@
//               @@@@@ @@@@@
//                 @@OURO@@
//                   @@@
//
//------------------------------------

const BIGINT_SUFFIX = 'n';
const BIGINT_JSON_REGEX = RegExp(`^\d+${BIGINT_SUFFIX}$`);

// Number
declare global {
    interface NumberConstructor {
        parseFloatOrDefault(str: string | undefined, defaultValue: number): number;

        parseIntOrDefault(str: string | undefined, defaultValue: number, radix?: number): number;
    }
}
Number.parseFloatOrDefault = function (str: string | undefined, defaultValue: number) {
    if (!str) return defaultValue;
    try {
        return parseFloat(str);
    } catch (e) {
        return defaultValue;
    }
};

Number.parseIntOrDefault = function (str: string | undefined, defaultValue: number, radix) {
    if (!str) return defaultValue;
    try {
        return parseInt(str, radix);
    } catch (e) {
        return defaultValue;
    }
};

// String
export function isEmpty(s?: string) {
    return (s?.trim().length ?? 0) === 0;
}

// Date
export function getNowInPacificTimeZone() {
    return getDateInPacificTimeZone(new Date(Date.now()));
}

export function getDateInPacificTimeZone(date: Date) {
    return new Date(date.toLocaleString('en-US', {timeZone: 'America/Los_Angeles'}));
}

export function getDateInTimeZone(date: Date, locales?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions) {
    new Date(date.toLocaleString(locales, options));
}

// Collections
export function getOrDefaultMap<Key, Value>(map: Map<Key, Value>, key: Key, defaultValueFunc: () => Value): Value {
    if (!map.has(key)) {
        map.set(key, defaultValueFunc());
    }
    return map.get(key)!;
}

// Sets
export function addIfExists<T>(set: Set<T>, value: T | undefined): void {
    if (value == undefined) return;

    set.add(value);
}

export function hasAnyShared<T>(a: T[], b: T[]): boolean {
    const set = new Set(a);
    for (const value of b) {
        if (set.has(value)) {
            return true;
        }
    }
    return false;
}

// Arrays
export function pushIfExists<T>(arr: T[], value: T | undefined): void {
    if (value == undefined) return;

    arr.push(value);
}

export class FixedSizeArray<T> {
    protected elements: (T | undefined)[] = [];
    private validElements = 0;

    constructor(size: number, private allowDuplicates: boolean = false) {
        for (let i = 0; i < size; i++) {
            this.elements.push(undefined);
        }
    }

    add(element: T, index?: number): number {
        this.checkValidIndex(index);

        if (!this.allowDuplicates) {
            const existingIndex = this.elements.indexOf(element);
            if (existingIndex != -1) throw Error(`Element ${element} already exists in array`);
        }

        let indexToSet: number;
        if (index == undefined) {
            const firstUndefinedIndex = this.elements.indexOf(undefined);
            if (firstUndefinedIndex == -1) throw Error('Array is full');

            indexToSet = firstUndefinedIndex;
        } else {
            const isEmpty = this.elements[index] == undefined;
            if (!isEmpty) throw Error(`Array position ${index} is not undefined`);

            indexToSet = index;
        }

        this.validElements++;
        this.elements[indexToSet] = element;
        return indexToSet;
    }

    get(index: number) {
        this.checkValidIndex(index);

        return this.elements[index];
    }

    getDefined(): T[] {
        return this.elements.filter(e => e != undefined) as T[];
    }

    indexOf(element: T) {
        return this.elements.indexOf(element);
    }

    contains(element: T) {
        return this.indexOf(element) != -1;
    }

    /**
     * Deletes the first instance of the element from the array
     * @param element
     */
    delete(element: T) {
        const existingIndex = this.elements.indexOf(element);
        if (existingIndex != -1) {
            this.validElements--;
            this.elements[existingIndex] = undefined;
        }
        return existingIndex;
    }

    deleteAll(element: T) {
        while (true) {
            if (this.delete(element) != -1) return;
        }
    }

    length() {
        return this.elements.length;
    }

    isEmpty() {
        return this.validElements == 0;
    }

    isFull() {
        return this.validElements == this.elements.length;
    }

    filter(predicate: (value: T) => boolean) {
        return this.getDefined().filter(e => predicate(e));
    }

    forEach(fn: (value: T) => void) {
        this.getDefined().forEach(e => fn(e));
    }

    private checkValidIndex(index?: number) {
        if (index && (index < 0 || index >= this.elements.length || Math.round(index) != index)) throw Error(`Index must be a positive integer < ${this.elements.length}`);
    }
}

// Maps
declare global {
    interface Map<K, V> {
        getOrThrow(key: K): V;

        getOrThrowNullableValue(key: K): V;

        getOrDefault(key: K, defaultFunc: () => V): V;

        getOrDefaultNullableValue(key: K, defaultFunc: () => V): V;

        print(): void;
    }
}

Map.prototype.getOrThrow = function <K, V>(key: K) {
    if (this.get(key) == null) {
        const message = `Missing expected key: ${key}`;
        console.error(message)
        throw Error(message);
    }
    return this.get(key) as V;
};

Map.prototype.getOrThrowNullableValue = function <K, V>(key: K) {
    if (!this.has(key)) {
        const message = `Missing expected key: ${key}`;
        console.error(message)
        throw Error(message);
    }
    return this.get(key) as V;
};

Map.prototype.getOrDefault = function <K, V>(key: K, defaultFunc: () => V) {
    if (this.get(key) == null) this.set(key, defaultFunc());
    return this.get(key) as V;
};

Map.prototype.getOrDefaultNullableValue = function <K, V>(key: K, defaultFunc: () => V) {
    if (!this.has(key)) this.set(key, defaultFunc());
    return this.get(key) as V;
};

Map.prototype.print = function () {
    console.log(Array.from(this.entries()).map((entry: any) => (`Key: ${entry[0]}, value: ${entry[1]}`)).join('\n'));
};


// Objects
export function getOrDefaultObject<Value>(obj: any, key: any, defaultValueFunc: () => Value): Value {
    if (!obj[key]) {
        obj[key] = defaultValueFunc();
    }

    return obj[key];
}

export function isObject(item: any) {
    return (item && typeof item === 'object' && !Array.isArray(item));
}

// This iterates over all of the overrides and the final resulting value is the last one applied, which is the last of the ...overrides values
export function deepMergeInPlace(startingObject: any, ...overrides: any[]): any {
    if (!overrides.length) return startingObject;
    const overrideValue = overrides.shift();

    if (isObject(startingObject) && isObject(overrideValue)) {
        for (const key in overrideValue) {
            if (isObject(overrideValue[key])) {
                if (!startingObject[key]) Object.assign(startingObject, {[key]: {}});
                deepMergeInPlace(startingObject[key], overrideValue[key]);
            } else {
                Object.assign(startingObject, {[key]: overrideValue[key]});
            }
        }
    }
    return deepMergeInPlace(startingObject, ...overrides);
}

// JSON
export function stringifyWithBigInt(obj: any, spaces: number = 2) {
    return JSON.stringify(obj, replacerWithBigInt, spaces);
}

export function parseWithBigInt<T>(str: string): T {
    return JSON.parse(str, reviverWithBigInt);
}

function replacerWithBigInt(key: string, value: any): any {
    if (typeof value === 'bigint') {
        return value.toString() + 'n';
    }
    return value;
}

function reviverWithBigInt(key: string, value: any): any {
    if (typeof value === 'string' && BIGINT_JSON_REGEX.test(value)) {
        return BigInt(value.slice(0, -1));
    }
    return value;
}

// Strings
export function toTitleCase(str: string): string {
    return str.toLowerCase().split(' ').map(word => {
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
}

export function chunk(s: string, chunkSize: number) {
    const result: string[] = [];
    for (let i = 0; i < s.length / chunkSize; i++) {
        const chunkStart = i * chunkSize;
        result.push(s.substring(chunkStart, Math.min(chunkStart + chunkSize, s.length)));
    }
    return result;
}

// Types
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>

// Priority Queue
/**
 * Priority Queue provides quick retrieval of the highest priority item
 * @remarks O(logn) insertion and O(1) retrieval
 */
export class PriorityQueue<T> {
    private readonly heap: [number, T][] = [];

    public isEmpty(): boolean {
        return this.heap.length === 0;
    }

    /**
     * Inserts an item into the priority queue.
     * @param priority The priority of the item (higher numbers have priority)
     * @param item The item to insert.
     */
    public enqueue(priority: number, item: T): void {
        this.heap.push([priority, item]);
        this.heapifyUp(this.heap.length - 1);
    }

    /**
     * Removes and returns the item with the highest priority from the queue.
     * @returns The item with the highest priority, or undefined if the queue is empty.
     */
    public dequeue(): T {
        if (this.heap.length === 0) {
            throw new Error(`Cannot dequeue an empty queue`);
        }
        if (this.heap.length === 1) {
            return this.heap.pop()![1];
        }
        const maxItem = this.heap[0][1];
        this.heap[0] = this.heap.pop()!;
        this.heapifyDown(0);
        return maxItem;
    }

    /**
     * Returns the item with the highest priority without removing it from the queue.
     * @returns The item with the highest priority, or undefined if the queue is empty.
     */
    public peek(): T {
        if (this.heap.length === 0) {
            throw new Error(`Cannot peek an empty queue`);
        }
        return this.heap[0][1];
    }

    private heapifyUp(index: number): void {
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            if (this.heap[parentIndex][0] >= this.heap[index][0]) {
                break;
            }
            this.swap(parentIndex, index);
            index = parentIndex;
        }
    }

    private heapifyDown(index: number): void {
        while (true) {
            const leftChildIndex = 2 * index + 1;
            const rightChildIndex = 2 * index + 2;
            let largestIndex = index;
            if (
                leftChildIndex < this.heap.length &&
                this.heap[leftChildIndex][0] > this.heap[largestIndex][0]
            ) {
                largestIndex = leftChildIndex;
            }
            if (
                rightChildIndex < this.heap.length &&
                this.heap[rightChildIndex][0] > this.heap[largestIndex][0]
            ) {
                largestIndex = rightChildIndex;
            }
            if (largestIndex === index) {
                break;
            }
            this.swap(largestIndex, index);
            index = largestIndex;
        }
    }

    private swap(i: number, j: number): void {
        [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
    }
}

class PriorityQueueNode<T> {
    prev: PriorityQueueNode<T> | null = null;
    next: PriorityQueueNode<T> | null = null;

    constructor(
        public priority: number,
        public value: T
    ) {
    }
}

/**
 * A Priority Queue that allows removing items from the middle.
 * @remarks O(logn) insertion, O(1) retrieval, but has overhead that makes it less efficient than sorting an array for small numbers of entries
 */
export class PriorityQueueWithRemoval<T> {
    private head: PriorityQueueNode<T> | null = null;
    private tail: PriorityQueueNode<T> | null = null;
    private priorityMap = new Map<number, Set<PriorityQueueNode<T>>>;

    public isEmpty(): boolean {
        return this.priorityMap.size <= 0;
    }

    /**
     * Inserts an item into the priority queue.
     * @param priority The priority of the item (higher numbers have priority)
     * @param item The item to insert.
     */
    enqueue(priority: number, item: T): void {
        const node = new PriorityQueueNode(priority, item);
        if (!this.head || priority > this.tail!.priority) {
            // Insert at the end
            if (this.tail) {
                this.tail.next = node;
                node.prev = this.tail;
            }
            if (!this.head) {
                this.head = node;
            }
            this.tail = node;
        } else if (priority < this.head.priority) {
            // Insert at the beginning
            node.next = this.head;
            this.head.prev = node;
            this.head = node;
        } else {
            // Insert in the middle
            let current = this.head;
            while (current.next && current.next.priority <= priority) {
                current = current.next;
            }
            node.prev = current;
            node.next = current.next;
            if (current.next) {
                current.next.prev = node;
            } else {
                this.tail = node;
            }
            current.next = node;
        }
        if (!this.priorityMap.has(priority)) {
            this.priorityMap.set(priority, new Set());
        }
        this.priorityMap.get(priority)!.add(node);
    }

    /**
     * Removes and returns the item with the highest priority from the queue.
     * @returns The item with the highest priority, or undefined if the queue is empty.
     */
    dequeue(): T {
        if (!this.tail) {
            throw new Error(`cannot dequeue an empty queue`);
        }
        const maxNode = this.tail;
        const nodes = this.priorityMap.get(this.tail.priority)!;
        this.removeNodeAndUpdatePointers(nodes, this.tail);
        return maxNode.value;
    }

    /**
     * Returns the item with the highest priority without removing it from the queue.
     * @returns The item with the highest priority, or undefined if the queue is empty.
     */
    peek(): T {
        if (!this.tail) {
            throw new Error(`cannot peek an empty queue`);
        }
        return this.tail.value;
    }

    /**
     * Removes the first item found at the given priority which has the provided value from the queue.
     * @returns true if an item was removed, false otherwise.
     */
    remove(priority: number, value: T): boolean {
        if (!this.priorityMap.has(priority)) {
            return false;
        }
        const nodes = this.priorityMap.get(priority)!;
        let foundValue = false;
        // We need this because we can't iterate over a Set in horizon's version of typescript
        nodes.forEach(node => {
            if (!foundValue) {
                if (node.value === value) {
                    this.removeNodeAndUpdatePointers(nodes, node);
                    foundValue = true;
                }
            }
        });
        return foundValue;
    }

    /**
     * Removes the first item found at the given priority from the queue.
     * @returns true if an item was removed, false otherwise.
     */
    removeAt(priority: number): boolean {
        if (!this.priorityMap.has(priority)) {
            return false;
        }
        const nodes = this.priorityMap.get(priority)!;
        const node = nodes.values().next().value;
        this.removeNodeAndUpdatePointers(nodes, node!);
        return true;
    }

    /**
     * Removes the first item found with the given value from the queue.
     * @returns true if an item was removed, false otherwise.
     */
    removeItem(item: T): boolean {
        let current = this.head;
        while (current) {
            if (current.value === item) {
                const priority = current.priority;
                const nodes = this.priorityMap.get(priority)!;
                this.removeNodeAndUpdatePointers(nodes, current);
                return true;
            }
            current = current.next;
        }
        return false;
    }

    private removeNodeAndUpdatePointers(set: Set<PriorityQueueNode<T>>, node: PriorityQueueNode<T>) {
        // Remove the node from the map
        set.delete(node);
        if (set.size === 0) {
            this.priorityMap.delete(node.priority);
        }
        // Update the linked list pointers
        if (node.prev) {
            node.prev.next = node.next;
        } else {
            this.head = node.next;
        }
        if (node.next) {
            node.next.prev = node.prev;
        } else {
            console.log(`new tail ${node.prev?.value}`);
            this.tail = node.prev;
        }
    }
}

/**
 * An array that keeps its entries sorted by their priority. Higher priority has a lower index. Supports removing from the middle.
 * @remarks O(nlogn) insertion and O(n) retrieval. Less efficient than the PriorityQueue overall, but better for lower amounts of entries.
 */
export class PrioritySortedArray<T> {
    protected queue: {priority: number, value: T}[] = [];

    constructor(public readonly onTopValueChanged?: (value: T | undefined) => void) {
    }

    private sort() {
        this.queue.sort((a, b) => b.priority - a.priority);
    }

    enqueue(priority: number, value: T) {
        const top = this.peek();
        this.queue.push({priority, value});
        this.sort();
        if (top != this.peek()) {
            this.onTopValueChanged?.(this.peek());
        }
    }

    peek(): T | undefined {
        if (this.queue.length <= 0) {
            return undefined;
        }
        return this.queue[0].value;
    }

    dequeue(): T | undefined {
        if (this.queue.length <= 0) {
            return undefined;
        }
        const value = this.queue.shift()!.value;
        this.onTopValueChanged?.(this.peek());
        return value;
    }

    /**
     * Removes the first item of a given priority.
     * @param priority The priority of the item to remove
     */
    removeAtPriority(priority: number): boolean {
        const index = this.queue.findIndex(priorityAndValue => priorityAndValue.priority === priority);
        if (index === -1) {
            return false;
        }
        this.queue.splice(index, 1);
        if (index === 0) {
            this.onTopValueChanged?.(this.peek());
        }
        return true;
    }

    /**
     * Removes an item of a given priority.
     * @param priority The priority of the item to remove
     * @param item The item to remove
     * @param equalityComparer Optional method to use for comparing items. Defaults to strict equality '==='
     */
    remove(priority: number, item: T, equalityComparer: (a: T, b: T) => boolean = (a, b) => a === b): boolean {
        const index = this.queue.findIndex(priorityAndValue => priorityAndValue.priority === priority && equalityComparer(priorityAndValue.value, item));
        if (index === -1) {
            return false;
        }
        this.queue.splice(index, 1);
        if (index === 0) {
            this.onTopValueChanged?.(this.peek());
        }
        return true;
    }

    /**
     * Removes the highest priority instance of the given item
     * @param item The item to remove
     * @param equalityComparer Optional method to use for comparing items. Defaults to strict equality '==='
     */
    removeItem(item: T, equalityComparer: (a: T, b: T) => boolean = (a, b) => a === b): boolean {
        const index = this.queue.findIndex(priorityAndValue => equalityComparer(priorityAndValue.value, item));
        if (index === -1) {
            return false;
        }
        this.queue.splice(index, 1);
        if (index === 0) {
            this.onTopValueChanged?.(this.peek());
        }
        return true;
    }

    removeAll() {
        this.queue.length = 0;
        this.onTopValueChanged?.(this.peek());
    }

    isEmpty() {
        return this.length === 0;
    }

    get length(): number {
        return this.queue.length;
    }

    set length(length: number) {
        this.queue.splice(length);
    }

    get(index: number): {priority: number, value: T} {
        if (index >= this.queue.length) {
            throw new Error(`index out of range`);
        }
        return this.queue[index];
    }

    values() {
        return this.queue.map(e => e.value);
    }
}

/**
 * A priority sorted array that returns its default value when empty.
 */
export class PrioritySortedArrayWithDefaultValue<T> extends PrioritySortedArray<T> {
    constructor(protected defaultValue: T, onTopValueChanged?: (value: T) => void) {
        super((value: T | undefined) => onTopValueChanged?.(value ?? this.defaultValue));
    }

    getDefaultValue(): T {
        return this.defaultValue;
    }

    setDefaultValue(newValue: T) {
        if (this.defaultValue == newValue) return;
        this.defaultValue = newValue;
        if (this.queue.length <= 0) {
            this.onTopValueChanged?.(this.defaultValue);
        }
    }

    override peek(): T | undefined {
        if (this.queue.length <= 0) {
            return this.defaultValue;
        }
        return this.queue[0].value;
    }

    override dequeue(): T | undefined {
        if (this.queue.length <= 0) {
            return this.defaultValue;
        }
        const value = this.queue.shift()!.value;
        this.onTopValueChanged?.(this.peek());
        return value;
    }
}

function generateRandomBigInt(bits: number): bigint {
    const bytes = Math.ceil(bits / 8);
    let randomBigInt = BigInt(0);
    for (let i = 0; i < bytes; i++) {
        const randomByte = BigInt(Math.floor(Math.random() * 256));
        randomBigInt = (randomBigInt << BigInt(8)) | randomByte;
    }
    return randomBigInt;
}

export function generateUUIDv4(): string {
    // Generate two random 64-bit bigints
    const part1 = generateRandomBigInt(64);
    const part2 = generateRandomBigInt(64);
    // Set the version to 4 (0100) in the first part
    const versionMask = BigInt(0x0f) << BigInt(12);
    const versionValue = BigInt(0x4) << BigInt(12);
    const part1WithVersion = (part1 & ~versionMask) | versionValue;
    // Set the variant to 10xx in the second part
    const variantMask = BigInt(0x3) << BigInt(62);
    const variantValue = BigInt(0x2) << BigInt(62);
    const part2WithVariant = (part2 & ~variantMask) | variantValue;
    // Convert the parts to hexadecimal and format as a UUID
    const part1Hex = part1WithVersion.toString(16).padStart(16, '0');
    const part2Hex = part2WithVariant.toString(16).padStart(16, '0');
    return [
        part1Hex.slice(0, 8),
        part1Hex.slice(8, 12),
        part1Hex.slice(12, 16),
        part2Hex.slice(0, 4),
        part2Hex.slice(4, 16)
    ].join('-');
}
