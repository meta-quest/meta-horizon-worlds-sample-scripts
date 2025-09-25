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


import { Quaternion, Vec3 } from 'horizon/core';

// Add them as we need them
export const TIME_UNITS = {
    MILLIS_PER_SECOND: 1000,
    MILLIS_PER_MINUTE: 1000 * 60,
    MILLIS_PER_HOUR: 1000 * 60 * 60,
    MILLIS_PER_DAY: 1000 * 60 * 60 * 24,
    MILLIS_PER_YEAR: 1000 * 60 * 60 * 24 * 365,

    SECONDS_PER_MINUTE: 60,
    SECONDS_PER_HOUR: 60 * 60,
    SECONDS_PER_DAY: 60 * 60 * 24,
    SECONDS_PER_YEAR: 60 * 60 * 24 * 365,

    MINUTES_PER_HOUR: 60,
    MINUTES_PER_DAY: 60 * 24,
    MINUTES_PER_YEAR: 60 * 24 * 365,

    HOURS_PER_DAY: 24,
    HOURS_PER_YEAR: 24 * 365,

    DAYS_PER_WEEK: 7,
    DAYS_PER_YEAR: 365
};

export function getWorldPosFromLocal(localPos: Vec3, center: Vec3, forward: Vec3, up: Vec3, optIsRight: boolean = true) {
    const right = Vec3.mul(Vec3.cross(up, forward), optIsRight ? 1 : -1);
    return Vec3.add(Vec3.add(Vec3.add(center, Vec3.mul(right, localPos.x)), Vec3.mul(up, localPos.y)), Vec3.mul(forward, localPos.z));
}

export function randomRange(minInclusive: number, max: number) {
    return minInclusive + Math.random() * (max - minInclusive);
}

/**
 * The max value is exclusive; To get an equal weighting selection of [1, 2, 3] use randomRangeInt(1, 4)
 */
export function randomRangeInt(minInclusive: number, maxExclusive: number) {
    return Math.floor(randomRange(minInclusive, maxExclusive));
}

export function randomOfTwoNumbers(a: number, b: number) {
    return Math.random() < 0.5 ? a : b;
}

export function clamp(value: number, min: number, max: number) {
    if (value < min) {
        return min;
    } else if (value > max) {
        return max;
    }
    return value;
}

export function clamp01(value: number) {
    return clamp(value, 0.0, 1.0);
}

export function equalsApprox(a: number, b: number, epsilon: number = 0.0001): boolean {
    return Math.abs(a - b) < epsilon;
}

/**
 *
 * @param value1 - one end of the lerp
 * @param value2 - other end of the lerp
 * @param factor - multiplying factor; f(0) = value1, f(1) = value2
 */
export function lerp(value1: number, value2: number, factor: number) {
    return value1 + (value2 - value1) * factor;
}

export function inverseLerp(value: number, min: number, max: number) {
    return (value - min) / (max - min);
}

export function threePointLerp(a: Vec3, b: Vec3, c: Vec3, t: number): Vec3 {
    const aEnd = Vec3.add(a, Vec3.mul(Vec3.sub(b, a), 2.0));
    const bEnd = Vec3.add(c, Vec3.mul(Vec3.sub(b, c), 2.0));
    return Vec3.lerp(Vec3.lerp(a, aEnd, t), Vec3.lerp(bEnd, b, t), t);
}

export function componentLerp(a: Vec3, b: Vec3, t: Vec3): Vec3 {
    return new Vec3(
        lerp(a.x, b.x, t.x),
        lerp(a.y, b.y, t.y),
        lerp(a.z, b.z, t.z)
    );
}

export function interpolateTowardsVec(a: Vec3, b: Vec3, amount: number) {
    return a.add(b.sub(a).mul(amount));
}

export function dist(a: Vec3, b: Vec3) {
    return Vec3.sub(a, b).magnitude();
}

export function sqrDist(a: Vec3, b: Vec3) {
    return Vec3.sub(a, b).magnitudeSquared();
}

export function vecIsZero(vec: Vec3) {
    return vec.x == 0 && vec.y == 0 && vec.z == 0;
}

