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

import { AssetPools } from 'AssetPools';
import { BaseWeapon } from 'BaseWeapon';
import * as ConstsAbility from 'ConstsAbility';
import { AbilitySlot, ABILITY_DATA_REGISTRY } from 'ConstsAbility';
import * as ConstsAttributes from 'ConstsAttributes';
import { getDataSet } from 'ConstsGameContent';
import { AbilityId } from 'ConstsIdsAbility';
import { WeaponId } from 'ConstsIdsWeapon';
import { isWeaponSlot, LoadoutSlot } from 'ConstsLoadout';
import { PLAYER_CLASS_DEFINITION_SUPER_STRIKE } from 'ConstsPlayerClass';
import * as ConstsWeapon from 'ConstsWeapon';
import { WEAPON_DATA_REGISTRY } from 'ConstsWeapon';
import * as Events from 'Events';
import { setWeaponMaterial } from 'EventsCore';
import { setWeaponLoadoutInfo } from 'EventsNetworked';
import * as GamePlayer from 'GamePlayer';
import { Entity } from 'horizon/core';
import { logEx } from 'UtilsConsoleEx';
import { toStringSafe } from 'UtilsGameplay';
import { getFirstComponentInSelfOrChildren } from 'UtilsGameplay';

const LOADOUT_ASSIGN_TIMEOUT_MILLIS = 15000;

export interface WeaponSlotHandler {
    weaponData: ConstsWeapon.WeaponData,
    weaponEntity:Entity,
    weaponAssetBundleEntity:Entity,
}

export class GamePlayerClass {
    constructor(public parent: GamePlayer.GamePlayer, private playerAssetPools: AssetPools) {
    }

    weaponSlotHandlers = new Map<LoadoutSlot, WeaponSlotHandler>();

    async restoreFromSaveData() {
        this.parent.attributes.setInitialAttributes(ConstsAttributes.PLAYER_ATTRIBUTES_DEFAULT);
        this.parent.attributes.setInitialAttributes(PLAYER_CLASS_DEFINITION_SUPER_STRIKE.initialAttributeOverrides, false);

        this.parent.attack.removeAllWeapons();

        const classRestorePromise = Promise.all([
            this.assignWeaponAndEquip(LoadoutSlot.WEAPON_PRIMARY, this.parent.persistentStorageService.playerData.data.class.primaryWeaponId),
            this.assignWeaponAndEquip(LoadoutSlot.WEAPON_SECONDARY, this.parent.persistentStorageService.playerData.data.class.secondaryWeaponId),
            this.equipAbility(AbilitySlot.PRIMARY, this.parent.persistentStorageService.playerData.data.class.primaryAbilityId),
            this.equipAbility(AbilitySlot.UTILITY, this.parent.persistentStorageService.playerData.data.class.utilityAbilityId),
        ]);

        classRestorePromise.then(() => {
            this.parent.horizonApiProvider.sendLocalBroadcastEvent(Events.onPlayerClassChange, {player: this.parent.owner, classId: PLAYER_CLASS_DEFINITION_SUPER_STRIKE.id});
        });

        return classRestorePromise;
    }

    equipLoadout<T>(id: T, equipFunc: (id: T) => void) {
        equipFunc(id);
        this.parent.horizonApiProvider.sendLocalBroadcastEvent(Events.onPlayerLoadoutChange, {player: this.parent.owner});
    }

    equipWeapon(slot: LoadoutSlot, id: WeaponId) {
        this.equipLoadout(id, (weaponId: WeaponId) => {
            switch (slot) {
                case LoadoutSlot.WEAPON_PRIMARY:
                    this.parent.persistentStorageService.playerData.setPrimaryWeapon(weaponId);
                    break;
                case LoadoutSlot.WEAPON_SECONDARY:
                    this.parent.persistentStorageService.playerData.setSecondaryWeapon(weaponId);
                    break;
            }
            this.assignWeaponAndEquip(slot, weaponId)
                .catch(error => console.error(`Error spawning weapon ${LoadoutSlot[slot]} id:${id} for ${toStringSafe(this.parent.owner)}, reason: ${error}`));
        });
    }

