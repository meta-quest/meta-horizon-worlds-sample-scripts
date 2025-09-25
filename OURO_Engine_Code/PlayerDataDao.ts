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

import {
    ABILITY_SAVE_DATA_DEFAULT,
    BG_CARD_DATA_DEFAULT,
    BOOST_TRACKER_DATA_DEFAULT,
    CLASS_DATA_DEFAULT,
    GAME_PLAYER_CUSTOMIZATION_DATA_DEFAULT,
    GAME_PLAYER_DATA_DEFAULT,
    GAME_PLAYER_SETTINGS_DATA_DEFAULT,
    GAME_PLAYER_TIME_BASED_CONTENT_DATA_DEFAULT,
    GamePlayerData,
    GamePlayerSettingsData,
    LEVEL_SAVE_DATA_DEFAULT,
    LevelSaveData,
    LOGIN_REWARD_TRACKING_DATA_DEFAULT,
    PLAYTIME_REWARD_TRACKING_DATA_DEFAULT,
    STICKER_DATA_DEFAULT,
    TIMED_QUESTS_SET_DATA_DEFAULT,
    TITLE_DATA_DEFAULT,
    WEAPON_SAVE_DATA_DEFAULT,
} from 'GamePlayerData';
import {PersistentStorage, PlayerPVarDao, PVAR_PLAYER_DATA} from 'ConstsPVar';

import {Component, Handedness, Player} from 'horizon/core';
import {WeaponId} from 'ConstsIdsWeapon';
import {AbilityId} from 'ConstsIdsAbility';
import {
    onAbilityLevelDataChanged,
    onPlayerAccountLevelDataChanged,
    onPlayerBgCardChanged,
    onPlayerStickerSlot1Changed,
    onPlayerStickerSlot2Changed,
    onPlayerTitleChanged,
    onPlayerWeaponsSkinChanged,
    onWeaponLevelDataChanged,
} from 'Events';
import {GameContentData} from 'ConstsGameContent';
import {isWeaponSlot} from 'ConstsLoadout';
import {getRewardWeaponSkinData} from 'ConstsRewards';
import {sendLocalAndBroadcastEvent} from 'UtilsGameplay';

export const PLAYTIME_TICK_SECONDS = 1;

export class PlayerDataDao extends PlayerPVarDao<GamePlayerData> {

    constructor(
        player: Player,
        persistentStorage: PersistentStorage,
        horizonApiProvider: Component<any>,
    ) {
        super(PVAR_PLAYER_DATA, player, persistentStorage, horizonApiProvider);
    }

    default(): GamePlayerData {
        // We don't want to modify the original object, so we splay nested objects to copy them.
        return {
            ...GAME_PLAYER_DATA_DEFAULT,
            class: {...CLASS_DATA_DEFAULT},
            timeBasedContentData: {
                ...GAME_PLAYER_TIME_BASED_CONTENT_DATA_DEFAULT,
                firstLoginUtcMilliseconds: Date.now(),
                loginUtcMilliseconds: Date.now(),
                logoutUtcMilliseconds: Date.now(),

                played30MinutesInADay: false,

                dailyQuestsData: {
                    ...TIMED_QUESTS_SET_DATA_DEFAULT,
                    questDatas: [],
                },
                weeklyQuestsData: {
                    ...TIMED_QUESTS_SET_DATA_DEFAULT,
                    questDatas: [],
                },
                loginRewardTrackingData: {...LOGIN_REWARD_TRACKING_DATA_DEFAULT},
                playtimeRewardTrackingData: {...PLAYTIME_REWARD_TRACKING_DATA_DEFAULT},
                xpBoostTrackingData: {...BOOST_TRACKER_DATA_DEFAULT},
                goldBoostTrackingData: {...BOOST_TRACKER_DATA_DEFAULT},
            },
            customizationData: {
                ...GAME_PLAYER_CUSTOMIZATION_DATA_DEFAULT,
                title: {...TITLE_DATA_DEFAULT},
                bgCard: {...BG_CARD_DATA_DEFAULT},
                stickerSlot1: {...STICKER_DATA_DEFAULT},
                stickerSlot2: {...STICKER_DATA_DEFAULT},
            },
            accountLevelData: {...LEVEL_SAVE_DATA_DEFAULT},
            weaponSaveDataMap: {},
            abilitySaveDataMap: {},
            settingsData: {...GAME_PLAYER_SETTINGS_DATA_DEFAULT},
        };
    }

    setPrimaryWeapon(weaponId: WeaponId) {
        this.data.class.primaryWeaponId = weaponId;
    }

    setSecondaryWeapon(weaponId: WeaponId) {
        this.data.class.secondaryWeaponId = weaponId;
    }

    setPrimaryAbility(abilityId: AbilityId) {
        this.data.class.primaryAbilityId = abilityId;
    }

    setUtilityAbility(abilityId: AbilityId) {
        this.data.class.utilityAbilityId = abilityId;
    }

    setHandedness(handedness: Handedness) {
        this.data.handedness = handedness;
    }

