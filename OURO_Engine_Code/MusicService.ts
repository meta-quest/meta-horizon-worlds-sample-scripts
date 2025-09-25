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

import {CodeBlockEvents, Component, Player, PropsFromDefinitions, PropTypes} from 'horizon/core';
import {ServerPlatformService} from 'PlatformServices';
import {AudioOpts, FULL_VOLUME, NO_VOLUME, playSFXForPlayers, setVolumeForPlayer, stopSFXForPlayer, stopSFXForPlayers} from 'UtilsFX';
import {isNotOptedOutOfVOAndMusic} from 'ConstsGame';

// Per request from music team, this is actually fired at 29s now
export const ROUND_END_APPROACHING_TIME_SECONDS = 29;

export const PlatformMusicServiceProps = {
    musLobby: {type: PropTypes.Entity},
    musLobbyFadeDurationSeconds: {type: PropTypes.Number, default: 1},
    musLobbyVolume: {type: PropTypes.Number, default: 0.8},

    musPodiumWin: {type: PropTypes.Entity},
    musPodiumOther: {type: PropTypes.Entity},

    musMatchStart: {type: PropTypes.Entity},
    musRoundStart: {type: PropTypes.Entity},

    mus30sRemain: {type: PropTypes.Entity},
};
type Props = typeof PlatformMusicServiceProps;

export class MusicService implements ServerPlatformService {
    constructor(private horizonApiProvider: Component, private props: PropsFromDefinitions<Props>) {
    }

    serverPreStart() {
        this.horizonApiProvider.connectCodeBlockEvent(this.horizonApiProvider.entity, CodeBlockEvents.OnPlayerEnterWorld, player => this.disableLobbyMusicFor(player));
    }

    serverStart() {
    }

    serverPostStart() {
    }

    serverUpdate(deltaTimeSeconds: number) {
    }

    enableLobbyMusicFor(player: Player) {
        setVolumeForPlayer(this.props.musLobby, player, FULL_VOLUME, this.getLobbyMusicOpts());
    }

    disableLobbyMusicFor(player: Player) {
        setVolumeForPlayer(this.props.musLobby, player, NO_VOLUME, this.getLobbyMusicOpts());
    }

    playPodiumMusicWinFor(player: Player) {
        playSFXForPlayers(this.props.musPodiumWin, [player].filter(isNotOptedOutOfVOAndMusic));
    }

    playPodiumMusicOtherFor(player: Player) {
        playSFXForPlayers(this.props.musPodiumOther, [player].filter(isNotOptedOutOfVOAndMusic));
    }

    stopPodiumMusicFor(player: Player) {
        stopSFXForPlayer(this.props.musPodiumWin, player);
        stopSFXForPlayer(this.props.musPodiumOther, player);
    }

    playRoundStartMusicFor(roundNumber: number, players: Player[]) {
        playSFXForPlayers(roundNumber == 1 ? this.props.musMatchStart : this.props.musRoundStart, players.filter(isNotOptedOutOfVOAndMusic));
    }

    stopRoundStartMusicFor(players: Player[]) {
        stopSFXForPlayers(this.props.musMatchStart, players);
        stopSFXForPlayers(this.props.musRoundStart, players);
    }

    play29sRemainingMusicFor(players: Player[]) {
        playSFXForPlayers(this.props.mus30sRemain, players.filter(isNotOptedOutOfVOAndMusic));
    }

    stop29sRemainingMusicFor(players: Player[]) {
        stopSFXForPlayers(this.props.mus30sRemain, players);
    }

    private getLobbyMusicOpts(): AudioOpts {
        return {fadeDurationSeconds: this.props.musLobbyFadeDurationSeconds};
    }
}
