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

import { Color, Component, Entity, Quaternion, Vec3, World } from "horizon/core";

enum ValueType {
    UNKNOWN,
    NUMBER,
    VEC3,
    QUATERNION,
    COLOR
}

type validTypes = number | Vec3 | Color | Quaternion;

class AnimationInfo {
    fromValue: validTypes;
    toValue: validTypes;
    overMs: number;
    valueType: ValueType;
    startTime: number;
    endTime: number;
    complete: boolean = false;
    easing: (t: number) => number;
    callback: (value: validTypes, pctComplete: number) => void;

    constructor(_from: validTypes, _to: validTypes, _overMs: number, callback: (value: validTypes, pctComplete: number) => void, easing: (t: number) => number = Easing.linear) {
        this.fromValue = _from;
        this.toValue = _to;
        this.overMs = _overMs;
        this.easing = easing;
        this.callback = callback;
        this.startTime = Date.now();
        this.endTime = this.startTime + this.overMs;
        const valTypeName = this.fromValue.constructor.name;
        this.valueType = (typeof (this.fromValue) == 'number') ? ValueType.NUMBER :
            (valTypeName == 'Vec3') ? ValueType.VEC3 :
                (valTypeName == 'Quaternion') ? ValueType.QUATERNION :
                    (valTypeName == 'Color') ? ValueType.COLOR : ValueType.UNKNOWN;
    }
}

type EntityAnim = {
    entity: Entity,
    animID: string,
}

//todo add callback for complete, and cancelled
export class AnimationManager {
    public animations: Record<string, AnimationInfo> = {};
    private moveTos: Record<string, EntityAnim> = {};
    private scaleTos: Record<string, EntityAnim> = {};
    private rotateTos: Record<string, EntityAnim> = {};
    private colorTos: Record<string, EntityAnim> = {};

    public animateTo(fromValue: validTypes, toValue: validTypes, overMs: number, callback: (value: validTypes, pctComplete: number) => void, easing: (t: number) => number = Easing.linear): string {
        const animInfo = new AnimationInfo(fromValue, toValue, overMs, callback, easing);
        const id = this.makeid(16);
        this.animations[id] = animInfo;
        return id;
    }

    //color animations
    public colorBy(entity: Entity, relativeColor: Color, overMs: number, onComplete: () => void = () => {
    }, easing: (t: number) => number = Easing.linear) {
        this.colorTo(entity, Color.add(relativeColor, entity.color.get()), overMs, onComplete, easing);
    }

    public colorTo(entity: Entity, toColor: Color, overMs: number, onComplete: () => void = () => {
    }, easing: (t: number) => number = Easing.linear) {
        let entityAnim = this.colorTos[entity.id.toString()];
        if (entityAnim != undefined) {
            this.cancel(entityAnim.animID);
            console.log(`cancelling ${entityAnim.entity.id}`);
            delete this.colorTos[entity.id.toString()];
            onComplete();
        }

        return this.animateTo(entity.color.get().clone(), toColor, overMs, (value, pctComplete: number) => {
            entity.color.set(value as Color);
            if (pctComplete == 1) {
                onComplete();
            }
        }, easing);
    }

    //rotation animations
    public rotateBy(entity: Entity, relativeRotation: Quaternion, overMs: number, onComplete: () => void = () => {
    }, easing: (t: number) => number = Easing.linear) {
        return this.rotateTo(entity, Quaternion.mul(relativeRotation, entity.rotation.get()), overMs, onComplete, easing);
    }

    public rotateTo(entity: Entity, toRotation: Quaternion, overMs: number, onComplete: () => void = () => {
    }, easing: (t: number) => number = Easing.linear) {
        let entityAnim = this.rotateTos[entity.id.toString()];
        if (entityAnim != undefined) {
            this.cancel(entityAnim.animID);
            console.log(`cancelling ${entityAnim.entity.id}`);
            delete this.rotateTos[entity.id.toString()];
            onComplete();
        }
        return this.animateTo(entity.rotation.get().clone(), toRotation, overMs, (value, pctComplete: number) => {
            entity.rotation.set(value as Quaternion);
            if (pctComplete == 1) {
                onComplete();
            }
        }, easing);
    }

    //move animations
    public moveBy(entity: Entity, relativePosition: Vec3, overMs: number, onComplete: () => void = () => {
    }, easing: (t: number) => number = Easing.linear) {
        return this.moveTo(entity, Vec3.add(relativePosition, entity.position.get()), overMs, onComplete, easing);
    }

