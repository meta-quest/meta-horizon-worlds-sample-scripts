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
import * as EventsNetworked from 'EventsNetworked';
import { Color, Component, Entity, Player, PropTypes, Quaternion, Vec3, World } from 'horizon/core';
import { LocalClientPlayerAsset } from 'PlayerAsset';
import * as UtilsGameplay from 'UtilsGameplay';

export class IndicatorLine extends LocalClientPlayerAsset<typeof IndicatorLine> {
    static propsDefinition = {
        lineGraphic: {type: PropTypes.Entity},
    };

    static FORWARD_OFFSET: number = 1.5;
    static UP_OFFSET: number = -0.1;
    static LINE_THICKNESS: number = 1.0;

    override readonly prespawnedAssetId: PrespawnedAssetId = 'IndicatorLine';

    visible: boolean = false;
    targetPos: Vec3 = Vec3.zero;

    targetPlayer: Player | undefined = undefined;
    targetEntity: Entity | undefined = undefined;

    override onPreStart() {
        UtilsGameplay.setOwner(this.owner, this.props.lineGraphic);

        UtilsGameplay.connectNetworkEvent(this, this.entity, EventsNetworked.showLineIndicatorPos, (data) => this.show(data.targetPos, undefined, undefined, data.color));
        UtilsGameplay.connectNetworkEvent(this, this.entity, EventsNetworked.showLineIndicatorPlayer, (data) => this.show(Vec3.zero, data.targetPlayer, undefined, data.color));
        UtilsGameplay.connectNetworkEvent(this, this.entity, EventsNetworked.showLineIndicatorEntity, (data) => this.show(Vec3.zero, undefined, data.targetEntity, data.color));
        UtilsGameplay.connectNetworkEvent(this, this.entity, EventsNetworked.hideLineIndicator, () => this.hide());

        UtilsGameplay.setVisibilityForPlayers(this.entity, [this.owner]);
        UtilsGameplay.setVisibilityForPlayersOnPlayerEnterWorld(this, this.entity, () => [this.owner]);
        this.setVisible(false);

        this.connectLocalBroadcastEvent(World.onUpdate, (data) => this.update(data.deltaTime));
    }

    override onStart() {
    }

    override onReturnFromClient() {
    }

    override onReturnToServer() {
        UtilsGameplay.setOwner(this.world.getServerPlayer(), this.props.lineGraphic);
        this.setVisible(false);
    }

    show(targetPos: Vec3, targetPlayer: Player | undefined, targetEntity: Entity | undefined, color: Color) {
        this.targetPos = targetPos;
        this.targetPlayer = targetPlayer;
        this.targetEntity = targetEntity;

        UtilsGameplay.setTrimeshTintColor(this.props.lineGraphic, color);
        this.setVisible(true);
    }

    hide() {
        this.targetPlayer = undefined;
        this.targetEntity = undefined;
        this.setVisible(false);
    }

    update(deltaTime: number) {
        if (!this.visible) return;

        const forward = this.owner.head.forward.get();
        const up = this.owner.head.up.get();

        let pos = this.owner.position.get();
        pos.addInPlace(Vec3.mul(forward, IndicatorLine.FORWARD_OFFSET));
        pos.addInPlace(Vec3.mul(up, IndicatorLine.UP_OFFSET));

        if (this.targetPlayer) {
            this.targetPos = this.targetPlayer.position.get();
        } else if (this.targetEntity && UtilsGameplay.exists(this.targetEntity)) {
            this.targetPos = this.targetEntity.position.get();
        }

        const dir = Vec3.sub(this.targetPos, pos);
        const scale = new Vec3(IndicatorLine.LINE_THICKNESS, IndicatorLine.LINE_THICKNESS, dir.magnitude());
        dir.normalizeInPlace();
        const rot = Quaternion.lookRotation(dir);
        pos = Vec3.lerp(pos, this.targetPos, 0.5);

        UtilsGameplay.setPosRotScale(this.entity, pos, rot, scale, true);
    }

    setVisible(visible: boolean) {
        this.visible = visible;
        UtilsGameplay.setVisible(this.entity, this.visible);
    }
}

Component.register(IndicatorLine);