    async assignWeaponAndEquip(
        loadoutSlotToAssign: LoadoutSlot = LoadoutSlot.UNDEFINED,
        weaponIdToAssign?: WeaponId,
    ) {
        if (!isWeaponSlot(loadoutSlotToAssign)) {
            return;
        }

        const weaponDataToAssign = WEAPON_DATA_REGISTRY.get(weaponIdToAssign);
        if (!weaponDataToAssign?.asset) {
            throw new Error(`Missing asset for weaponId: ${weaponIdToAssign}`);
        }

        // check if the weapon is already assigned to a loadout slot
        // if the weapon is already assigned to a loadout slot, instead of cleaning up and
        // re-assigning the weapon, we ensure it's equipped in the correct slot and return
        for (const [existingLoadoutSlot, existingLoadoutHandler] of Array.from(this.weaponSlotHandlers)) {
            if (weaponDataToAssign.id == existingLoadoutHandler.weaponData.id) {
                if (loadoutSlotToAssign != existingLoadoutSlot) {
                    const existingWeaponData = this.weaponSlotHandlers.get(loadoutSlotToAssign)?.weaponData;
                    if (existingWeaponData == undefined) {
                        // if the existing loadout slot is empty, assign the weapon to the current loadout slot
                        const weaponAssetToAssign = this.playerAssetPools.getAsset(this.parent.owner, weaponDataToAssign.prespawnedAssetId);
                        this.setWeaponLoadoutInfo(weaponAssetToAssign.entity, weaponDataToAssign, loadoutSlotToAssign);
                    } else {
                        // if the existing loadout slot is not empty, swap it the loadout slots of the two weapons
                        const weaponAssetToAssign = this.playerAssetPools.getAsset(this.parent.owner, weaponDataToAssign.prespawnedAssetId);
                        const existingWeapon = this.playerAssetPools.getAsset(this.parent.owner, existingWeaponData.prespawnedAssetId);
                        this.setWeaponLoadoutInfo(weaponAssetToAssign.entity, weaponDataToAssign, loadoutSlotToAssign);
                        this.setWeaponLoadoutInfo(existingWeapon.entity, existingWeaponData, existingLoadoutSlot);
                    }
                }
                return;
            }
        }

        // if we've made it this far, the weapon is not currently assigned. so, we cleanup the existing asset and assign it to the loadout slot
        const existingLoadoutHandler = this.weaponSlotHandlers.get(loadoutSlotToAssign);
        if (existingLoadoutHandler) {
            // Don't await here - we don't to wait for the old weapon asset to be unassigned before assigning a new one
            this.playerAssetPools.cleanupAssetForPlayerOnRemove(this.parent.owner, existingLoadoutHandler.weaponData.prespawnedAssetId);
        }

        const player = this.parent.owner;
        const asset = await this.playerAssetPools.claimWithRetry(player, weaponDataToAssign.prespawnedAssetId)
        this.setWeaponLoadoutInfo(asset.entity, weaponDataToAssign, loadoutSlotToAssign);
    }

    setWeaponLoadoutInfo(entity: Entity, weaponData: ConstsWeapon.WeaponData, loadoutSlot: LoadoutSlot) {
        // find the BaseWeapon component proxy and tell it what our loadout info is
        const weaponScript = getFirstComponentInSelfOrChildren<BaseWeapon>(entity);
        if (!weaponScript) {
            throw new Error(`No weapon script found in: ${weaponData.displayName}'s asset`);
        }

        this.parent.horizonApiProvider.sendNetworkEvent(
            entity,
            setWeaponLoadoutInfo,
            {canHoldWeapons: this.parent.getCanUseLoadout(), loadoutSlot: loadoutSlot});

        const handler = {
            weaponData: weaponData,
            weaponEntity: weaponScript.entity,
            weaponAssetBundleEntity: weaponScript.props.weaponBundle!,
        };
        this.weaponSlotHandlers.set(loadoutSlot, handler);
        this.updateWeaponSkin(handler);
    }

