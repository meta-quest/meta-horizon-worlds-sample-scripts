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

import { OGF_ONLY_DEBUG_LOCAL_PLAYER_ASSETS_TO_SPAWN } from 'ConstsAssets';
import { canSpawnDebugTools } from 'ConstsDebugging';
import { UNDEFINED_STRING } from 'EventData';
import { registerPrespawnedAsset } from 'Events';
import * as EventsCore from 'EventsCore';
import { assignAsset, assignAssetComplete, localAssignAssetComplete, localUnassignAsset, OnAssetCompleteType } from 'EventsCore';
import { Component, Entity, EventSubscription, Player, PlayerDeviceType, SpawnController, SpawnError, SpawnState, Vec3 } from 'horizon/core';
import { AssetData } from 'AssetEx';
import { getComponentClassOrEntityName, logEx } from 'UtilsConsoleEx';
import { ServerAnalyticsService } from 'PlatformServices';
import { LocalClientUIPlayerAsset, PlayerAsset, ServerUIPlayerAsset } from 'PlayerAsset';
import * as UtilsGameplay from 'UtilsGameplay';
import { asyncTimeout, toStringSafe } from 'UtilsGameplay';
import { getDebugName } from 'UtilsObj';
import { getOrDefaultMap } from 'UtilsTypescript';
import { TIME_UNITS } from 'UtilsMath';

const ASSET_POOL_DEBUG_LOGS_PRINT = false;

const PLAYER_OBJ_SPAWN_POS = new Vec3(0, -1000, 0);

export const ASSET_POOL_ASSIGN_TIMEOUT_MILLIS = 20000;
const ARBITRARY_HANDSHAKE_DELAY = 500;

const ASSIGN_ASSET_RETRIES = 9; // Regardless of this number, we always do 2 attempts minimum (the initial attempt + 1 retry) because Horizon will regularly fail on a cold start.
const ASSIGN_ASSET_ATTEMPTS = ASSIGN_ASSET_RETRIES + 1; // + 1 to account for our initial attempt

export const PLAYER_PRESPAWNED_ASSET_IDS = [
    'LocalPlayer',
    'AllyNametag',
    'EnemyNametag',
    'PlayerDeath',
    'PlayerConditionalNux',
    'PlayerFX',
    'DamageNumberVFX',
    'IndicatorLine',
    'StatusEffectFeedbacks',
    'PlayerHUD',
    'UILocalPlayerHUDControls',
] as const;

export const WEAPON_PRESPAWNED_ASSET_IDS = [
    'Weapon1',
    'Weapon2',
    'Weapon3',
] as const;

export const ABILITY_PRESPAWNED_ASSET_IDS = [
    'AbilitySample',
] as const;

export const ALL_PRESPAWNED_ASSET_IDS = [
    UNDEFINED_STRING,
    ...PLAYER_PRESPAWNED_ASSET_IDS,
    ...WEAPON_PRESPAWNED_ASSET_IDS,
    ...ABILITY_PRESPAWNED_ASSET_IDS,
] as const;
export type PrespawnedAssetId = typeof ALL_PRESPAWNED_ASSET_IDS[number];

type PrespawnedAssets = {
    [key in PrespawnedAssetId]?: Component;
}

export type PooledAsset = PlayerAsset<any> | LocalClientUIPlayerAsset<any> | ServerUIPlayerAsset<any>;

export class AssetPools {
    private idToPools = new Map<PrespawnedAssetId, PooledAsset[]>();
    private prespawnedAssetsByPlayer = new Map<Player, PrespawnedAssets>();
    private spawnControllersByPlayer = new Map<Player, Set<SpawnController>>();
    private serverPlayerAssets = new Set<Entity>();
    private localClientPlayerAssets = new Set<Entity>();
    private assignOrCompleteSubscriptions = new Map<Entity, EventSubscription[]>();
    /**
     * There's some weirdness with CustomUI that apparently isn't just prewarming specific. The mitigation as laid out by the CLIPS team
     * is to assign to user user, assign back to server, and then assign back to user client again.
     */
    private waitingForExpectedCleanup = new Set<Entity>();
    private waitingForAssignBackToClient = new Map<Entity, Player>();

