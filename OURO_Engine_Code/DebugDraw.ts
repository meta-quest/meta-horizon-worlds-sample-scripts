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

import { onDebugDrawInitialized } from 'Events';
import { onPlayerObjSpawned } from 'EventsCore';
import { Color, Component, Entity, PropTypes, Quaternion, Vec3 } from 'horizon/core';
import { setVFXParametersAndPlay } from 'UtilsFX';
import * as UtilsGameplay from 'UtilsGameplay';
import { EntityOrUndefined, isServer, setLine, setOwner, setPosRotScaleOpt, setTrimeshTintColor, setTrimeshTintStrength, setVisible, tryCatchFunc } from 'UtilsGameplay';
import { Pool } from 'UtilsPool';

const LOG_IF_UNAVAILABLE = false;
const DEBUG_VEC_DEFAULT_LENGTH = 10;

export class DebugDraw extends Component<typeof DebugDraw> {
    static instance: DebugDraw | undefined;
    static propsDefinition = {
        localOnly: {type: PropTypes.Boolean, defaultValue: false},
    };

    private lines = new Pool<Entity>();
    private cones = new Pool<Entity>();
    private spheres = new Pool<Entity>();
    private circles = new Pool<Entity>();

    preStart() {
        if (this.props.localOnly && isServer(this.world)) {
            this.connectLocalEvent(this.entity, onPlayerObjSpawned, (data) => {
                setOwner(data.player, this.entity);
            });
            return;
        }

        DebugDraw.instance = this;
    }

    start() {
        if (isServer(this.world)) return;
        const serverPlayer = tryCatchFunc(() => this.world.getServerPlayer());
        this.sendNetworkBroadcastEvent(onDebugDrawInitialized, {}, serverPlayer ? [serverPlayer] : undefined);
    }

    registerLine(line: Entity) {
        this.lines.addToPool(line);
        UtilsGameplay.setVisibilityAndCollidable(line, false);
    }

    registerCone(cone: Entity) {
        this.cones.addToPool(cone);
    }

    registerSphere(sphere: Entity) {
        this.spheres.addToPool(sphere);
    }

    registerCircle(circle: Entity) {
        this.circles.addToPool(circle);
    }

    showLine(start: Vec3, end: Vec3, color: Color = Color.white, durationSec?: number) {
        const line = this.lines.getNextAvailable();

        if (!line) {
            if (LOG_IF_UNAVAILABLE) console.log('tried to show debug line but none were available');
            return;
        }

        UtilsGameplay.setVisible(line, true);
        UtilsGameplay.setLine(line, start, end);
        UtilsGameplay.setTrimeshTintColor(line, color);
        UtilsGameplay.setTrimeshTintStrength(line, 1);
        if (durationSec) {
            this.async.setTimeout(() => this.hideLine(line), durationSec * 1000);
        }
        return line;
    }

    hideLine(line: Entity) {
        UtilsGameplay.setVisible(line, false);
        this.lines.returnToPool(line);
    }

    hideAllLines() {
        this.lines.all.forEach((line) => this.hideLine(line));
        this.lines.resetAvailability();
    }

    showCone(origin: Vec3, dir: Vec3, length: number, radius: number, durationSec: number = 1, color: Color = Color.white, logErrors = false) {
        const cone = this.cones.getNextAvailable();
        if (!cone) {
            if (logErrors) if (LOG_IF_UNAVAILABLE) console.log('tried to show debug cone but none were available');
            return;
        }

        setVFXParametersAndPlay(
            cone,
            {position: origin, rotation: Quaternion.lookRotation(dir)},
            [
                {key: 'start_radius', value: 0},
                {key: 'end_radius', value: radius},
                {key: 'distance', value: length},
                {key: 'debug_lifetime', value: durationSec},
                {key: 'color', value: color},
            ]
        );

        this.async.setTimeout(() => this.cones.returnToPool(cone), durationSec * 1000);
    }