    public moveTo(entity: Entity, toPosition: Vec3, overMs: number, onComplete: () => void = () => {
    }, easing: (t: number) => number = Easing.linear) {
        let entityAnim = this.moveTos[entity.id.toString()];
        if (entityAnim != undefined) {
            this.cancel(entityAnim.animID);
            console.log(`cancelling ${entityAnim.entity.id}`);
            delete this.moveTos[entity.id.toString()];
            onComplete();
        }
        return this.animateTo(entity.position.get().clone(), toPosition, overMs, (value, pctComplete: number) => {
            entity.position.set(value as Vec3);
            if (pctComplete == 1) {
                onComplete();
            }
        }, easing);
    }

    public scaleTo(entity: Entity, toScale: Vec3, overMs: number, onComplete: () => void = () => {
    }, easing: (t: number) => number = Easing.linear) {
        let entityAnim = this.scaleTos[entity.id.toString()];
        if (entityAnim != undefined) {
            this.cancel(entityAnim.animID);
            console.log(`cancelling ${entityAnim.entity.id}`);
            delete this.scaleTos[entity.id.toString()];
            onComplete();
        }
        return this.animateTo(entity.scale.get().clone(), toScale, overMs, (value, pctComplete: number) => {
            entity.scale.set(value as Vec3);
            if (pctComplete == 1) {
                onComplete();
            }
        }, easing);
    }

    isValid(animationiD: string) {
        if (this.animations[animationiD] == null) {
            return false;
        } else {
            return true;
        }
    }

    cancel(animationId: string) {
        this.animations[animationId].complete = true;
    }

    update() {
        //if (Object.keys(this.animations).length > 0) console.log(`animation record length is ${animsLength}`);
        Object.keys(this.animations).forEach((key: string) => {
            const animation = this.animations[key];
            const elapsed = Date.now() - animation.startTime;
            let pct = Math.min(elapsed / animation.overMs, 1);
            let t = animation.easing(pct);
            //console.log(`update() elapsed time is ${elapsed} and pct is ${pct}`);
            if (!animation.complete) {
                //calculate
                switch (animation.valueType) {
                    case ValueType.NUMBER:
                        this.calcNumber(animation, t);
                        break;
                    case ValueType.VEC3:
                        this.calcVec3(animation, t);
                        break;
                    case ValueType.COLOR:
                        this.calcColor(animation, t);
                        break;
                    case ValueType.QUATERNION:
                        this.calcQuaternion(animation, t);
                        break;
                    case ValueType.UNKNOWN:
                        //console.log(`value type unknown, pct = ${pct}`);
                        break;
                }
            } else {
                //remove
                delete this.animations[key];
            }
            if (pct == 1) {
                animation.complete = true;
            }
        });
    }

    private calcNumber(animation: AnimationInfo, pct: number) {
        const _from = animation.fromValue as number;
        const _to = animation.toValue as number;
        const result = _from + ((_to - _from) * pct);
        animation.callback(result, pct);
    }

    private calcVec3(animation: AnimationInfo, pct: number) {
        const _from = animation.fromValue as Vec3;
        const _to = animation.toValue as Vec3;
        const result = Vec3.add(_from, Vec3.mul((Vec3.sub(_to, _from)), pct));
        //const result = _from.add((_to.sub(_from)).mul(pct));
        animation.callback(result, pct);
    }

    private calcColor(animation: AnimationInfo, pct: number) {
        const _from = animation.fromValue as Color;
        const _to = animation.toValue as Color;
        const result = Color.add(_from, Color.mul((Color.sub(_to, _from)), pct));
        //const result = _from.add((_to.sub(_from)).mul(pct));
        animation.callback(result, pct);
    }

    //https://www.anycodings.com/1questions/2083501/how-to-lerp-between-two-quaternions
    private calcQuaternion(animation: AnimationInfo, pct: number) {
        const _from = animation.fromValue as Quaternion;
        let _to = animation.toValue as Quaternion;
        // negate second quat if dot product is negative
        const l2 = this.dot(_from, _to);
        if (l2 < 0) {
            _to = this.negate(_to);
        }
        const result = new Quaternion(0, 0, 0, 0);
        result.x = _from.x - pct * (_from.x - _to.x);
        result.y = _from.y - pct * (_from.y - _to.y);
        result.z = _from.z - pct * (_from.z - _to.z);
        result.w = _from.w - pct * (_from.w - _to.w);
        animation.callback(result, pct);
    }

    private dot(a: Quaternion, b: Quaternion): number {
        return a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
    }

    private negate(a: Quaternion) {
        return new Quaternion(-a.x, -a.y, -a.z, -a.w);
    }

