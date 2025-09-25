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

import { ABILITY_DATA_REGISTRY } from 'ConstsAbility';
import { EntitlementId } from 'ConstsEntitlements';
import { GameContentData, getDataSet } from 'ConstsGameContent';
import { PLAYER_CLASS_DEFINITION_SUPER_STRIKE } from 'ConstsPlayerClass';
import { ALL_REWARD_BG_CARD_DATA, ALL_REWARD_STICKER_DATA, ALL_REWARD_TITLE_DATA, REWARD_WEAPON_SKINS_DATA_REGISTRY } from 'ConstsRewards';
import { UnlockableData } from 'ConstsUnlockables';
import { WEAPON_DATA_REGISTRY } from 'ConstsWeapon';
import { DataRegistry } from 'EventData';
import { onEntitlementGrantAndSeenStateUpdated } from 'Events';
import { Component, Player } from 'horizon/core';
import { PlayerCurrenciesDao } from 'PlayerCurrenciesDao';
import { PlayerEntitlementsDao } from 'PlayerEntitlementsDao';
import { PlayerSeenStateDao } from 'PlayerSeenStateDao';
import { hasAnyShared } from 'UtilsTypescript';

export class PlayerUnlockablesService {
    constructor(
        private player: Player,
        private playerEntitlements: PlayerEntitlementsDao,
        private seenState: PlayerSeenStateDao,
        private playerCurrencies: PlayerCurrenciesDao,
        private horizonApiProvider: Component<any>,
    ) {
    }

    acquire(data?: UnlockableData) {
        if (!this.canAcquire(data)) {
            return false;
        }
        this.spendRequiredCurrencies(data);
        this.grantOwnershipEntitlements(data);
        return true;
    }

    canAcquire(data?: UnlockableData): boolean {
        return data != undefined && !this.isOwned(data) && this.hasRequiredEntitlements(data) && this.hasRequiredCurrencies(data);
    }

    isOwned(data?: UnlockableData): boolean {
        if (!data?.ownershipEntitlements) return true;

        return data.ownershipEntitlements.every(entitlement => this.playerEntitlements.hasEntitlement(entitlement));
    }

    hasRequiredEntitlements(data?: UnlockableData): boolean {
        if (data == undefined || data.requiredEntitlements == undefined) {
            return true;
        }

        for (const entitlement of data.requiredEntitlements) {
            if (!this.playerEntitlements.hasEntitlement(entitlement)) {
                return false;
            }
        }

        return true;
    }

    hasRequiredCurrencies(data?: UnlockableData): boolean {
        let hasRequiredCurrencies = true;
        data?.requiredCurrencies?.forEach((amount, id) => {
            if (!this.playerCurrencies.canAfford(id, amount)) {
                hasRequiredCurrencies = false;
            }
        });
        return hasRequiredCurrencies;
    }

    hasChoices<Id, Data extends GameContentData<Id>>(dataRegistry: DataRegistry<Id, Data>, ids: Id[], minChoices: number = 2) {
        const dataSet = getDataSet(dataRegistry, ids);
        let ownedCount = 0;
        for (let i = 0; i < dataSet.length; ++i) {
            if (this.isOwned(dataSet[i].unlockableData)) {
                ownedCount++;
                if (ownedCount >= minChoices) {
                    return true;
                }
            }
        }
        return false;
    }

    hasWeaponChoices() {
        return this.hasChoices(WEAPON_DATA_REGISTRY, PLAYER_CLASS_DEFINITION_SUPER_STRIKE.rangedWeaponIds, 3);
    }

    hasGadgetChoices() {
        return this.hasChoices(ABILITY_DATA_REGISTRY, PLAYER_CLASS_DEFINITION_SUPER_STRIKE.utilityAbilityIds, 2);
    }

    hasAbilityChoices() {
        return this.hasChoices(ABILITY_DATA_REGISTRY, PLAYER_CLASS_DEFINITION_SUPER_STRIKE.primaryAbilityIds, 2);
    }

    hasAnyLoadoutChoices() {
        return this.hasWeaponChoices() || this.hasGadgetChoices() || this.hasAbilityChoices();
    }