    showSphere(origin: Vec3, radius: number, color: Color = Color.white, durationSec?: number) {
        const sphere = this.spheres.getNextAvailable();
        if (!sphere) {
            if (LOG_IF_UNAVAILABLE) console.log('tried to show debug sphere but none were available');
            return;
        }

        if (radius <= 0) return;
        setVisible(sphere, true);
        setPosRotScaleOpt(sphere, origin, undefined, Vec3.one.mul(radius));
        setTrimeshTintColor(sphere, color);
        setTrimeshTintStrength(sphere, 1);

        if (durationSec) {
            this.async.setTimeout(() => this.hideSphere(sphere), durationSec * 1000);
        }
        return sphere;
    }

    hideSphere(sphere: Entity) {
        setVisible(sphere, false);
        this.spheres.returnToPool(sphere);
    }

    showCircle(origin: Vec3, dir: Vec3, radius: number, color: Color = Color.white, durationSec?: number) {
        const circle = this.circles.getNextAvailable();
        if (!circle) {
            if (LOG_IF_UNAVAILABLE) console.log('tried to show debug circle but none were available');
            return;
        }

        if (radius <= 0) return;
        setVisible(circle, true);
        const sphereScale = new Vec3(radius, radius, 0.01);
        setPosRotScaleOpt(circle, origin, Quaternion.lookRotation(dir), sphereScale);
        setTrimeshTintColor(circle, color);
        setTrimeshTintStrength(circle, 1);

        if (durationSec) {
            this.async.setTimeout(() => this.hideCircle(circle), durationSec * 1000);
        }
        return circle;
    }

    hideCircle(circle: Entity) {
        setVisible(circle, false);
        this.circles.returnToPool(circle);
    }
}

Component.register(DebugDraw);

export function drawDebugVec(start: Vec3, vec: Vec3, color: Color = Color.white, durationSec?: number, lengthMeters?: number) {
    return drawDebugLine(start, start.add(vec.mul(lengthMeters ?? DEBUG_VEC_DEFAULT_LENGTH)), color, durationSec);
}

export function drawDebugLine(start: Vec3, end: Vec3, color: Color = Color.white, durationSec?: number): EntityOrUndefined {
    return DebugDraw.instance?.showLine(start, end, color, durationSec);
}

export function drawDebugSphere(origin: Vec3, radius: number, color: Color = Color.white, durationSec?: number): EntityOrUndefined {
    return DebugDraw.instance?.showSphere(origin, radius, color, durationSec);
}

export function updateDebugSphere(sphere: Entity, origin: Vec3, radius: number, color: Color = Color.white): EntityOrUndefined {
    if (radius <= 0) return;

    setPosRotScaleOpt(sphere, origin, undefined, Vec3.one.mul(radius));
    setTrimeshTintColor(sphere, color);
}

export function drawDebugCircle(origin: Vec3, dir: Vec3, radius: number, color: Color = Color.white, durationSec?: number): EntityOrUndefined {
    return DebugDraw.instance?.showCircle(origin, dir, radius, color, durationSec);
}

export function updateDebugCircle(circle: Entity, origin: Vec3, dir: Vec3, radius: number, color: Color = Color.white): EntityOrUndefined {
    if (radius <= 0) return;

    const sphereScale = new Vec3(radius, radius, 0.001);
    setPosRotScaleOpt(circle, origin, Quaternion.lookRotation(dir), sphereScale);
    setTrimeshTintColor(circle, color);
}

export function updateDebugLine(line: Entity, start: Vec3, end: Vec3) {
    setLine(line, start, end);
}

export function updateDebugVec(line: Entity, start: Vec3, vec: Vec3, lengthMeters?: number) {
    setLine(line, start, start.add(vec.mul(lengthMeters ?? DEBUG_VEC_DEFAULT_LENGTH)));
}

export function drawDebugCone(origin: Vec3, dir: Vec3, length: number, radius: number, durationSec: number = 5, color: Color = Color.white, logErrors = false) {
    DebugDraw.instance?.showCone(origin, dir, length, radius, durationSec, color, logErrors);
}
