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

import {Component, Entity, NetworkEvent, Player, World} from 'horizon/core';

let CONSOLE_EX_ENABLED = false;

export function enableConsoleEx(enabled: boolean) {
    CONSOLE_EX_ENABLED = enabled;
}

function isServer(world: World) {
    return world.getLocalPlayer().id == world.getServerPlayer().id;
}

export class RingBuffer<T> {
    private readonly array: T[];

    // A typical array indexes from 0 to length-1.
    // Ring Buffer indexes from front to back if back > front, or front to length-1 + 0 to back otherwise.
    private front: number = 0;
    private back: number = 0;

    constructor(protected capacity: number) {
        this.array = new Array<T>(capacity);
    }

    at(index: number): T | undefined {
        if (index < -this.array.length || index >= this.array.length) {
            return undefined;
        }

        return this.array[(this.front + index) % this.array.length];
    }

    length(): number {
        if (this.isEmpty()) {
            return 0;
        } else if (this.back > this.front) {
            return this.back - this.front;
        } else { // this.back < this.front (== is handled by isEmpty())
            return (this.array.length - this.front) + this.back + 1;
        }
    }

    popBack(): T | undefined {
        if (this.isEmpty()) {
            return undefined;
        }
        const index = this.back;
        this.back = (this.back - 1 + this.array.length) % this.array.length;
        return this.array[index];
    }

    popFront(): T | undefined {
        if (this.isEmpty()) {
            return undefined;
        }
        const index = this.front;
        this.front = (this.front + 1) % this.array.length;
        return this.array[index];
    }

    forEach(callback: (value: T, index: number) => void): void {
        if (this.isEmpty()) {
            return;
        }

        if (this.back > this.front) {
            for (let i = this.front; i < this.back; ++i) {
                callback(this.array[i], i - this.front);
            }
            return;
        }

        let i = this.front;
        while (i < this.array.length) {
            callback(this.array[i], i - this.front);
            ++i;
        }
        i = 0;
        while (i <= this.back) {
            callback(this.array[i], this.array.length - this.front + i);
            ++i;
        }
    }

    isEmpty(): boolean {
        return this.front == this.back;
    }

    clear() {
        this.front = 0;
        this.back = 0;
    }

    push(item: T) {
        this.array[this.back] = item;
        this.back = (this.back + 1) % this.array.length;
        if (this.back == this.front) {
            this.front = (this.front + 1) % this.array.length;
        }
    }

    getAll(): T[] {
        if (this.isEmpty()) return [];
        if (this.back > this.front) return this.array.slice(this.front, this.back);
        return [...this.array.slice(this.front, this.array.length), ...this.array.slice(0, this.back)];
    }
}

const ALL_LOG_TYPES = [
    'log',
    'warning',
    'error',
] as const;

export type LogLevel = typeof ALL_LOG_TYPES[number];

const LOG_LEVEL_PREFIX = new Map<LogLevel, string>([
    ['warning', 'WRN - '],
    ['error', 'ERR - '],
]);

class Log {
    private readonly logs = new RingBuffer<string>(CONSOLE_EX_LOGS_MAX_COUNT);
    private currentByteSize = 0;

    static nowTimestamp() {
        const now = new Date();
        return `${this.padNumber(now.getHours())}:${this.padNumber(now.getMinutes())}:${this.padNumber(now.getSeconds())}`;
    }

    private static padNumber(num: number): string {
        return num.toString().padStart(2, '0');
    }

    constructor(private readonly maxByteSize: number) {
    }

    public formatMessage(logLevel: LogLevel, message: string) {
        const logLevelPrefix = LOG_LEVEL_PREFIX.get(logLevel);
        return `${logLevelPrefix ?? ''}${message} @${Log.nowTimestamp()}`;
    }

    public add(message: string) {
        this.resizeIfNeeded(message);
        this.logs.push(message);
        this.currentByteSize += this.getByteSizeFromString(message);
    }

    public getAll() {
        return this.logs.getAll();
    }

    public isEmpty(): boolean {
        return this.logs.isEmpty();
    }

    public clear() {
        this.logs.clear();
    }

    private resizeIfNeeded(newMessage: string) {
        const newMessageByteSize = this.getByteSizeFromString(newMessage);

        if (this.currentByteSize + newMessageByteSize <= this.maxByteSize) {
            return;
        }

        while (this.currentByteSize + newMessageByteSize > this.maxByteSize) {
            const removedMessage = this.logs.popFront();
            if (removedMessage == undefined) break;

            this.currentByteSize -= this.getByteSizeFromString(removedMessage);
            console.log(`Ouro logs reached max byte size of ${this.maxByteSize}. Removed message...\n"${removedMessage}".`);
        }
    }

    // In UTF-16, normal string characters = 2 bytes. We don't support emojis or most special characters so not accounting for those.
    private getByteSizeFromString(text: string): number {
        return text.length * 2;
    }
}