    constructor(private prespawnedAssetIds: readonly PrespawnedAssetId[], private horizonApiProvider: Component) {
        this.prespawnedAssetIds = this.prespawnedAssetIds.filter(id => id != UNDEFINED_STRING);
    }

    initialize() {
        this.horizonApiProvider.connectLocalBroadcastEvent(registerPrespawnedAsset, (data) => this.registerPrespawnedAsset(data.prespawnedAssetId, data.component, data.isClientLocalAsset));
    }

    async claimAssetsForPlayer(player: Player) {
        return Promise.all(PLAYER_PRESPAWNED_ASSET_IDS.map((id) => this.claimWithRetry(player, id)));
    }

    async claimWithRetry(player: Player, id: PrespawnedAssetId) {
        // Always do 2 attempts minimum (the initial attempt + 1 retry) because Horizon will regularly fail on a cold start.
        for (let attemptCount = 1; attemptCount <= Math.max(ASSIGN_ASSET_ATTEMPTS, 2); ++attemptCount) {
            // 2s, 4s, 8s, 16s, 20s, 20s, 20s ...
            const timeout = Math.min(
                Math.pow(2, attemptCount) * TIME_UNITS.MILLIS_PER_SECOND,
                ASSET_POOL_ASSIGN_TIMEOUT_MILLIS
            );
            if (attemptCount != 1) {
                logEx(`AssetPool - [RETRY #${attemptCount}] ${getDebugName(player)} for ${id}, timeout: ${timeout})`);
            }

            try {
                const pooledAsset = await this.claimAsset(player, id, timeout, attemptCount);
                ServerAnalyticsService().getPlayerAnalytics(player).claimAssetTryCountMetricEvent(id, attemptCount);
                return pooledAsset;
            } catch (e) {
                try {
                    await this.forceCleanUpAsset(player, id);
                } catch (e) {
                    logEx(`AssetPool - [FAILED CLEANUP] ATTEMPT=${attemptCount + 1} ${getDebugName(player)} for id: ${id}, error: ${e instanceof Error ? e.message : e}`);
                }
            }
        }

        ServerAnalyticsService().getPlayerAnalytics(player).errorMetricEvent(`PrespawnedAssetClaim|${id}`);
        throw new Error(`AssetPool - ${getDebugName(player)} Failed to assign asset ${id} after ${(Math.max(ASSIGN_ASSET_ATTEMPTS, 2))} attempts`);
    }

