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


import { GameModeId } from 'ConstsIdsGameMode';
import { onSetPlayerVariable, setPlayerVariable } from 'EventsCore';
import { Component, IPersistentStorage, PersistentSerializableState, Player, World } from 'horizon/core';
import { deepMergeInPlace, isObject, stringifyWithBigInt } from 'UtilsTypescript';

const VARIABLE_GROUP_SUPER_PLAYER = 'SuperPlayer';
const VARIABLE_GROUP_SUPER_PLAYER_XFN = 'SuperPlayerXFN';

function getGroupedPVar(group: string, variable: string) {
    return `${group}:${variable}`;
}

export const PVAR_PLAYER_DATA = getGroupedPVar(VARIABLE_GROUP_SUPER_PLAYER, 'PlayerData');
export const PVAR_PLAYER_ENTITLEMENTS = getGroupedPVar(VARIABLE_GROUP_SUPER_PLAYER, 'PlayerEntitlements');
export const PVAR_PLAYER_CURRENCIES = getGroupedPVar(VARIABLE_GROUP_SUPER_PLAYER, 'PlayerCurrencies');
export const PVAR_PLAYER_SEEN_STATE = getGroupedPVar(VARIABLE_GROUP_SUPER_PLAYER, 'PlayerSeenState');

const PVAR_PLAYER_STATS_PREFIX = getGroupedPVar(VARIABLE_GROUP_SUPER_PLAYER, 'PlayerStats');

export function getPlayerStatsPVarKey(gameMode: GameModeId) {
    return `${PVAR_PLAYER_STATS_PREFIX}${gameMode}`;
}

export class PersistentStorage {
    private ps: IPersistentStorage;

    constructor(world: World) {
        this.ps = world.persistentStorage;
    }

    getPlayerVariable<T extends PersistentSerializableState = number>(player: Player, key: string): T extends number ? T : T | null {
        return this.ps.getPlayerVariable<T>(player, key);
    }

    setPlayerVariable<T extends PersistentSerializableState>(player: Player, key: string, value: T): void {
        return this.ps.setPlayerVariable<T>(player, key, value);
    }

}

export abstract class PlayerPVarDao<T extends PersistentSerializableState> {
    private _data?: T;
    private _dataSerialized?: string;

    public get data(): T {
        if (this._data == undefined) {
            this.load();
        }
        return this._data!;
    }

    protected set data(data: T) {
        this._data = data;
    }

    protected constructor(
        protected pVarKey: string,
        protected player: Player,
        protected persistentStorage: PersistentStorage,
        protected horizonApiProvider: Component<any>,
        private useCompression: boolean = true,
    ) {
        this.load();
        this.horizonApiProvider.connectLocalEvent(this.player, onSetPlayerVariable, (event) => {
            if (this.pVarKey != event.pVarKey) return;

            this._dataSerialized = stringifyWithBigInt(event.data);
        });
    }

    protected abstract default(): T;

    reset() {
        this.data = this.default();
        this.save();
    }

    toString(): string {
        return `${this.constructor.name}: ${JSON.stringify(this.data)}`;
    }

    private load() {
        try {
            let state: T | null | undefined;
            state = this.persistentStorage.getPlayerVariable<T>(this.player, this.pVarKey);

            const defaultValue = this.default();
            if (Array.isArray(defaultValue)) {
                throw new Error('PlayerPVarDao does not currently support Array values. You must decide how to handle merging the default value.');
            }
            if (isObject(defaultValue)) {
                this.data = deepMergeInPlace(defaultValue, state);
            } else {
                this.data = state ?? defaultValue;
            }
            this._dataSerialized = stringifyWithBigInt(this.data);
        } catch (e) {
            console.error(`[${this.player.name.get()}]PVar[${this.pVarKey}] Failed to load. Defaulting...: ${e}`);
            this.reset();
        }
    }

    public save() {
        if (this._data == undefined || stringifyWithBigInt(this._data) == this._dataSerialized) {
            return;
        }

        // @ts-ignore
        const defaultKeys = Object.keys(this.default());
        Object.keys(this._data).forEach(key => {
            if (!defaultKeys.includes(key)) {
                // @ts-ignore
                delete this._data.value;
            }
        });

        this.horizonApiProvider.sendLocalBroadcastEvent(setPlayerVariable, {
            player: this.player,
            pVarKey: this.pVarKey,
            data: this._data,
            useCompression: this.useCompression
        });
    }
}

/**
 * Leaderboards track a PVar numeric value.
 */
export class ResettingLeaderboardDao extends PlayerPVarDao<number> {
    constructor(
        pVarKey: string,
        player: Player,
        persistentStorage: PersistentStorage,
        horizonApiProvider: Component<any>,
        private defaultValue: number = 0
    ) {
        super(pVarKey, player, persistentStorage, horizonApiProvider, false);
    }

    updateValue(value: number) {
        this.data = value;
    }

    protected default() {
        return this.defaultValue;
    }
}