const CONSOLE_EX_LOGS_MAX_COUNT = 1000;
const CONSOLE_EX_LOGS_MAX_BYTE_SIZE = 45000; // Max Byte size for the Ouro Console UI Binding is 65280, setting this to a much lower number.
const SESSION_LOGS = new Log(CONSOLE_EX_LOGS_MAX_BYTE_SIZE);

const ENTITY_PARTIAL_NAMES_TO_LOG: string[] = [
    // 'UIEnemyPlayerNametag', // server ui
    'UILocalPlayerHUDControls', // client local ui
    // 'PlayerHUD', // server
    // 'IndicatorLine' // client local
];

const ENTITY_IDS_TO_LOG: string[] = [];

export function getComponentClassOrEntityName(entity: Entity) {
    let componentName: string | undefined;
    const components = entity.getComponents();
    if (components.length > 0) {
        componentName = `${components[0].constructor.name}`;
    }
    return (componentName && componentName.length > 0) ? componentName : entity.name.get();
}

export function logIfEntityConfigured(entity: Entity, message: string) {
    const componentClassNameOrEntityName = getComponentClassOrEntityName(entity);

    const nameMatches = ENTITY_PARTIAL_NAMES_TO_LOG.some(partialName => entity.name.get().includes(partialName) || componentClassNameOrEntityName.includes(partialName));
    const idMatches = ENTITY_IDS_TO_LOG.some(id => entity.id.toString().includes(id));
    if (!nameMatches && !idMatches) return;

    logEx(`${componentClassNameOrEntityName}[id=${entity.id}] - ${message}`);
}

export const addToSessionLogs = new NetworkEvent<{message: string, logType: LogLevel, sourcePlayer: Player}>('addToSessionLogs');

/*
 * THIS IS PURPOSELY separate from HZ_OBJ from UtilsGameplay to avoid circular dependencies
 */
let CONSOLE_HZ_OBJ: Component;

export function setConsoleHzObj(obj: Component) {
    CONSOLE_HZ_OBJ = obj;
    SESSION_LOGS.clear();
}

export function logEx(message: string, logLevel: LogLevel = 'log') {
    if (!CONSOLE_EX_ENABLED) return;

    function printMessage(message: string) {
        switch (logLevel) {
            case 'log':
                console.log(message);
                break;
            case 'warning':
                console.warn(message);
                break;
            case 'error':
                console.error(message);
                break;
        }
    }

    const formattedMessage = SESSION_LOGS.formatMessage(logLevel, message);
    SESSION_LOGS.add(formattedMessage);
    if (CONSOLE_HZ_OBJ == undefined) {
        printMessage(`<HzObj Unset> ${formattedMessage}`);
        return;
    }

    if (isServer(CONSOLE_HZ_OBJ.world)) {
        printMessage(formattedMessage);
    } else {
        CONSOLE_HZ_OBJ.sendNetworkBroadcastEvent(addToSessionLogs, {
            message: appendClient(formattedMessage),
            logType: logLevel,
            sourcePlayer: CONSOLE_HZ_OBJ.world.getLocalPlayer(),
        });
    }
}

export function flushlogExs() {
    if ((CONSOLE_HZ_OBJ.world.getLocalPlayer() == CONSOLE_HZ_OBJ.world.getServerPlayer()) || SESSION_LOGS.isEmpty()) return;

    SESSION_LOGS.getAll().forEach(log => {
        CONSOLE_HZ_OBJ!.sendNetworkBroadcastEvent(addToSessionLogs, {
            message: appendClient(log),
            logType: 'log',
            sourcePlayer: CONSOLE_HZ_OBJ!.world.getLocalPlayer(),
        });
    });

    SESSION_LOGS.clear();
}

export function getSessionLogs(nameFilter: string[] = [], idsFiltered: string[] = []) {
    if (nameFilter.length > 0) {
        return SESSION_LOGS.getAll()
            .filter((message) => {
                const logIncludesScriptOrComponentName = nameFilter.some((nameFilter) => removeLogLevelPrefix(message).match(RegExp(`^${nameFilter}`)));
                const logIncludesEntityIdIfFiltered = idsFiltered.length > 0 ? idsFiltered.some((idFilter) => message.includes(idFilter)) : true;
                return logIncludesScriptOrComponentName && logIncludesEntityIdIfFiltered;
            }).join('\n');
    }

    return SESSION_LOGS.getAll().join('\n');
}

function removeLogLevelPrefix(message: string) {
    const prefix = Array.from(LOG_LEVEL_PREFIX.values()).find((prefix) => message.startsWith(prefix));
    return prefix ? message.slice(prefix.length) : message;
}

export function appendClient(str: string) {
    const localPlayerName = CONSOLE_HZ_OBJ.world.getLocalPlayer().name.get();
    return `${str} - {${localPlayerName}}`;
}

export function getRawSessionLogs() {
    return SESSION_LOGS.getAll();
}