export function randomVec3(min: Vec3, max: Vec3) {
    return new Vec3(randomRange(min.x, max.x), randomRange(min.y, max.y), randomRange(min.z, max.z));
}

export function isInRange(a: Vec3, b: Vec3, distThreshold: number, minDistTreshold: number = 0) {
    const sqrDistance = sqrDist(a, b);
    return (sqrDistance >= (minDistTreshold * minDistTreshold)) && (sqrDistance <= (distThreshold * distThreshold));
}

export function isSphereInSphere(centerA: Vec3, radiusA: number, centerB: Vec3, radiusB: number) {
    return isInRange(centerA, centerB, radiusA + radiusB);
}

export const DEGREES_TO_RADIANS: number = Math.PI / 180;
export const RADIANS_TO_DEGREES: number = 180 / Math.PI;

// returns angle normalized to the range [0, 360)
export function normalizeAngleDeg(angle: number) {
    return (angle + 360) % 360;
}

// returns angle normalized to the range [0, 2PI)
export function normalizeAngleRad(angle: number) {
    return (angle + 2 * Math.PI) % (2 * Math.PI);
}

// returns rotation between two unit vectors
export function angleBetweenVecsRadians(a: Vec3, b: Vec3) {
    const dot = a.dot(b);
    return dot >= 1.0 ? 0 : Math.acos(a.dot(b));
}

// returns rotation between two vectors projected onto a plane described by the unit vector axis as the plane normal
export function angleBetweenVecsRadiansAroundAxis(a: Vec3, b: Vec3, axis: Vec3 = Vec3.up) {
    const aProj = projectVecOntoPlane(a, axis).normalizeInPlace();
    const bProj = projectVecOntoPlane(b, axis).normalizeInPlace();
    const angle = angleBetweenVecsRadians(aProj, bProj);
    const cross = aProj.cross(bProj);
    return axis.dot(cross) < 0 ? -angle : angle;
}

export function angleOfConeRadians(baseRadius: number, length: number) {
    return Math.atan(baseRadius / length);
}

export function isInAngle(targetPos: Vec3, origin: Vec3, comparativeDirection: Vec3, angleRadians: number) {
    const dirToTargetPos = Vec3.sub(targetPos, origin).normalizeInPlace();
    const angleBetweenVecsRadian = angleBetweenVecsRadians(comparativeDirection, dirToTargetPos);
    return angleBetweenVecsRadian <= angleRadians;
}

export function isInCone(targetPos: Vec3, coneOrigin: Vec3, coneDir: Vec3, radius: number, length: number) {
    const dirToTargetPos = Vec3.sub(targetPos, coneOrigin);
    if (dirToTargetPos.magnitudeSquared() > (length * length)) { // not a flat cone
        return false;
    }

    return isInAngle(targetPos, coneOrigin, coneDir, angleOfConeRadians(radius, length));
}

export function getClosestPointOnLine(pos: Vec3, lineOrigin: Vec3, lineDir: Vec3) {
    const dirToPos = Vec3.sub(pos, lineOrigin);
    return Vec3.add(lineOrigin, projectVec(dirToPos, lineDir));
}

export function isInBeam(pos: Vec3, beamOrigin: Vec3, beamDir: Vec3, radius: number, length: number, showDebug: boolean = false) {
    const dirToPos = Vec3.sub(pos, beamOrigin);
    const dot = Vec3.dot(beamDir, dirToPos.normalize());

    if (showDebug) {
        console.log('Beam - dirToPos', dirToPos, 'dot', dot);
    }

    if (dot <= 0) { // check on same side
        return false;
    }

    const dirProjection = projectVec(dirToPos, beamDir);
    const range = length + radius;
    const sqrRange = range * range;
    const sqrDist = dirProjection.magnitudeSquared();

    if (showDebug) {
        console.log('Beam - dir Proj', dirProjection, 'sqrDistToProj', sqrDist, 'sqrRange', sqrRange);
    }

    if (sqrDist > sqrRange) { // check if within range
        return false;
    }

    const dirToProjection = Vec3.sub(dirToPos, dirProjection);
    const distToProjection = dirToProjection.magnitude();

    if (showDebug) {
        console.log('Beam - distToProjection:', distToProjection, ' radius:', radius);
    }

    if (distToProjection > radius) { // check if within radius
        return false;
    }

    return true;
}