    private async claimAsset(player: Player, id: PrespawnedAssetId, timeoutMillis: number, attemptCount: number) {
        const asset = this.getAssetByPlayerIndex(id, player);

        const assignAssetCompletePromise = new Promise<void>((resolve) => {
            const assignAssetCompleteCallback = (payload: OnAssetCompleteType) => {
                if (payload.requireAssignBackToServer && !this.waitingForAssignBackToClient.has(asset.entity)) {
                    this.waitingForAssignBackToClient.set(asset.entity, player);

                    if (ASSET_POOL_DEBUG_LOGS_PRINT) logEx(`AssetPool - Received assignAssetComplete for player ${toStringSafe(player)}: ${id}[${asset.entity.id}], assigning back to server for the ownership handshake`);
                    this.horizonApiProvider.async.setTimeout(() => asset.entity.owner.set(this.horizonApiProvider.world.getServerPlayer()), ARBITRARY_HANDSHAKE_DELAY);
                    return;
                }

                this.waitingForAssignBackToClient.delete(asset.entity);
                if (ASSET_POOL_DEBUG_LOGS_PRINT) logEx(`AssetPool - Received assignAssetComplete for player ${toStringSafe(player)}: ${id}[${asset.entity.id}]`);
                this.clearEventSubscriptionsFor(asset.entity);
                resolve();
            };

            const eventSubscriptions = this.assignOrCompleteSubscriptions.getOrDefault(asset.entity, () => []);
            eventSubscriptions.push(this.horizonApiProvider.connectNetworkEvent(asset.entity, assignAssetComplete, assignAssetCompleteCallback));
            eventSubscriptions.push(this.horizonApiProvider.connectLocalEvent(asset.entity, localAssignAssetComplete, assignAssetCompleteCallback));
        });

        if (ASSET_POOL_DEBUG_LOGS_PRINT) logEx(`AssetPool - Sending assignAsset for player ${toStringSafe(player)}: ${id}[${asset.entity.id}]`);

        const prespawnedAssets = this.prespawnedAssetsByPlayer.get(player) ?? {};
        prespawnedAssets[id] = asset;
        this.prespawnedAssetsByPlayer.set(player, prespawnedAssets);

        this.horizonApiProvider.sendLocalEvent(asset.entity, assignAsset, {expectedPreviousOwner: this.horizonApiProvider.world.getServerPlayer(), nextOwner: player});

        try {
            await asyncTimeout(assignAssetCompletePromise, `Timed out assigning prespawned asset: ${getComponentClassOrEntityName(asset.entity)}[${asset.entity.id}]`, timeoutMillis);
        } catch (e) {
            ServerAnalyticsService().getPlayerAnalytics(player).warnMetricEvent(`AssetPools.claimAsset|timeout#${attemptCount} - ${id}`);
            throw e;
        }

        return asset;
    }

    private clearEventSubscriptionsFor(entity: Entity) {
        const subscriptions = this.assignOrCompleteSubscriptions.getOrDefault(entity, () => []);
        subscriptions.forEach(subscription => subscription.disconnect());
        subscriptions.length = 0;
    }

    private getAssetByPlayerIndex(id: PrespawnedAssetId, player: Player) {
        const pool = this.idToPools.get(id);
        if (!pool) {
            const message = `No pool exists for: ${id}`;
            logEx(message, 'error');
            throw Error(message);
        }

        const playerIndex = player.index.get();

        if (playerIndex >= pool.length) {
            const message = `asset[${id}] pool size is too small ${pool.length}, player: ${playerIndex}`;
            logEx(message, 'error');
            throw Error(message);
        }

        const asset = pool[playerIndex];
        if (!asset) {
            const message = `No available asset[${id}] index: ${playerIndex}`;
            logEx(message, 'error');
            throw Error(message);
        }
        return asset;
    }

    getAsset(player: Player, id: PrespawnedAssetId): Component {
        const prespawnedAssets = this.prespawnedAssetsByPlayer.get(player);
        const asset = prespawnedAssets?.[id];
        if (!asset) {
            throw Error(`Attempted to retrieve a prespawned asset that doesn't belong to the player. player: ${toStringSafe(player)}, assetId: ${id}`);
        }
        return asset;
    }

    async forceCleanUpAllAssets(player: Player) {
        await Promise.all(this.prespawnedAssetIds.map(id => this.forceCleanUpAsset(player, id)));
    }

    async forceCleanUpAsset(player: Player, id: PrespawnedAssetId) {
        const pool = this.idToPools.get(id);
        if (!pool) throw Error(`Missing pool for ${id}, this shouldn't happen`);

        const asset = pool[player.index.get()];
        if (ASSET_POOL_DEBUG_LOGS_PRINT) logEx(`AssetPool - Force cleanup up asset before assign player to ${toStringSafe(player)}: ${id}[${asset.entity.id}]`);
        await this.cleanupAsset(asset);
    }

    async cleanupAllAssetsOnRemove(player: Player) {
        await Promise.all(this.prespawnedAssetIds.map(id => this.cleanupAssetForPlayerOnRemove(player, id)));
    }

