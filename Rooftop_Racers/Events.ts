// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

/**
 * Contains the event container for the entire world
 */
import { GameState, PlayerGameStatus } from "GameUtils";
import * as hz from "horizon/core";

export const Events = {
    onGameStateChanged: new hz.LocalEvent<{ fromState: GameState; toState: GameState; }>("onGameStateChanged"),

    onRegisterPlayerForMatch: new hz.LocalEvent<{ player: hz.Player }>("onRegisterPlayerForMatch"),
    onDeregisterPlayerForMatch: new hz.LocalEvent<{ player: hz.Player }>("onDeregisterPlayerForMatch"),

    onPlayerJoinedStandby: new hz.LocalEvent<{ player: hz.Player }>("onPlayerJoinedStandby"),
    onPlayerLeftMatch: new hz.LocalEvent<{ player: hz.Player }>("onPlayerLeftMatch"),
    onPlayerLeftStandby: new hz.LocalEvent<{ player: hz.Player }>("onPlayerLeftStandby"),
    onPlayerReachedGoal: new hz.LocalEvent<{ player: hz.Player }>("onPlayerReachedGoal"),

    onResetLocalObjects: new hz.NetworkEvent("onResetLocalObjects"),

    onResetWorld: new hz.NetworkEvent("onResetWorld"),

    onGameEndTimeLeft: new hz.LocalEvent<{ timeLeftMS: number }>("onGameEndTimeLeft"),
    onGameStartTimeLeft: new hz.LocalEvent<{ timeLeftMS: number }>("onGameStartTimeLeft"),

    onRegisterPlyrCtrl: new hz.LocalEvent<{ caller: hz.Entity }>("onRegisterPlyrCtrl"),
    onGetPlyrCtrlData: new hz.NetworkEvent<{ caller: hz.Player }>("onGetPlyrCtrlData"),
    onSetPlyrCtrlData: new hz.NetworkEvent<{ doubleJumpAmount: number; boostJumpAmount: number; boostJumpAngle: number; }>("onSetPlyrCtrlData"),

    onPlayerGotBoost: new hz.NetworkEvent("onPlayerGotBoost"),  //The server needs to tell the local player controller that they have a boost
    onPlayerUsedBoost: new hz.LocalEvent("onPlayerUsedBoost"),  //this can be a local event given that we are only running it from the local player
    onPlayerUsedDoubleJump: new hz.LocalEvent("onPlayerUsedDoubleJump"),  //this can be a local event given that we are only running it from the local player

    onRegisterOOBRespawner: new hz.LocalEvent<{ caller: hz.Entity }>("onRegisterOOBRespawner"),
    onGetOOBRespawnerData: new hz.NetworkEvent<{ caller: hz.Entity }>("onGetOOBRespawnerData"),
    onSetOOBRespawnerData: new hz.NetworkEvent<{ intervalMS: number, OOBWorldYHeight: number }>("onSetOOBRespawnerData"),

    onPlayerOutOfBounds: new hz.NetworkEvent("onPlayerOutOfBounds"),
    onRegisterRaceHUD: new hz.LocalEvent<{ caller: hz.Entity }>("onRegisterRaceHUD"),

    onRacePosUpdate: new hz.NetworkEvent<{ playerPos: number, totalRacers: number, matchTime: number }>('onRacePosUpdate'),
    onStopRacePosUpdates: new hz.NetworkEvent('onStopRacePosUpdates'),

    //onPlayerListInStatusChanged : new hz.LocalEvent<{ pgs: PlayerGameStatus , player: hz.Player[]}>('onPlayerListInStatusChanged'),
};
