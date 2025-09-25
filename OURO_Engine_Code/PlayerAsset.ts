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

import { PrespawnedAssetId } from 'AssetPools';
import { registerPrespawnedAsset } from 'Events';
import { assignAsset, assignAssetComplete, localAssignAssetComplete, localUnassignAsset } from 'EventsCore';
import { Component, Player, PlayerDeviceType } from 'horizon/core';
import { UIComponent, UINode } from 'horizon/ui';
import { logIfEntityConfigured } from 'UtilsConsoleEx';
import { isServer, isServerPlayer, toStringSafe } from 'UtilsGameplay';
import { getDebugName } from 'UtilsObj';

export abstract class PlayerAsset<T> extends Component<typeof PlayerAsset & T> {
    readonly abstract prespawnedAssetId: PrespawnedAssetId;
    readonly abstract isClientLocalAsset: boolean;

    abstract onPreStart(): void

    abstract onStart(): void

    // There's some REALLY weird handshake going on with the Horizon ownership handshake. This aims to prevent some of those edge cases where multiple assigns are happening
    protected shouldAssignOrSpawn(owner: Player, previous: Player, next: Player) {
        return owner == previous && owner != next;
    }
}

/**
 * ServerPlayerAssets are assigned 1:1 to a player, but live on the server and only run on the default server context. It only runs preStart / start once.
 *
 * Leverage a virtual owner field, rather than the Horizon owner synchronized property
 */
export abstract class ServerPlayerAsset<T> extends PlayerAsset<typeof ServerPlayerAsset & T> {
    virtualOwner!: Player;
    isClientLocalAsset = false;

    // It's safe to subscribe to events on virtualOwner in this function, because events subscribed
    // to a player are automatically cleaned up when the player leaves the world. This is not the case for
    // events subscribed to the entity - you must clean up those subscriptions. If this class is changed
    // to reassign to players who have not left the world, we'll need to clean up these subscriptions ourselves.
    abstract onAssignVirtualOwner(): void

    abstract onUnassignVirtualOwner(): void

    override preStart(): void {
        logIfEntityConfigured(this.entity, 'preStart');

        this.connectLocalEvent(this.entity, assignAsset, (data) => {
            if (!this.shouldAssignOrSpawn(this.virtualOwner, data.expectedPreviousOwner, data.nextOwner)) return;

            logIfEntityConfigured(this.entity, `assignAsset from ${toStringSafe(this.virtualOwner)} to ${toStringSafe(data.nextOwner)}`);
            this.assignVirtualOwner(data.nextOwner);
        });

        this.connectLocalEvent(this.entity, localUnassignAsset, () => {
            logIfEntityConfigured(this.entity, `unassignAsset from ${toStringSafe(this.virtualOwner)}`);
            this.assignVirtualOwner(this.world.getServerPlayer());
        });

        logIfEntityConfigured(this.entity, 'onPreStart');
        this.onPreStart();
    }

    override start() {
        logIfEntityConfigured(this.entity, 'start');

        logIfEntityConfigured(this.entity, 'onStart');
        this.onStart();

        this.assignVirtualOwner(this.world.getServerPlayer());
    }

    protected assignVirtualOwner(player: Player) {
        logIfEntityConfigured(this.entity, `assignVirtualOwner`);
        this.virtualOwner = player;

        if (isServerPlayer(player, this.world)) {
            logIfEntityConfigured(this.entity, `onUnassignVirtualOwner`);
            this.onUnassignVirtualOwner();
            this.sendLocalBroadcastEvent(registerPrespawnedAsset, {prespawnedAssetId: this.prespawnedAssetId, component: this, isClientLocalAsset: this.isClientLocalAsset});
            return;
        }

        logIfEntityConfigured(this.entity, `onAssignVirtualOwner - ${getDebugName(this.virtualOwner)}`);
        this.onAssignVirtualOwner();
        this.sendLocalEvent(this.entity, localAssignAssetComplete, {});
    }
}

/**
 * LocalClientPlayerAssets are assigned 1:1 to a player, and are transferred to the player client. It runs preStart / start on every ownership transfer
 *
 * When clients end connections, components are auto transferred to server.
 */

export abstract class LocalClientPlayerAsset<T> extends PlayerAsset<typeof LocalClientPlayerAsset & T> {
    owner!: Player;
    ownerIsPlayer!: boolean;
    deviceType!: PlayerDeviceType;
    isClientLocalAsset = true;

    abstract onReturnFromClient(): void

    abstract onReturnToServer(): void

    override preStart(): void {
        logIfEntityConfigured(this.entity, 'preStart');
        this.owner = this.entity.owner.get();
        this.ownerIsPlayer = !isServerPlayer(this.owner, this.world);
        this.deviceType = this.ownerIsPlayer ? this.owner.deviceType.get() : PlayerDeviceType.VR;

        this.connectLocalEvent(this.entity, assignAsset, (data) => {
            if (!this.shouldAssignOrSpawn(this.owner, data.expectedPreviousOwner, data.nextOwner)) return;

            logIfEntityConfigured(this.entity, `assignAsset from ${toStringSafe(this.owner)} to ${toStringSafe(data.nextOwner)}`);
            this.entity.owner.set(data.nextOwner);
        });

        if (isServer(this.world)) {
            logIfEntityConfigured(this.entity, 'preStart - isServer');
            return;
        }

        logIfEntityConfigured(this.entity, 'onPreStart');
        this.onPreStart();
    }