    async cleanupAssetForPlayerOnRemove(player: Player, id: PrespawnedAssetId) {
        const assets = this.prespawnedAssetsByPlayer.get(player);
        if (!assets) {
            throw Error(`THIS SHOULD NOT HAPPEN. Player doesn't have any prespawned assets!?!!??: ${toStringSafe(player)}`);
        }

        const asset = assets[id];
        if (!asset) {
            return;
        }

        if (ASSET_POOL_DEBUG_LOGS_PRINT) logEx(`AssetPool - Cleaning up asset for player ${toStringSafe(player)}: ${id}[${asset.entity.id}]`);
        await this.cleanupAsset(asset);
    }

    private async cleanupAsset(asset: Component) {
        if (!this.serverPlayerAssets.has(asset.entity) && !this.localClientPlayerAssets.has(asset.entity)) {
            throw Error(`This shouldn't be possible, add ${getDebugName(asset.entity)} asset to one of the player asset maps`);
        }

        this.clearEventSubscriptionsFor(asset.entity);

        this.waitingForExpectedCleanup.add(asset.entity);

        this.waitingForAssignBackToClient.delete(asset.entity);

        if (this.serverPlayerAssets.has(asset.entity)) {
            this.horizonApiProvider.sendLocalEvent(asset.entity, localUnassignAsset, {});
        } else {
            let isAlreadyOwnedByServer = asset.entity.owner.get() == this.horizonApiProvider.world.getServerPlayer();
            if (this.localClientPlayerAssets.has(asset.entity) && !isAlreadyOwnedByServer) {
                let subscription!: EventSubscription;
                const promise = new Promise<void>(resolve => {
                    subscription = this.horizonApiProvider.connectLocalBroadcastEvent(registerPrespawnedAsset, payload => {
                        if (payload.component.entity == asset.entity) {
                            subscription.disconnect();
                            resolve();
                        }
                    });
                });
                asset.entity.owner.set(this.horizonApiProvider.world.getServerPlayer());
                try {
                    await asyncTimeout(promise, `Timed out cleaning up prespawned asset: ${toStringSafe(asset.entity)}`, ASSET_POOL_ASSIGN_TIMEOUT_MILLIS);
                } finally {
                    subscription.disconnect();
                }
            }
        }
    }

    async spawnAssetsForPlayer(player: Player) {
        const promises: Promise<any>[] = [];
        for (const assetData of [...(canSpawnDebugTools(this.horizonApiProvider.world) ? OGF_ONLY_DEBUG_LOCAL_PLAYER_ASSETS_TO_SPAWN : [])]) {
            promises.push(this.spawnPlayerObj(player, assetData));
        }
        await Promise.all(promises);
    }

    deleteSpawnControllersForPlayer(player: Player) {
        this.spawnControllersByPlayer.get(player)?.forEach(controller => {
            switch (controller.currentState.get()) {
                case SpawnState.Loading:
                    controller.pause();
                    break;
                default:
                    controller.dispose();
                    break;
            }
        });
        this.spawnControllersByPlayer.delete(player);
    }