    updateWeaponSkinsForWeapon(weaponId: WeaponId) {
        this.weaponSlotHandlers.forEach((handler) => {
            if (handler.weaponData.id == weaponId) {
                this.updateWeaponSkin(handler);
            }
        });
    }

    updateWeaponSkin(handler: WeaponSlotHandler) {
        const skinData = this.parent.persistentStorageService.playerData.getWeaponSkin(handler.weaponData.id);
        if (!skinData) {
            console.error(`skin data not found - ${handler.weaponData.id}`);
            return;
        }

        this.parent.horizonApiProvider.sendLocalBroadcastEvent(setWeaponMaterial, {
            entity: handler.weaponEntity,
            assetBundleEntity: handler.weaponAssetBundleEntity,
            skinAsset: skinData.skinAsset,
        });
    }

    async equipAbility(slot: ConstsAbility.AbilitySlot, abilityId?: AbilityId, heal: boolean = false) {
        if (!abilityId) return;
        switch (slot) {
            case AbilitySlot.PRIMARY:
                this.parent.persistentStorageService.playerData.setPrimaryAbility(abilityId);
                break;
            case AbilitySlot.UTILITY:
                this.parent.persistentStorageService.playerData.setUtilityAbility(abilityId);
                break;
        }
        await this.parent.abilities.equipAbility(slot, abilityId);
        if (heal) {
            this.parent.horizonApiProvider.async.setTimeout(() => this.parent.health.revive(undefined, false), 500);
        }
    }

    getEquippedPrimaryAbilityData() {
        return ABILITY_DATA_REGISTRY.get(this.parent.persistentStorageService.playerData.data.class.primaryAbilityId) ?? ConstsAbility.ABILITY_DATA_DEFAULT;
    }

    getEquippedUtilityAbilityData() {
        return ABILITY_DATA_REGISTRY.get(this.parent.persistentStorageService.playerData.data.class.utilityAbilityId) ?? ConstsAbility.ABILITY_DATA_DEFAULT;
    }

    getEquippedLoadout(slot: LoadoutSlot) {
        switch (slot) {
            case LoadoutSlot.WEAPON_PRIMARY:
                return WEAPON_DATA_REGISTRY.get(this.parent.persistentStorageService.playerData.data.class.primaryWeaponId);
            case LoadoutSlot.WEAPON_SECONDARY:
                return WEAPON_DATA_REGISTRY.get(this.parent.persistentStorageService.playerData.data.class.secondaryWeaponId);
            case LoadoutSlot.ABILITY_PRIMARY:
                return ABILITY_DATA_REGISTRY.get(this.parent.persistentStorageService.playerData.data.class.primaryAbilityId);
            case LoadoutSlot.ABILITY_UTILITY:
                return ABILITY_DATA_REGISTRY.get(this.parent.persistentStorageService.playerData.data.class.utilityAbilityId);
        }
    }

    getLoadoutOptions(slot: LoadoutSlot) {
        switch (slot) {
            case LoadoutSlot.WEAPON_PRIMARY: //fallthrough
            case LoadoutSlot.WEAPON_SECONDARY:
                return getDataSet(WEAPON_DATA_REGISTRY, PLAYER_CLASS_DEFINITION_SUPER_STRIKE.rangedWeaponIds);
            case LoadoutSlot.ABILITY_PRIMARY:
                return getDataSet(ABILITY_DATA_REGISTRY, PLAYER_CLASS_DEFINITION_SUPER_STRIKE.primaryAbilityIds);
            case LoadoutSlot.ABILITY_UTILITY:
                return getDataSet(ABILITY_DATA_REGISTRY, PLAYER_CLASS_DEFINITION_SUPER_STRIKE.utilityAbilityIds);
        }

        return [];
    }
}
