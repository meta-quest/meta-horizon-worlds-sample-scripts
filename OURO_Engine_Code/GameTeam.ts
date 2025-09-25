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

import {FixedSizeGamePlayerArray, GamePlayer} from 'GamePlayer';
import {StatusEffectId} from 'ConstsIdsStatusEffect';
import {LocalEvent} from 'horizon/core';

export const onPlayerAddedToTeam = new LocalEvent<{ gp: GamePlayer, teamId: number, index: number }>('onPlayerAddedToTeam');
export const onPlayerRemovedFromTeam = new LocalEvent<{ gp: GamePlayer, teamId: number, index: number }>('onPlayerRemovedFromTeam');

export enum TeamVoipId {
    TEAM1 = 'Team 1',
    TEAM2 = 'Team 2'
}

export class Team {
    winCount: number = 0;
    points: number = 0;
    readonly players: FixedSizeGamePlayerArray;

    constructor(public id: number, public teamVoipId: TeamVoipId, public name: string, public infoStatusEffectId: StatusEffectId, maxMembers: number) {
        this.players = new FixedSizeGamePlayerArray(maxMembers);
    }

    reset() {
        this.winCount = 0;
        this.points = 0;
    }

    addGamePlayer(gp: GamePlayer, teamVoipEnabled: boolean, index?: number) {
        const gpIndex = this.players.add(gp, index);
        gp.team = this;
        gp.statusEffects.applyEffect(this.infoStatusEffectId);
        gp.horizonApiProvider.sendLocalBroadcastEvent(onPlayerAddedToTeam, {gp: gp, teamId: this.id, index: gpIndex});
        gp.pushReplicatedObjDataForAllClients();
    }

    removePlayer(gamePlayer: GamePlayer) {
        this.removeGamePlayer(gamePlayer);
    }

    removeGamePlayer(gp: GamePlayer) {
        let gpIndex = this.players.delete(gp);
        if (gpIndex != -1) {
            gp.team = undefined;
            gp.statusEffects.removeEffect(this.infoStatusEffectId);
            // This function is @internal, we can invoke and ts-ignore. If you pass it an invalid value, it disables the VOIP channel
            // @ts-ignore
            gp.owner.setTeamVoipSetting(`Invalid Team VOIP Setting`);
            gp.horizonApiProvider.sendLocalBroadcastEvent(onPlayerRemovedFromTeam, {gp: gp, teamId: this.id, index: gpIndex});
            gp.pushReplicatedObjDataForAllClients();
        }
    }

    getAlivePlayers() {
        return this.players.filter(gp => gp.health.isAlive);
    }

    getPlayers(){
        return this.players.getDefined()
    }
}