export function isSphereInCone(sphereOrigin: Vec3, sphereRadius: number, coneOrigin: Vec3, coneDir: Vec3, coneRadius: number, coneLength: number) {
    return isInCone(getClosestPointToLineInSphere(coneOrigin, coneDir, sphereOrigin, sphereRadius), coneOrigin, coneDir, coneRadius, coneLength);
}

export function isSphereInBeam(sphereOrigin: Vec3, sphereRadius: number, beamOrigin: Vec3, beamDir: Vec3, beamRadius: number, beamLength: number, showDebug: boolean = false) {
    return isInBeam(getClosestPointToLineInSphere(beamOrigin, beamDir, sphereOrigin, sphereRadius), beamOrigin, beamDir, beamRadius, beamLength, showDebug);
    // TODO: optimize so we're not doing the projection twice
}

function coneRadiusFromHeightAndAngleDegrees(height: number, angleDegrees: number): number {
    if (height <= 0 || angleDegrees <= 0 || angleDegrees >= 90) {
        throw new Error('Invalid input: height must be > 0 and angleDegrees between 0 and 90.');
    }
    const angleRadians = angleDegrees * (Math.PI / 180);
    return height * Math.tan(angleRadians);
}

export function capsuleInCone(capsuleStart: Vec3, capsuleEnd: Vec3, radius: number, coneOrigin: Vec3, coneDirection: Vec3, coneAngle: number, coneLength: number) {
    const coneRadius = coneRadiusFromHeightAndAngleDegrees(coneLength, coneAngle);

    if (
        isSphereInCone(capsuleStart, radius, coneOrigin, coneDirection, coneRadius, coneLength) ||
        isSphereInCone(capsuleStart, radius, coneOrigin, coneDirection, coneRadius, coneLength)
    ) return true;

    const numSamples = 5;
    for (let i = 1; i < numSamples; i++) {
        const lerpFactor = i / numSamples;
        if (isSphereInCone(Vec3.lerp(capsuleStart, capsuleEnd, lerpFactor), radius, coneOrigin, coneDirection, coneRadius, coneLength)) return true;
    }
    return false;
}

export function getClosestPointToLineInSphere(lineOrigin: Vec3, lineDir: Vec3, sphereOrigin: Vec3, sphereRadius: number) {
    const lineOriginToSphereOrigin = Vec3.sub(sphereOrigin, lineOrigin);
    const dirProjection = projectVec(lineOriginToSphereOrigin, lineDir);
    return getClosestPointInSphereTo(Vec3.add(lineOrigin, dirProjection), sphereOrigin, sphereRadius);
    //return sphereOrigin.add(Vec3.mul(Vec3.sub(dirProjection, sphereOrigin).normalize(), sphereRadius));
}

export function getClosestPointInSphereTo(point: Vec3, sphereOrigin: Vec3, sphereRadius: number) {
    const vecToPoint = Vec3.sub(point, sphereOrigin);
    const sqrSphereRadius = sphereRadius * sphereRadius;
    if (vecToPoint.magnitudeSquared() > sqrSphereRadius) {
        return sphereOrigin.add(Vec3.mul(vecToPoint.normalizeInPlace(), sphereRadius));
    }
    // point is inside sphere
    return point;
}

export function projectVec(vec: Vec3, ontoVec: Vec3): Vec3 {
    return ontoVec.normalize().mul(Vec3.dot(vec, ontoVec) / ontoVec.magnitude());
}

// Project a vector onto the plane defined by a normal vector (note: normal need not be a unit vector)
export function projectVecOntoPlane(vec: Vec3, planeNormal: Vec3): Vec3 {
    return vec.sub(projectVec(vec, planeNormal));
}

