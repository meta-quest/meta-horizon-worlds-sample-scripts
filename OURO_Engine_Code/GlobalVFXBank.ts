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


import { AssetEx } from 'AssetEx';
import { BaseObj } from 'BaseObj';
import * as ConstsObj from 'ConstsObj';
import { Color, Component, Entity, PropTypes, Quaternion, Vec3, World } from 'horizon/core';
import { GameFX, playVFXForEveryone, setVFXParameter, setVFXParameters, setVFXParametersAndPlay, stopVFXForEveryone } from 'UtilsFX';
import * as UtilsGameplay from 'UtilsGameplay';
import * as UtilsMath from 'UtilsMath';

export const VFX_ID_RADIUS = 'radius_m';
export const VFX_ID_COLOR = 'color';

export const VFX_POOL_SIZE = 10;

export class GlobalVFXBank extends Component<typeof GlobalVFXBank> {
    static propsDefinition = {
        levelUpVFX: {type: PropTypes.Entity},

        titleUnlockVFX: {type: PropTypes.Entity},

        explosionVFX: {type: PropTypes.Entity},
        explosionSFX_all: {type: PropTypes.Entity},
    };

    static instance: GlobalVFXBank;
    explosionFX!: GameFX;
    radialTelegraphs = new VFXPool(this, AssetEx.new('0'), 'radialTelegraphs');

    preStart() {
        GlobalVFXBank.instance = this;

        this.explosionFX = {
            allVFX: this.props.explosionVFX,
            allSFX: this.props.explosionSFX_all,
        };

        this.radialTelegraphs.initialize(VFX_POOL_SIZE).then(() => {
            this.connectLocalBroadcastEvent(World.onUpdate, (data) => this.update(data.deltaTime));
        });
    }

    start() {
    }

    update(deltaTime: number) {
        this.radialTelegraphs.update(deltaTime);
    }

    playExplosionAt(position: Vec3, radius: number, color: Color, oneShot: boolean = true) {
        setVFXParametersAndPlay(this.props.explosionVFX, {oneShot, position}, [
            {key: VFX_ID_RADIUS, value: radius},
            {key: VFX_ID_COLOR, value: color}
        ]);
    }
}

Component.register(GlobalVFXBank);


export interface VFXSettings {
    radius?: number,
    color?: Color,
}

export class VFXPool {
    available: VFXPoolTracker[] = [];
    active: VFXPoolTracker[] = [];

    constructor(private hzObj: Component, private asset: AssetEx, private debugLabel: string = '') {
    }

    async initialize(count: number) {
        await this.spawnAsset(count);
    }

    async spawnAsset(count: number) {
        if (!this.asset) {
            console.error('VFXPool: ', this.debugLabel, ' - asset reference missing, did you forget to initialize?');
            return;
        }

        for (let i = 0; i < count; ++i) {
            const spawnController = UtilsGameplay.spawnControllerWithDefaults(this.asset);

            try {
                await spawnController.spawn();

                spawnController.rootEntities.get().forEach((value) =>
                    this.addIfExists(value)
                );
            } catch (e) {
                // Use tryCatchFunc() because, without it, if one of these bridge methods throws, it will unwind out of this catch() and swallow failureReason. Example: https://pxl.cl/7dLLG
                const spawnError = UtilsGameplay.tryCatchFunc(() => spawnController.spawnError.get());
                console.error('VFXPool: ', this.debugLabel, ' - Failed to spawn asset - reason: ', e, ' - error: ', spawnError);
            }
        }
    }

    addIfExists(vfx: Entity) {
        if (UtilsGameplay.exists(vfx)) {
            this.available.push(new VFXPoolTracker(this, vfx));
        }
    }

    playRelativeToTarget(targetObj: BaseObj,
                         targetPart: ConstsObj.ObjTargetPart = ConstsObj.ObjTargetPart.POS,
                         localOffset: Vec3 = Vec3.zero,
                         localRotOffset: Quaternion = Quaternion.one,
                         settings: VFXSettings) {
        const tracker = this.available.pop();
        if (tracker) {
            tracker.applySettings(settings);
            tracker.playRelativeToTarget(targetObj, targetPart, localOffset, localRotOffset);
            this.active.push(tracker);
            return tracker;
        }
    }

    update(deltaTime: number) {
        this.active.forEach((value) => value.update(deltaTime));
    }

    releaseTracker(tracker: VFXPoolTracker) {
        this.available.push(tracker);
    }
}

export class VFXPoolTracker {
    parent: VFXPool;

    vfx: Entity;
    targetObj: BaseObj | undefined = undefined;
    targetPart: ConstsObj.ObjTargetPart = ConstsObj.ObjTargetPart.UNDEFINED;
    localOffset = Vec3.zero;
    localRotOffset = Quaternion.one;

    isPlaying = false;

    constructor(parent: VFXPool, vfx: Entity) {
        this.parent = parent;
        this.vfx = vfx;
    }

    setRadius(radius: number) {
        setVFXParameter(this.vfx, VFX_ID_RADIUS,radius)
    }

    setColor(color: Color) {
        setVFXParameter(this.vfx, VFX_ID_COLOR,color)
    }

    applySettings(settings: VFXSettings) {

        if (settings.radius != undefined) {
            this.setRadius(settings.radius);
        }

        if (settings.color != undefined) {
            this.setColor(settings.color);
        }

    }

    playRelativeToTarget(targetObj: BaseObj,
                         targetPart: ConstsObj.ObjTargetPart = ConstsObj.ObjTargetPart.POS,
                         localOffset: Vec3 = Vec3.zero,
                         localRotOffset: Quaternion = Quaternion.one) {

        this.isPlaying = true;
        this.targetObj = targetObj;
        this.targetPart = targetPart;
        this.localOffset = localOffset;
        this.localRotOffset = localRotOffset;
        this.positionRelativeToTarget();
        playVFXForEveryone(this.vfx);
    }

    update(deltaTime: number) {
        if (!this.isPlaying) {
            return;
        }

        this.positionRelativeToTarget();
    }

    positionRelativeToTarget() {
        if (!this.targetObj) {
            return;
        }
        let pos = this.targetObj.getTargetPartPos(this.targetPart);
        if (!pos) {
            pos = this.targetObj.getPos();
        }
        const forward = this.targetObj.getForward();
        const up = Vec3.up;
        pos = UtilsMath.getWorldPosFromLocal(this.localOffset, pos, forward, up);
        const rot = this.targetObj.getRotation();
        rot.mulInPlace(this.localRotOffset);

        UtilsGameplay.setPosRot(this.vfx, pos, rot);
    }

    stop() {
        this.isPlaying = false;
        stopVFXForEveryone(this.vfx);
        this.parent.releaseTracker(this);
    }
}
