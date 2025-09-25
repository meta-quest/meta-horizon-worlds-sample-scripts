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

//** CROSS WORLD EVENTS */`

import { GameModeId } from 'ConstsIdsGameMode';
import { GameMode } from 'GameMode';
import { Entity, LocalEvent, NetworkEvent, Player, SpawnPointGizmo } from 'horizon/core';

export interface SpawnPointData {
    spawnPoint: SpawnPointGizmo,
    locationName: string;
    team?: number; // -1 is default
    index?: number; // -1 is default
}

// NEW ARENA CORE EVENTS HERE
export const setGameMode = new LocalEvent<{ gameModeId: GameModeId }>('setGameMode');
export const getCurrentGameMode = new LocalEvent<{}>('getCurrentGameMode');
export const onGetCurrentGameMode = new LocalEvent<{ gameModeId: GameModeId, gameMode: GameMode }>('onGetCurrentGameMode');
export const setLobbyPhaseComplete = new LocalEvent<{}>('startGameMode');
export const playerOutOfBoundsTimedOut = new LocalEvent<{ player: Player }>('playerOutOfBoundsTimedOut');

export const registerSpawnPoint = new LocalEvent<{ data: SpawnPointData }>('registerSpawnPoint');

// PLAYER
export const playerEnteredOutOfBoundsArea = new LocalEvent<{ player: Player }>('playerEnteredOutOfBoundsArea');
export const playerExitedOutOfBoundsArea = new LocalEvent<{ player: Player }>('playerExitedOutOfBoundsArea');

// NEXUS CROSS WORLDS BELOW THIS LINE // TODO: Clean-up unused files
export const onGameInitialized = new LocalEvent<{}>('onGameInitialized');
export const onEncounterActorDeath = new LocalEvent<{ actor: Entity }>('onEncounterActorDeath');
export const killEncounterActor = new LocalEvent<{}>('killEncounterActor');

export const onPlayerDeath = new NetworkEvent<{ player: Player, killer: Player }>('onPlayerDeath');
export const onPlayerRevive = new NetworkEvent<{ player: Player }>('onPlayerRevive');

// FYI: Section not in Biome Core {Start}
export enum SelectorTypes {
    SONGS = 'SONGS',
}

export const registerToSelector = new LocalEvent<{
    selectorType: SelectorTypes,
    entity: Entity,
    order?: number,
}>('registerToSelector');
export const selectFromSelector = new LocalEvent<{}>('select');