export function clampVec(vec: Vec3, maxMagnitude: number): Vec3 {
    const mag = vec.magnitude();
    if (mag <= maxMagnitude) {
        return vec;
    }
    return Vec3.mul(vec.normalize(), maxMagnitude);
}

export function clampVecInPlace(vec: Vec3, maxMagnitude: number) {
    const mag = vec.magnitude();
    if (mag <= maxMagnitude) {
        return;
    }
    vec.normalizeInPlace();
    vec.mulInPlace(maxMagnitude);
}

export function calculatePositionOverTime(origin: Vec3, velocity: Vec3, gravity: number, t: number) {
    let pos = origin.clone();
    pos.addInPlace(Vec3.mul(velocity, t));
    pos.y -= 0.5 * gravity * t * t;
    return pos;
}

export function relativeWorldPosToLocalSpace(parentRot: Quaternion, relativePositionWorld: Vec3) {
    const relativePositionLocal = {
        x: relativePositionWorld.x * Math.cos(parentRot.y) - relativePositionWorld.z * Math.sin(parentRot.y),
        y: relativePositionWorld.y,
        z: relativePositionWorld.x * Math.sin(parentRot.y) + relativePositionWorld.z * Math.cos(parentRot.y),
    };
    return relativePositionLocal as Vec3;
}

export function midpointOfTwoVectors(a: Vec3, b: Vec3) {
    return Vec3.div(Vec3.add(a, b), 2);
}

export function getForward(rotation: Quaternion) {
    return Quaternion.mulVec3(rotation, Vec3.forward).normalize();
}

export function getRandomRotation(maxSpread: Vec3) {
    return Quaternion.fromEuler(new Vec3(randomRange(-maxSpread.x, maxSpread.x), randomRange(-maxSpread.y, maxSpread.y), randomRange(-maxSpread.z, maxSpread.z)));
}

// rotate a vector around a normalized axis
export function rotateVecAroundAxis(vec: Vec3, axis: Vec3, angleRadians: number): Vec3 {
    const dot = Vec3.dot(axis, vec);
    const cross = Vec3.cross(axis, vec);
    const cos = Math.cos(angleRadians);
    const sin = Math.sin(angleRadians);
    return axis.mul(dot * (1 - cos)).addInPlace(vec.mul(cos)).addInPlace(cross.mul(sin));
}

// rotates a vector towards another, preserving its magnitude
export function rotateVecTowardsVec(from: Vec3, to: Vec3, byRadians: number): Vec3 {
    const fromN = from.magnitudeSquared() == 1 ? from : from.normalize();
    const toN = to.magnitudeSquared() == 1 ? to : to.normalize();
    const angleBetween = angleBetweenVecsRadians(fromN, toN);
    if (angleBetween < byRadians) {
        return toN.mul(from.magnitude());
    }
    return slerpVecNonNormalized(from, to, byRadians / angleBetween);
}

// slerp two normalized vectors
export function slerpVec(from: Vec3, to: Vec3, t: number): Vec3 {
    const dot = Vec3.dot(from, to);
    if (dot > 0.9995) {
        return Vec3.lerp(from, to, t);
    }
    const theta = Math.acos(dot);
    const sinTheta = Math.sin(theta);
    const fromScale = Math.sin(theta * (1 - t)) / sinTheta;
    const toScale = Math.sin(theta * t) / sinTheta;
    return Vec3.add(from.mul(fromScale), to.mul(toScale));
}

export function slerpVecNonNormalized(from: Vec3, to: Vec3, t: number): Vec3 {
    const fromMag = from.magnitude();
    const toMag = to.magnitude();
    return slerpVec(from.normalize(), to.normalize(), t).mul(lerp(fromMag, toMag, t));
}

export function dotQuaternion(a: Quaternion, b: Quaternion) {
    // There's no Quaternion.dot() method ?!?
    return a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
}

export function angleBetweenQuaternionsRadians(a: Quaternion, b: Quaternion) {
    const dot = dotQuaternion(a, b);
    return Math.acos(2 * dot * dot - 1);
}