    setTitle(titleId: string) {
        this.data.customizationData.title.id = titleId;
        sendLocalAndBroadcastEvent(this.horizonApiProvider, this.player, onPlayerTitleChanged, {player: this.player, titleId: titleId});
    }

    setBgCard(bgCardId: string) {
        this.data.customizationData.bgCard.id = bgCardId;
        this.horizonApiProvider.sendLocalBroadcastEvent(onPlayerBgCardChanged, {player: this.player, bgCardId: bgCardId});
    }

    setStickerSlot1(stickerId: string) {
        this.data.customizationData.stickerSlot1.id = stickerId;
        sendLocalAndBroadcastEvent(this.horizonApiProvider, this.player, onPlayerStickerSlot1Changed, {player: this.player, stickerId: stickerId});
    }

    setStickerSlot2(stickerId: string) {
        this.data.customizationData.stickerSlot2.id = stickerId;
        sendLocalAndBroadcastEvent(this.horizonApiProvider, this.player, onPlayerStickerSlot2Changed, {player: this.player, stickerId: stickerId});
    }

    setAccountLevelData(levelData: LevelSaveData) {
        const prevData = this.data.accountLevelData;
        this.data.accountLevelData = {...levelData};
        this.horizonApiProvider.sendLocalBroadcastEvent(onPlayerAccountLevelDataChanged, {player: this.player, prevLevelSaveData: prevData, levelSaveData: this.data.accountLevelData});
    }

    getEquipmentLevelData(data: GameContentData<any>) {
        const isWeapon = isWeaponSlot(data.loadoutSlot);
        return isWeapon ? this.getWeaponLevelData(data.id as WeaponId) : this.getAbilityLevelData(data.id as AbilityId);
    }

    setEquipmentLevelData(data: GameContentData<any>, levelSaveData: LevelSaveData) {
        const isWeapon = isWeaponSlot(data.loadoutSlot);
        if (isWeapon) {
            this.setWeaponLevelData(data.id as WeaponId, levelSaveData);
        } else {
            this.setAbilityLevelData(data.id as AbilityId, levelSaveData);
        }
    }

    getWeaponSaveData(weaponId: WeaponId) {
        let saveData = this.data.weaponSaveDataMap[weaponId];
        if (!saveData) {
            saveData = {
                ...WEAPON_SAVE_DATA_DEFAULT,
                levelData: {
                    ...WEAPON_SAVE_DATA_DEFAULT.levelData,
                },
            };
            this.data.weaponSaveDataMap[weaponId] = saveData;
        }
        return saveData;
    }

    setWeaponLevelData(weaponId: WeaponId, levelSaveData: LevelSaveData) {
        const saveData = this.getWeaponSaveData(weaponId);
        saveData.levelData = {...levelSaveData};
        this.horizonApiProvider.sendLocalBroadcastEvent(onWeaponLevelDataChanged, {player: this.player, weaponId: weaponId, levelSaveData: saveData.levelData});
    }

    getWeaponSkin(weaponId: WeaponId) {
        const saveData = this.getWeaponSaveData(weaponId);
        return getRewardWeaponSkinData(weaponId, saveData.skinId);
    }

    setWeaponSkin(weaponId: WeaponId, skinId: string) {
        const saveData = this.getWeaponSaveData(weaponId);
        saveData.skinId = skinId;
        this.horizonApiProvider.sendLocalBroadcastEvent(onPlayerWeaponsSkinChanged, {player: this.player, weaponId: weaponId, skinId: skinId});
    }

    getWeaponLevelData(weaponId: WeaponId) {
        return this.data.weaponSaveDataMap[weaponId]?.levelData ?? {...LEVEL_SAVE_DATA_DEFAULT};
    }

    getAbilitySaveData(abilityId: AbilityId) {
        let saveData = this.data.abilitySaveDataMap[abilityId];
        if (!saveData) {
            saveData = {
                ...ABILITY_SAVE_DATA_DEFAULT,
                levelData: {
                    ...ABILITY_SAVE_DATA_DEFAULT.levelData,
                },
            };
            this.data.abilitySaveDataMap[abilityId] = saveData;
        }
        return saveData;
    }

    setAbilityLevelData(abilityId: AbilityId, levelSaveData: LevelSaveData) {
        const saveData = this.getAbilitySaveData(abilityId);
        saveData.levelData = {...levelSaveData};
        this.horizonApiProvider.sendLocalBroadcastEvent(onAbilityLevelDataChanged, {player: this.player, abilityId: abilityId, levelSaveData: saveData.levelData});
    }

    getAbilityLevelData(abilityId: AbilityId) {
        return this.data.abilitySaveDataMap[abilityId]?.levelData ?? {...LEVEL_SAVE_DATA_DEFAULT};
    }

    getNuxStarted() {
        return this.data.nuxStarted;
    }

    resetNuxStarted() {
        this.data.nuxStarted = false;
    }

    setNuxStarted() {
        this.data.nuxStarted = true;
    }

    getSettingsData() {
        return this.data.settingsData;
    }

    setSettingsData(data: GamePlayerSettingsData) {
        this.data.settingsData = data;
    }
}
