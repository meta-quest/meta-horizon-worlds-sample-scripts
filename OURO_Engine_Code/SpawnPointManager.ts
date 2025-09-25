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

import { SPAWN_POINT_TEAMMATE_RADIUS } from 'ConstsGame';
import { onGamePhaseTransition, SpawnPointLocation, SpawnScheme, teleportArenaPlayer, TeleportData } from 'Events';
import { registerSpawnPoint, SpawnPointData } from 'EventsCrossWorld';
import { GamePlayer } from 'GamePlayer';
import { Component, Player, SpawnPointGizmo } from 'horizon/core';
import { logEx } from 'UtilsConsoleEx';
import { getRandom } from 'UtilsGameplay';
import { gameplayObjExists, getDebugName } from 'UtilsObj';

interface TeleportDestinationData {
    spawnPoint: SpawnPointGizmo,
    player: Player,
    onComplete: (teleportData: TeleportDestinationData) => void,
}

const SPAWN_POINT_TEAMMATE_RADIUS_SQR = SPAWN_POINT_TEAMMATE_RADIUS * SPAWN_POINT_TEAMMATE_RADIUS;
const PLAYER_TOO_CLOSE_TO_SPAWN_DISTANCE_THRESHOLD = 5;
const PLAYER_TOO_CLOSE_TO_SPAWN_DISTANCE_THRESHOLD_SQR = PLAYER_TOO_CLOSE_TO_SPAWN_DISTANCE_THRESHOLD * PLAYER_TOO_CLOSE_TO_SPAWN_DISTANCE_THRESHOLD;
const SPAWN_USED_RECENTLY_TIME_MS = 2000;

class SpawnPointManager extends Component<typeof SpawnPointManager> {
    static propsDefinition = {};

    private spawnPoints: SpawnPointData[] = [];
    private playersLastUsedSpawn = new Map<Player, SpawnPointGizmo>();
    private lastTimeSpawnUsedMap = new Map<SpawnPointGizmo, number>();

    preStart() {
        this.connectLocalBroadcastEvent(registerSpawnPoint, (data) => this.registerSpawnPoint(data.data));

        this.connectLocalBroadcastEvent(onGamePhaseTransition, _ => this.playersLastUsedSpawn.clear());

        this.connectLocalBroadcastEvent(teleportArenaPlayer, (data) => {
            let selectedSpawnPoint: SpawnPointData | undefined;
            switch (data.spawnScheme) {
                case SpawnScheme.VICTORY_CONDITIONS:
                    selectedSpawnPoint = this.selectSpawnPointByIndex(data);
                    break;
                case SpawnScheme.SAFETY_AND_TEAM_PROXIMITY:
                    selectedSpawnPoint = this.selectSpawnPointBySafetyAndTeamProximity(data);
                    break;
                case SpawnScheme.TEAM_AND_INDEX:
                default:
                    selectedSpawnPoint = this.selectSpawnPointByTeamAndIndex(data);
                    break;
            }

            if (!selectedSpawnPoint) {
                const spawnPointConfigStr = `index[${data.index}] teamId[${data.teamId}] at location[${data.spawnPointLocationTag}]`;
                console.error(`THERE ARE NO VALID SPAWN POINTS WITH CONFIG [${spawnPointConfigStr}], BAILING.`);
                return;
            }

            const updatePlayerSystems = (destinationData: TeleportDestinationData) => GamePlayer.getGamePlayer(destinationData.player)?.attributes.updateSystems();

            const teleportData: TeleportDestinationData = {
                spawnPoint: selectedSpawnPoint.spawnPoint,
                player: data.player,
                onComplete: (teleportData) => {
                    updatePlayerSystems(teleportData);
                    data.onComplete?.();
                },
            };

            this.teleportPlayer(teleportData, data.spawnPointLocationTag != SpawnPointLocation.NUXJAIL);
            this.playersLastUsedSpawn.set(teleportData.player, teleportData.spawnPoint);
            this.lastTimeSpawnUsedMap.set(teleportData.spawnPoint, Date.now());
        });
    }

    start() {
    }

    registerSpawnPoint(data: SpawnPointData) {
        if (this.spawnPoints.includes(data)) return;

        this.spawnPoints.push(data);
    }

    private selectSpawnPointByIndex(data: TeleportData) {
        const locationSpawnPoints = this.spawnPoints.filter((spawnPointData) => spawnPointData.locationName == data.spawnPointLocationTag);

        if (locationSpawnPoints.length < 0) {
            return;
        }

        const indexSpawnPoints = locationSpawnPoints.filter((spawnPointData) => spawnPointData.index == data.index);

        if (indexSpawnPoints.length > 0) {
            // use random for the specified index.. although this probably should not be called an index then and be a priority :P
            return getRandom(indexSpawnPoints);
        }

        // fallback to random if none found
        return getRandom(locationSpawnPoints);
    }