export function rotateQuaternionTowards(from: Quaternion, to: Quaternion, byRadians: number) {
    const angleBetween = angleBetweenQuaternionsRadians(from, to);
    if (angleBetween <= byRadians) {
        return to;
    }
    const t = Math.sin(byRadians / 2) / Math.sin(angleBetween / 2);
    return Quaternion.slerp(from, to, t);
}

export enum Swizzle {
    XYZ,
    XZY,
    YXZ,
    YZX,
    ZYX,
    ZXY,
    XY_,
    X_Z,
    _YZ,
    X__,
    _Y_,
    __Z,
}

export function swizzleVec(vec: Vec3, swizzle: Swizzle): Vec3 {
    switch (swizzle) {
        case Swizzle.XYZ:
            return vec;
        case Swizzle.XZY:
            return new Vec3(vec.x, vec.z, vec.y);
        case Swizzle.YXZ:
            return new Vec3(vec.y, vec.x, vec.z);
        case Swizzle.YZX:
            return new Vec3(vec.y, vec.z, vec.x);
        case Swizzle.ZYX:
            return new Vec3(vec.z, vec.y, vec.x);
        case Swizzle.ZXY:
            return new Vec3(vec.z, vec.x, vec.y);
        case Swizzle.XY_:
            return new Vec3(vec.x, vec.y, 0);
        case Swizzle.X_Z:
            return new Vec3(vec.x, 0, vec.z);
        case Swizzle._YZ:
            return new Vec3(0, vec.y, vec.z);
        case Swizzle.X__:
            return new Vec3(vec.x, 0, 0);
        case Swizzle._Y_:
            return new Vec3(0, vec.y, 0);
        case Swizzle.__Z:
            return new Vec3(0, 0, vec.z);
    }
}

export class NumberRange {
    min: number;
    max: number;
    scheme: (min: number, max: number) => number;

    constructor(min: number, max?: number, scheme: ((min: number, max: number) => number) = randomRange) {
        this.min = min;
        this.max = max != undefined ? max : min;
        this.scheme = scheme;
    }

    getValue() {
        if (this.min == this.max) {
            return this.min;
        }
        return this.scheme(this.min, this.max);
    }
}

const hashToStringCache = new Map<bigint, string>();

export function hashString(str: string) {
    str = str.trim().toLowerCase();

    let hash = 0, i, chr;
    if (str.length === 0) return BigInt(0);

    for (i = 0; i < str.length; i++) {
        chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    const bigIntHash = BigInt(hash);
    hashToStringCache.set(bigIntHash, str);
    return bigIntHash;
}

export function getStringFromHash(hash: bigint) {
    return hashToStringCache.get(hash) ?? '{string cache did not include hash}';
}

export class Grid2D<T> {
    cellWidth: number = 0;
    cellHeight: number = 0;

    gridContents = new Map<number, Map<number, T>>(); // <x, <y, value>>

    constructor(cellWidth: number, cellHeight: number) {
        this.cellWidth = cellWidth;
        this.cellHeight = cellHeight;
    }

    getWorldPosFromCell(x: number, y: number) {
        return new Vec3(x * this.cellWidth, y * this.cellHeight, 0);
    }

    setCell(x: number, y: number, value: T) {
        let xMap = this.gridContents.get(x);
        if (!xMap) {
            xMap = new Map<number, T>();
            this.gridContents.set(x, xMap);
        }
        xMap.set(y, value);
    }

    getCell(x: number, y: number) {
        const xMap = this.gridContents.get(x);
        if (!xMap) {
            return undefined;
        }
        return xMap.get(y);
    }
}

export function chooseFromWeightedValues<T>(pool: Map<T, number>) {
    let cumulativeSum = 0;
    const cumulativeWeights: [T, number][] = [];
    pool.forEach((weight, item) => {
        cumulativeSum += weight;
        cumulativeWeights.push([item, cumulativeSum]);
    });

    const randWeight = randomRange(0, cumulativeSum);

    for (let i = 0; i < cumulativeWeights.length; i++) {
        const [item, cumulativeWeight] = cumulativeWeights[i];
        if (randWeight <= cumulativeWeight) return item;
    }
    throw Error('This should never happen');
}
