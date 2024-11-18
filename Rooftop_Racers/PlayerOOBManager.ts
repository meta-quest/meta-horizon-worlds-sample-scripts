// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

/**
 * Manages the player local OOB controllers, initializing them and controlling ownership
 */
import * as hz from 'horizon/core';
import { GameState, Pool } from 'GameUtils';
import { Events } from "Events";

export class PlayerOOBManager extends hz.Component<typeof PlayerOOBManager> {
    static propsDefinition = {
        recordIntervalMS: { type: hz.PropTypes.Number, default: 500 },
        OOBWorldYHeight: { type: hz.PropTypes.Number, default: 50 },
        bufferRespawnYHeight: { type: hz.PropTypes.Number, default: 3 },
        lobbyStartRespawnGizmo: { type: hz.PropTypes.Entity },
    };

    private asyncIntervalID: number = 0;
    private localRespawnerPool = new Pool<hz.Entity>();
    private playerMap = new Map<number, {
        player: hz.Player,
        spawner: hz.SpawnPointGizmo,
        eventSub: hz.EventSubscription
    }>();

    private respawnVecBuffer: hz.Vec3 | null = null;
    private lastKnownGameState = GameState.ReadyForMatch;

    private lobbyStartRespawnGizmo: hz.SpawnPointGizmo | null = null;

    private static s_instance: PlayerOOBManager
    public static getInstance(): PlayerOOBManager {
        return PlayerOOBManager.s_instance;
    }

    constructor() {
        super();
        if (PlayerOOBManager.s_instance === undefined) {
            PlayerOOBManager.s_instance = this;
        }
        else {
            console.error(`There are two ${this.constructor.name} in the world!`)
            return;
        }
    }

    preStart() {
        //Potential for players to stand really close to edge and fall off easily when respawning,
        //to counteract that we respawn slightly higher that the ground position
        this.respawnVecBuffer = new hz.Vec3(0, this.props.bufferRespawnYHeight, 0);
        this.lobbyStartRespawnGizmo = this.props.lobbyStartRespawnGizmo!.as(hz.SpawnPointGizmo);

        this.connectCodeBlockEvent(
            this.entity,
            hz.CodeBlockEvents.OnPlayerEnterWorld,
            (player: hz.Player) => {
                this.handleOnPlayerEnterWorld(player, this.localRespawnerPool, this.playerMap);
            });

        this.connectCodeBlockEvent(
            this.entity,
            hz.CodeBlockEvents.OnPlayerExitWorld,
            (player: hz.Player) => {
                this.handleOnPlayerExitWorld(player, this.localRespawnerPool, this.playerMap);
            });

        this.connectLocalBroadcastEvent(Events.onRegisterOOBRespawner,
            (data) => {
                this.localRespawnerPool.addToPool(data.caller);
            });

        this.connectLocalBroadcastEvent(Events.onGameStateChanged,
            (data) => {
                this.lastKnownGameState = data.toState;
            });


        this.asyncIntervalID = this.async.setInterval(
            () => {
                this.playerMap.forEach((value) => {
                    let owner = value.player;
                    let pairedRespawnGizmo = value.spawner;

                    const ownerPos = owner.position.get();
                    const ownerRot = owner.rotation.get();

                    if (ownerPos.y < this.props.OOBWorldYHeight) {
                        pairedRespawnGizmo!.teleportPlayer(owner);
                    }
                    //follow owner around and save their last known ground position
                    else if (owner.isGrounded.get()) {

                        pairedRespawnGizmo.position.set(ownerPos.addInPlace(this.respawnVecBuffer!));
                        pairedRespawnGizmo.rotation.set(ownerRot);
                    }
                });
            },
            this.props.recordIntervalMS);
    }

    start() { }

    private handleOnPlayerEnterWorld(
        player: hz.Player,
        objPool: Pool<hz.Entity>,
        playerMap: Map<number, {
            player: hz.Player,
            spawner: hz.SpawnPointGizmo,
            eventSub: hz.EventSubscription}>): void {
        const playerRespawner = objPool.getNextAvailable();
        if (playerRespawner) {
            const spawnGiz = playerRespawner.as(hz.SpawnPointGizmo)!;
            console.log(`${this.constructor.name} Attached Respawner to ${player.name.get()}`);

            const sub = this.connectNetworkEvent(
                player,
                Events.onPlayerOutOfBounds,
                () => {
                    //The player should only respawn on the last known ground spot if the game is in progress
                    //If they happens to fall out of bounds when the game is over/starting,
                    //we want to respawn them in the lobby, not where they fell, otherwise they are stuck out of match
                    if (this.lastKnownGameState === GameState.PlayingMatch || this.lastKnownGameState === GameState.EndingMatch) {
                        spawnGiz.teleportPlayer(player);
                    }
                    else {
                        this.lobbyStartRespawnGizmo!.teleportPlayer(player);
                    }
                });
            playerMap.set(player.id, { player: player, spawner: spawnGiz, eventSub: sub });

        }
    };

    private handleOnPlayerExitWorld(
        player: hz.Player,
        objPool: Pool<hz.Entity>,
        playerMap: Map<number, {
            player: hz.Player,
            spawner: hz.SpawnPointGizmo,
            eventSub: hz.EventSubscription
        }>): void {
        const playerRespawner = playerMap.get(player.id)?.spawner;
        if (playerRespawner) {
            console.log(`${this.constructor.name} Removed Respawner from ${player.name.get()}`);

            objPool.addToPool(playerRespawner);
            playerMap.get(player.id)!.eventSub.disconnect();
            playerMap.delete(player.id);
        }
    };

    dispose() {
        this.async.clearInterval(this.asyncIntervalID);
    }

}
hz.Component.register(PlayerOOBManager);