    private registerPrespawnedAsset(id: PrespawnedAssetId, component: PooledAsset, isClientLocalAsset: boolean) {
        (isClientLocalAsset ? this.localClientPlayerAssets : this.serverPlayerAssets).add(component.entity);

        const pool = this.idToPools.getOrDefault(id, () => []);
        if (!pool.some(pooledComponent => pooledComponent.entity == component.entity)) {
            // [SERVER STARTUP FLOW]
            pool.push(component);
            return;
        }

        // If the asset has already gone through the server startup flow, and we weren't intentionally waiting for a registerPrespawnedAsset() call, then why are we in this function?
        // We think there might be some Horizon shenanigans happening - this is to help us catch that case and log/metric.
        if (!this.waitingForExpectedCleanup.has(component.entity) && !this.waitingForAssignBackToClient.has(component.entity)) {
            const expectedPlayerAndAssets = Array.from(this.prespawnedAssetsByPlayer.entries())
                .find(entry => {
                    const assets = entry[1];
                    return assets[id]?.entity == component.entity;
                });

            if (!expectedPlayerAndAssets) {
                logEx(`AssetPool - registerPrespawnedAsset unexpected cleanup for asset ${id}. This asset does not have a player assigned. This should never happen!`, 'error');
            } else {
                const player = expectedPlayerAndAssets[0];
                logEx(`AssetPool - registerPrespawnedAsset unexpected cleanup for player ${toStringSafe(player)}, asset ${id}`, 'error');
                ServerAnalyticsService().getPlayerAnalytics(player).errorMetricEvent(`AssetPools.registerPrespawnedAsset|UnexpectedCleanup - ${id}`);
            }
        }
        this.waitingForExpectedCleanup.delete(component.entity);

        if (this.waitingForAssignBackToClient.has(component.entity)) {
            const targetPlayer = this.waitingForAssignBackToClient.get(component.entity)!;
            if (ASSET_POOL_DEBUG_LOGS_PRINT) logEx(`AssetPool - Received second registerPrespawnedAsset for player ${toStringSafe(targetPlayer)}: ${id}[${component.entity.id}], assigning back to server for the ownership handshake`);

            this.horizonApiProvider.async.setTimeout(() => this.horizonApiProvider.sendLocalEvent(component.entity, assignAsset, {
                expectedPreviousOwner: this.horizonApiProvider.world.getServerPlayer(),
                nextOwner: targetPlayer
            }), ARBITRARY_HANDSHAKE_DELAY);
            return;
        }
    }

    private async spawnPlayerObj(
        player: Player,
        assetData: AssetData,
        onFulfilled?: (spawnController: SpawnController) => void,
        onRejected?: (spawnController: SpawnController) => void,
        onFinally?: () => void,
    ) {
        const platformSpecificAsset = [PlayerDeviceType.Mobile, PlayerDeviceType.Desktop].includes(player.deviceType.get()) && assetData.xsAsset ? assetData.xsAsset : assetData.asset;
        const spawnController = UtilsGameplay.spawnControllerWithDefaults(platformSpecificAsset, PLAYER_OBJ_SPAWN_POS);

        try {
            await spawnController.spawn();

            spawnController.rootEntities
                .get()
                .flatMap(rootEntity => [rootEntity, ...rootEntity.children.get()])
                .forEach(spawnedEntity => this.horizonApiProvider.sendLocalEvent(spawnedEntity, EventsCore.onPlayerObjSpawned, {player: player}));

            onFulfilled?.(spawnController);
        } catch (e) {
            // Use tryCatchFunc() because, without it, if one of these bridge methods throws, it will unwind out of this catch() and swallow failureReason. Example: https://pxl.cl/7dLLG
            const playerName = UtilsGameplay.tryCatchFunc(() => player.name.get());
            const spawnError = UtilsGameplay.tryCatchFunc(() => SpawnError[spawnController.spawnError.get()]);
            // 2025-05-14: Previously, there was a check here to make sure spawnError was not SpawnError.Cancelled because:
            // "Cancelled is a user cancellation; cause of this is usually going from play -> edit mode, getting rid of these logs"
            // We've removed this check, for now, to tease out other hidden issues (e.g. capacity).
            logEx(`AssetPools.spawnPlayerObj() tried to spawn ${assetData.displayName} for ${playerName} and it failed because of ${e} [${spawnError}]}`, 'warning');

            onRejected?.(spawnController);
        } finally {
            onFinally?.();
        }

        getOrDefaultMap(this.spawnControllersByPlayer, player, () => new Set).add(spawnController);
        return spawnController;
    }
}
