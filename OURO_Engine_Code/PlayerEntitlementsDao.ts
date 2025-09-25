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

import { EntitlementId, validEntitlementId } from 'ConstsEntitlements';
import { PersistentStorage, PlayerPVarDao, PVAR_PLAYER_ENTITLEMENTS } from 'ConstsPVar';

import { DEFAULT_ENTITLEMENTS } from 'GamePlayerData';
import { Component, Player } from 'horizon/core';

type Entitlement = {
    // empty for now
}

type EntitlementMap = {
    [id: string]: Entitlement;
}

type EntitlementData = {
    version: number,
    entitlements: EntitlementMap,
}

export class PlayerEntitlementsDao extends PlayerPVarDao<EntitlementData> {
    constructor(
        player: Player,
        persistentStorage: PersistentStorage,
        horizonApiProvider: Component<any>,
    ) {
        super(PVAR_PLAYER_ENTITLEMENTS, player, persistentStorage, horizonApiProvider);
    }

    protected default(): EntitlementData {
        const entitlements: EntitlementMap = {};

        DEFAULT_ENTITLEMENTS.forEach((id) => {
            try {
                entitlements[validEntitlementId(id)] = {};
            } catch (e) {
                console.warn('Cannot set default entitlement - Invalid Entitlement ID', id);
            }
        });

        return {
            version: 0,
            entitlements: entitlements,
        };
    }

    hasEntitlement(id: EntitlementId) {
        return !!this.data.entitlements[id];
    }

    hasAllEntitlements(ids?: EntitlementId[]) {
        if (!ids || ids.length <= 0) return true;

        for (const id of ids) {
            if (!this.hasEntitlement(id)) {
                return false;
            }
        }
        return true;
    }

    grantEntitlements(ids: EntitlementId[]) {
        if (ids.length <= 0) {
            return true;
        }

        ids.forEach(id => this.data.entitlements[validEntitlementId(id)] = {});
    }

    revokeEntitlement(id: EntitlementId) {
        const entitlement = this.data.entitlements[id];

        if (entitlement == undefined) {
            return false;
        }

        delete this.data.entitlements[id];
        return true;
    }

}
