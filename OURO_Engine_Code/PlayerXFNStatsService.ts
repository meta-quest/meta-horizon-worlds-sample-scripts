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

import { PersistentStorage, PlayerPVarDao } from 'ConstsPVar';
import { Component, Player } from 'horizon/core';
import { PlayerStatsService } from 'PlayerStatsService';

let PVAR_SAMPLE_NAME = 'sample';

class PlayerXFNStatPVarDao extends PlayerPVarDao<number> {
    constructor(
        pVarKey: string,
        player: Player,
        persistentStorage: PersistentStorage,
        horizonApiProvider: Component<any>,
    ) {
        super(pVarKey, player, persistentStorage, horizonApiProvider, false);
    }

    protected default(): number {
        return 0;
    }

    public setValue(value?: number) {
        if (value) {
            this.data = value;
        }
    }
}

export class PlayerXFNStatsService {
    sampleStat = new PlayerXFNStatPVarDao(PVAR_SAMPLE_NAME, this.player, this.persistentStorage, this.horizonApiProvider);

    playerXFNStatPVarDaos: PlayerXFNStatPVarDao[] = [
        this.sampleStat,
    ];

    constructor(
        private player: Player,
        private persistentStorage: PersistentStorage,
        private statsService: PlayerStatsService,
        private horizonApiProvider: Component<any>
    ) {

    }

    public save() {
        const lifetimeStats = this.statsService.lifetimeStats;

        this.sampleStat.setValue(lifetimeStats.total.matches_played);

        this.playerXFNStatPVarDaos.forEach((dao) => dao.save());
    }

    public reset() {
        this.playerXFNStatPVarDaos.forEach((dao) => dao.reset());
    }
}
