/**
 * (c) Meta Platforms, Inc. and affiliates. Confidential and proprietary.
 */

import {PersistentStorage, PlayerPVarDao, PVAR_PLAYER_SEEN_STATE} from 'ConstsPVar';
import * as hz from 'horizon/core';
import {Player} from 'horizon/core';
import {SeenId} from './ConstsSeenState';
import {GameContentData} from './ConstsGameContent';
import {isWeaponSlot} from './ConstsLoadout';
import {REWARD_WEAPON_SKINS_DATA_REGISTRY} from './ConstsRewards';

type SeenState = {
    // empty for now
}

type SeenStateMap = {
    [id: string]: SeenState;
}

type SeenStateData = {
    version: number,
    unseen: SeenStateMap,
}

export class PlayerSeenStateDao extends PlayerPVarDao<SeenStateData> {
    constructor(
        player: Player,
        persistentStorage: PersistentStorage,
        horizonApiProvider: hz.Component<any>,
    ) {
        super(PVAR_PLAYER_SEEN_STATE, player, persistentStorage, horizonApiProvider);


    }

    protected default(): SeenStateData {
        return {
            version: 0,
            unseen: {},
        };
    }

    isAnySeen(ids?: SeenId[]) {
        if (!ids || ids.length <= 0) return true;

        for (const id of ids) {
            if (this.isSeen(id)) {
                return true;
            }
        }
        return false;
    }

    isSeen(id: SeenId): boolean {
        return this.data.unseen[id] == undefined;
    }

    setIsSeen(id: SeenId, isSeen: boolean) {
        const unseen = this.data.unseen[id];

        if (isSeen) {
            if (unseen == undefined) return false;
            delete this.data.unseen[id];
        } else {
            if (unseen != undefined) return false;
            this.data.unseen[id] = {};
        }
        return true;
    }

    setIsSeenForAll(id?: readonly SeenId[], isSeen: boolean = false) {
        id?.forEach(id => {
            this.setIsSeen(id, isSeen);
        });
    }

    hasUnseenWeaponSkin(data: GameContentData<any>) {
        if (!isWeaponSlot(data.loadoutSlot)) {
            return false;
        }

        const skinRegistry = REWARD_WEAPON_SKINS_DATA_REGISTRY.get(data.id);
        if (!skinRegistry) {
            return false;
        }

        for (const data of skinRegistry.allSkins) {
            if (!this.isAnySeen(data.unlockableData?.ownershipEntitlements)) {
                return true;
            }
        }
        return false;
    }
}