    private makeid(length: number) {
        let result = '';
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let charactersLength = characters.length;
        for (var i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }
}

export const GlobalAnimationManager = new AnimationManager();

// -------- Component that drives the update loop --------------
//const updateEvent = new CodeBlockEvent<[]>('updateEvent', []);
class AnimationLoop extends Component<typeof AnimationLoop> {
    static propsDefinition = {};

    preStart() {
        super.preStart();

        this.connectLocalBroadcastEvent(World.onUpdate, (data) => {
            GlobalAnimationManager.update();
        });
    }

    start() {
    }
}

Component.register(AnimationLoop, 'Animation Loop');

export const Easing = {
    linear: (t: number) => t,

    // Accelerates fast, then slows quickly towards end.
    quadratic: (t: number) => t * (-(t * t) * t + 4 * t * t - 6 * t + 4),

    // Overshoots over 1 and then returns to 1 towards end.
    cubic: (t: number) => t * (4 * t * t - 9 * t + 6),

    // Overshoots over 1 multiple times - wiggles around 1.
    elastic: (t: number) => t * (33 * t * t * t * t - 106 * t * t * t + 126 * t * t - 67 * t + 15),

    // Accelerating from zero velocity
    inQuad: (t: number) => t * t,

    // Decelerating to zero velocity
    outQuad: (t: number) => t * (2 - t),

    // Acceleration until halfway, then deceleration
    inOutQuad: (t: number) => t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t,

    // Accelerating from zero velocity
    inCubic: (t: number) => t * t * t,

    // Decelerating to zero velocity
    outCubic: (t: number) => (--t) * t * t + 1,

    // Acceleration until halfway, then deceleration
    inOutCubic: (t: number) => t < .5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

    // Accelerating from zero velocity
    inQuart: (t: number) => t * t * t * t,

    // Decelerating to zero velocity
    outQuart: (t: number) => 1 - (--t) * t * t * t,

    // Acceleration until halfway, then deceleration
    inOutQuart: (t: number) => t < .5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,

    // Accelerating from zero velocity
    inQuint: (t: number) => t * t * t * t * t,

    // Decelerating to zero velocity
    outQuint: (t: number) => 1 + (--t) * t * t * t * t,

    // Acceleration until halfway, then deceleration
    inOutQuint: (t: number) => t < .5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t,

    // Accelerating from zero velocity
    inSine: (t: number) => -Math.cos(t * (Math.PI / 2)) + 1,

    // Decelerating to zero velocity
    outSine: (t: number) => Math.sin(t * (Math.PI / 2)),

    // Accelerating until halfway, then decelerating
    inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,

    // Exponential accelerating from zero velocity
    inExpo: (t: number) => Math.pow(2, 10 * (t - 1)),

    // Exponential decelerating to zero velocity
    outExpo: (t: number) => -Math.pow(2, -10 * t) + 1,

    // Exponential accelerating until halfway, then decelerating
    inOutExpo: (t: number) => {
        t /= .5;
        if (t < 1) {
            return Math.pow(2, 10 * (t - 1)) / 2;
        }
        t--;
        return (-Math.pow(2, -10 * t) + 2) / 2;
    },

    // Circular accelerating from zero velocity
    inCirc: (t: number) => -Math.sqrt(1 - t * t) + 1,

    // Circular decelerating to zero velocity Moves VERY fast at the beginning and
    // then quickly slows down in the middle. This tween can actually be used
    // in continuous transitions where target value changes all the time,
    // because of the very quick start, it hides the jitter between target value changes.
    outCirc: (t: number) => Math.sqrt(1 - (t = t - 1) * t),

    // Circular acceleration until halfway, then deceleration
    inOutCirc: (t: number) => {
        t /= .5;
        if (t < 1) {
            return -(Math.sqrt(1 - t * t) - 1) / 2;
        }
        t -= 2;
        return (Math.sqrt(1 - t * t) + 1) / 2;
    },

    inBack: (t: number) => {
        const s = 1.70158;
        return t * t * ((s + 1) * t - s);
    },

    outBack: (t: number) => {
        const s = 1.70158;
        return ((t = t - 1) * t * ((s + 1) * t + s) + 1);
    },

    inOutBack: (t: number) => {
        let s = 1.70158;
        if ((t /= 0.5) < 1) {
            return 0.5 * (t * t * (((s *= (1.525)) + 1) * t - s));
        }
        return 0.5 * ((t -= 2) * t * (((s *= (1.525)) + 1) * t + s) + 2);
    }
};
