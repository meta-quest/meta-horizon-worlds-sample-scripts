// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

// CREATOR LEVEL: <<Intermediate>> (to modify <<Advanced>>)

import { Player } from "horizon/core"

// Set up persistent player data here (avoid the same names for unsaved data)
export type PlayerSaveData = {
    counter: number;
    hp: number;
    ammo: number;
};

// Set up non-persistent player data here (avoid the same names for saved data)
export type PlayerUnsavedData = {
    berries: number;
}

// Types for iterating over saved and unsaved data
type savedPropertyName = keyof PlayerSaveData;
type unsavedPropertyName = keyof PlayerUnsavedData;

export class PlayerData {
    static propsDefinition = {};

    static defaultSaveData: PlayerSaveData = {
        counter: 0,
        hp: 100,
        ammo: 10
    }

    static defaultUnsavedData: PlayerUnsavedData = {
        berries: 0
    }

    // What is the variable called in your game setup?
    static varName: string = "BasePlayerVariables:PlayerData";

    private player: Player;
    private savedData: PlayerSaveData;
    private unsavedData: PlayerUnsavedData;

    constructor(player: Player, savedData: PlayerSaveData | null) {
        this.player = player;

        if (savedData) {
            this.savedData = savedData;
        } else {
            this.savedData = PlayerData.defaultSaveData;
        }

        this.unsavedData = PlayerData.defaultUnsavedData;
    }

    public getLeaderboardValue(): number {
        // <TODO>
        // Change this to the value you want to use for the leaderboard
        // </TODO>
        return 0;
    }

    // Add accessors for the savedData here
    public getPlayer(): Player {
        return this.player;
    }

    // When you get data, put saved and unsaved data together
    public getData(): PlayerSaveData & PlayerUnsavedData {
        return { ...this.savedData, ...this.unsavedData };
    }

    // Flexible data setter that checks keys and splits data into saved and unsaved
    public setData(data: Object) {
        for (const [key, value] of Object.entries(data)) {
            if (key in this.savedData) {
                this.savedData[key as savedPropertyName] = value;
            } else if (key in this.unsavedData) {
                this.unsavedData[key as unsavedPropertyName] = value;
            } else {
                console.warn(`PlayerData: Attempted to set unknown property "${key}" with value "${value}".`);
            }
        }
    }

    public reset() {
        this.unsavedData = PlayerData.defaultUnsavedData;
    }

    // This will go over saved data on load and check for new fields and deprecated fields and fix them
    public static checkAndUpgradeData(savedData: PlayerSaveData): boolean {
        let somethingChanged = false;
        // Check for new fields
        for (const key of Object.keys(PlayerData.defaultSaveData)) {
            if (savedData[key as savedPropertyName] == undefined) {
                savedData[key as savedPropertyName] = PlayerData.defaultSaveData[key as savedPropertyName];
                somethingChanged = true;
            }
        }

        // Check for deprecated fields
        for (const [key, value] of Object.entries(savedData)) {
            if (PlayerData.defaultSaveData[key as savedPropertyName] == undefined) {
                delete savedData[key as savedPropertyName];
                somethingChanged = true;
            }
        }

        return somethingChanged;
    }
}