    override start() {
        logIfEntityConfigured(this.entity, 'start');

        if (isServer(this.world)) {
            logIfEntityConfigured(this.entity, 'onReturnToServer');
            this.onReturnToServer();
            this.sendLocalBroadcastEvent(registerPrespawnedAsset, {prespawnedAssetId: this.prespawnedAssetId, component: this, isClientLocalAsset: this.isClientLocalAsset});
            return;
        }

        logIfEntityConfigured(this.entity, 'onStart');
        this.onStart();
        this.sendNetworkEvent(this.entity, assignAssetComplete, {});
    }

    override dispose() {
        logIfEntityConfigured(this.entity, 'dispose');

        if (isServer(this.world)) {
            logIfEntityConfigured(this.entity, 'dispose - isServer');
            return;
        }

        logIfEntityConfigured(this.entity, 'onReturnFromClient');
        this.onReturnFromClient();
    }
}

export abstract class UIPlayerAsset<T> extends UIComponent<typeof UIPlayerAsset & T> {
    readonly abstract prespawnedAssetId: PrespawnedAssetId;
    readonly abstract isClientLocalAsset: boolean;

    abstract onInitializeUI(): UINode

    abstract onStart(): void

    // There's some REALLY weird handshake going on with the Horizon ownership handshake. This aims to prevent some of those edge cases where multiple assigns are happening
    protected shouldAssignOrSpawn(owner: Player, previous: Player, next: Player) {
        return owner == previous && owner != next;
    }
}

/**
 * This looks very similar to ServerPlayerAsset, but needs to be separate from PlayerAsset because the base type is Component vs UIComponent
 */
export abstract class ServerUIPlayerAsset<T> extends UIPlayerAsset<typeof ServerUIPlayerAsset & T> {
    readonly abstract prespawnedAssetId: PrespawnedAssetId;
    isClientLocalAsset = false;

    virtualOwner!: Player;

    abstract onAssignVirtualOwner(): void

    abstract onUnassignVirtualOwner(): void

    initializeUI(): UINode {
        logIfEntityConfigured(this.entity, 'initializeUI');

        this.connectLocalEvent(this.entity, assignAsset, (data) => {
            if (!this.shouldAssignOrSpawn(this.virtualOwner, data.expectedPreviousOwner, data.nextOwner)) return;

            logIfEntityConfigured(this.entity, `assignAsset from ${toStringSafe(this.virtualOwner)} to ${toStringSafe(data.nextOwner)}`);
            this.assignVirtualOwner(data.nextOwner);
        });

        this.connectLocalEvent(this.entity, localUnassignAsset, () => {
            logIfEntityConfigured(this.entity, `unassignAsset from ${toStringSafe(this.virtualOwner)}`);
            this.assignVirtualOwner(this.world.getServerPlayer());
        });

        logIfEntityConfigured(this.entity, 'onInitializeUI');
        return this.onInitializeUI();
    }

    start() {
        logIfEntityConfigured(this.entity, 'start');

        logIfEntityConfigured(this.entity, 'onStart');
        this.onStart();

        this.assignVirtualOwner(this.world.getServerPlayer());
    }

    private assignVirtualOwner(player: Player) {
        logIfEntityConfigured(this.entity, `assignVirtualOwner`);
        this.virtualOwner = player;

        if (isServerPlayer(player, this.world)) {
            logIfEntityConfigured(this.entity, 'onUnassignVirtualOwner');
            this.onUnassignVirtualOwner();
            this.sendLocalBroadcastEvent(registerPrespawnedAsset, {prespawnedAssetId: this.prespawnedAssetId, component: this, isClientLocalAsset: this.isClientLocalAsset});
            return;
        }

        logIfEntityConfigured(this.entity, `onAssignVirtualOwner - ${getDebugName(this.virtualOwner)}`);
        this.onAssignVirtualOwner();
        this.sendLocalEvent(this.entity, localAssignAssetComplete, {});
    }
}

/**
 * This looks very similar to LocalClientPlayerAsset, but needs to be separate from PlayerAsset because the base type is Component vs UIComponent
 */
export abstract class LocalClientUIPlayerAsset<T> extends UIPlayerAsset<typeof LocalClientUIPlayerAsset & T> {
    isClientLocalAsset = true;

    owner!: Player;
    deviceType = PlayerDeviceType.VR;

    abstract onReturnToServer(): void

    override initializeUI() {
        logIfEntityConfigured(this.entity, 'initializeUI');

        this.owner = this.entity.owner.get();

        this.connectLocalEvent(this.entity, assignAsset, (data) => {
            if (!this.shouldAssignOrSpawn(this.owner, data.expectedPreviousOwner, data.nextOwner)) return;

            logIfEntityConfigured(this.entity, `assignAsset from ${toStringSafe(this.owner)} to ${toStringSafe(data.nextOwner)}`);
            this.entity.owner.set(data.nextOwner);
        });

        if (isServer(this.world)) {
            logIfEntityConfigured(this.entity, 'initializeUI - isServer');
            this.deviceType = PlayerDeviceType.VR;
            return new UINode();
        }

        this.deviceType = this.owner.deviceType.get();

        logIfEntityConfigured(this.entity, 'onInitializeUI');
        return this.onInitializeUI();
    }

    override start() {
        logIfEntityConfigured(this.entity, 'start');
        if (isServer(this.world)) {
            logIfEntityConfigured(this.entity, 'onReturnToServer');
            this.onReturnToServer();
            this.sendLocalBroadcastEvent(registerPrespawnedAsset, {prespawnedAssetId: this.prespawnedAssetId, component: this, isClientLocalAsset: this.isClientLocalAsset});
            return;
        }

        logIfEntityConfigured(this.entity, 'onStart');
        this.onStart();
        this.sendNetworkEvent(this.entity, assignAssetComplete, {requireAssignBackToServer: true});
    }
}