    getNthOwnedChoice<Id, Data extends GameContentData<Id>>(dataRegistry: DataRegistry<Id, Data>, ids: Id[], nth: number) {
        const dataSet = getDataSet(dataRegistry, ids);
        let ownedCount = 0;
        for (let i = 0; i < dataSet.length; ++i) {
            if (this.isOwned(dataSet[i].unlockableData)) {
                ownedCount++;
                if (ownedCount == nth) {
                    return dataSet[i];
                }
            }
        }
    }

    getNthWeaponChoice(nth: number) {
        return this.getNthOwnedChoice(WEAPON_DATA_REGISTRY, PLAYER_CLASS_DEFINITION_SUPER_STRIKE.rangedWeaponIds, nth);
    }

    getNthGadgetChoice(nth: number) {
        return this.getNthOwnedChoice(ABILITY_DATA_REGISTRY, PLAYER_CLASS_DEFINITION_SUPER_STRIKE.utilityAbilityIds, nth);
    }

    getNthAbilityChoice(nth: number) {
        return this.getNthOwnedChoice(ABILITY_DATA_REGISTRY, PLAYER_CLASS_DEFINITION_SUPER_STRIKE.primaryAbilityIds, nth);
    }

    // For now, ignore any errors from playerCurrencies.spend(). Harden in the future (e.g. with a rollback).
    private spendRequiredCurrencies(data?: UnlockableData) {
        if (!data?.requiredCurrencies) {
            return;
        }

        this.playerCurrencies.spend(data.requiredCurrencies);
    }

    // For now, ignore any errors from playerEntitlements.grantEntitlement(). Harden in the future (e.g. with a rollback).
    private grantOwnershipEntitlements(data?: UnlockableData) {
        if (data == undefined || data.ownershipEntitlements == undefined) {
            return;
        }

        this.playerEntitlements.grantEntitlements(data.ownershipEntitlements);
    }

    public grantEntitlementsAndUpdateSeenStates(entitlementIds: EntitlementId[], isGrantingOwnership: boolean = false) {
        this.playerEntitlements.grantEntitlements(entitlementIds);
        this.setSeenStateForAllContentUnlockedBy(entitlementIds, isGrantingOwnership);

        this.horizonApiProvider.sendLocalBroadcastEvent(onEntitlementGrantAndSeenStateUpdated, {player: this.player});
    }

    private setSeenStateForAllContentUnlockedBy(entitlementIds: EntitlementId[], isGrantingOwnership: boolean = false) {
        this.setSeenStateForUnlockableContentUnlockedby(entitlementIds, ALL_REWARD_TITLE_DATA, isGrantingOwnership);
        this.setSeenStateForUnlockableContentUnlockedby(entitlementIds, ALL_REWARD_STICKER_DATA, isGrantingOwnership);
        this.setSeenStateForUnlockableContentUnlockedby(entitlementIds, ALL_REWARD_BG_CARD_DATA, isGrantingOwnership);
        REWARD_WEAPON_SKINS_DATA_REGISTRY.dataMapping.forEach((skinsRegistry) => this.setSeenStateForUnlockableContentUnlockedby(entitlementIds, skinsRegistry.allSkins, isGrantingOwnership));
    }

    private setSeenStateForUnlockableContentUnlockedby(newlyGrantedEntitlementIds: EntitlementId[], unlockableContentDatas: {unlockableData?: UnlockableData}[], isGrantingOwnership: boolean = false) {
        unlockableContentDatas.forEach((data) => {
            if (!data.unlockableData) {
                return;
            }

            const entitlementsToConsider = isGrantingOwnership ? data.unlockableData.ownershipEntitlements : data.unlockableData.requiredEntitlements;
            if (!entitlementsToConsider || !hasAnyShared(entitlementsToConsider, newlyGrantedEntitlementIds)) {
                return;
            }

            if (this.playerEntitlements.hasAllEntitlements(entitlementsToConsider)) {
                this.seenState.setIsSeenForAll(data.unlockableData.ownershipEntitlements, false);
            }
        });
    }
}