    private selectSpawnPointByTeamAndIndex(data: TeleportData) {
        const validSpawns = this.spawnPoints.filter((spawnPointData) =>
            spawnPointData.locationName == data.spawnPointLocationTag &&
            spawnPointData.team == data.teamId &&
            // Right index, if provided or spawn point entity has undefined index.
            (data.index == undefined || spawnPointData.index == undefined || data.index == spawnPointData.index)
        );

        if (validSpawns.length <= 0) {
            return;
        }

        const optimizedSpawns = validSpawns.filter(spawnPointData =>
            Date.now() - (this.lastTimeSpawnUsedMap.get(spawnPointData.spawnPoint) ?? 0) > SPAWN_USED_RECENTLY_TIME_MS
        );

        if (optimizedSpawns.length > 0) {
            return getRandom(optimizedSpawns);
        }

        return getRandom(validSpawns);
    }

    private selectSpawnPointBySafetyAndTeamProximity(data: TeleportData) {
        const validSpawns = this.spawnPoints.filter((spawnPointData) => {
            const locationTagIsSet = spawnPointData.locationName == data.spawnPointLocationTag;
            const othersAreTooCloseToSpawn = GamePlayer.getLoadedGamePlayers().some((gp) => gp.getPos().distanceSquared(spawnPointData.spawnPoint.position.get()) < PLAYER_TOO_CLOSE_TO_SPAWN_DISTANCE_THRESHOLD_SQR);
            const playerDidNotUseThisSpawnLast = this.playersLastUsedSpawn.get(data.player) != spawnPointData.spawnPoint;
            return locationTagIsSet && !othersAreTooCloseToSpawn && playerDidNotUseThisSpawnLast;
        });

        if (validSpawns.length <= 0) return;

        const allyPositions = GamePlayer.getLoadedGamePlayers()
            .filter((gp) => gp.health.isAlive && gp.getTeamId() == data.teamId)
            .map((gp) => gp.getPos());

        const enemyPositions = GamePlayer.getLoadedGamePlayers()
            .filter((gp) => gp.health.isAlive && gp.getTeamId() != data.teamId)
            .map((gp) => gp.getPos());

        // For the first player getting spawned, spawn them at a matching team spawn. Others will separate naturally.
        if (enemyPositions.length == 0) {
            logEx(`${getDebugName(data.player)} USED to fallback to random team ID while spawning on safety, THIS WAS THE CAUSE OF THE BUG.`);
        }

        // Score each spawn point based on distance to enemies and nearby teammates
        const spawnScores = validSpawns.map((spawnPointData) => {
            const spawnPos = spawnPointData.spawnPoint.position.get();

            let distanceToClosestEnemy = Infinity;
            for (const enemyPos of enemyPositions) {
                const distance = spawnPos.distanceSquared(enemyPos);
                if (distance < distanceToClosestEnemy) {
                    distanceToClosestEnemy = distance;
                }
            }

            let nearbyTeammates = 0;
            for (const allyPos of allyPositions) {
                if (spawnPos.distanceSquared(allyPos) <= SPAWN_POINT_TEAMMATE_RADIUS_SQR) {
                    nearbyTeammates++;
                }
            }

            return {
                spawn: spawnPointData,
                distanceToClosestEnemy: distanceToClosestEnemy,
                nearbyTeammates: nearbyTeammates,
            };
        });

        // Sort by enemy distance (descending), then by nearby teammates (descending)
        spawnScores.sort((a, b) => {
            if (Math.abs(a.distanceToClosestEnemy - b.distanceToClosestEnemy) > 0.1) {
                return b.distanceToClosestEnemy - a.distanceToClosestEnemy;
            }
            return b.nearbyTeammates - a.nearbyTeammates;
        });

        return spawnScores[0].spawn;
    }

    // UseHorizonTeleport is being used here because we are getting a bug on world entry when we teleport you into the NUX jail
    // that hides all of your spatial HUD components and it does not recover. This seems to fix it for now, but there be dragons.
    private teleportPlayer(data: TeleportDestinationData, useHorizonTeleport: boolean) {
        if (useHorizonTeleport) {
            data.spawnPoint.teleportPlayer(data.player);
        } else {
            data.player.position.set(data.spawnPoint.position.get());
        }
        this.async.setTimeout(() => this.checkPlayerTeleportCompleted(data), 200);
    }

    private checkPlayerTeleportCompleted(data: TeleportDestinationData) {
        if (!gameplayObjExists(data.player)) return;

        const isAtTargetSpawnPoint = data.player.position.get().distance(data.spawnPoint.position.get()) <= 10;
        if (!isAtTargetSpawnPoint) {
            this.async.setTimeout(() => this.checkPlayerTeleportCompleted(data), 200);
            return;
        }

        data.onComplete(data);
    }
}

Component.register(SpawnPointManager);
