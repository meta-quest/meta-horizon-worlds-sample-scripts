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
import * as UtilsMath from 'UtilsMath';
import { DEGREES_TO_RADIANS, rotateVecAroundAxis } from 'UtilsMath';

export class SpreadPatterns {
    /** Naive random spread - square-ish pattern clustered around the center */
    public static DefaultSpread = (horizontalSpreadRadius: number, verticalSpreadRadius: number) =>
        new DefaultSpreadPattern(horizontalSpreadRadius, verticalSpreadRadius);

    /** Spread bullets evenly across a horizontal plane, the distance */
    public static HorizontalSpread = (minDegreesBetweenBullets: number, maxDegreesBetweenBullets: number) =>
        new HorizontalSpreadPattern(minDegreesBetweenBullets, maxDegreesBetweenBullets);

    /** Circular spread pattern with bullets spread fairly evenly around a circle
     *  angleVariance: how far from their initial spot can bullets move around the circle - a value of 0 here means all bullets will have angular uniformity
     *  minRadius-maxRadius: how far from the center of the reticle will the bullet be placed - if minRadius=maxRadius then all bullets will have uniform distance from the center
     */
    public static UniformCircularSpread = (angleVarianceRadians: number, minRadiusRadians: number, maxRadiusRadians: number) =>
        new UniformCircularSpread(angleVarianceRadians, minRadiusRadians, maxRadiusRadians);

    /** Circular spread pattern with bullets spread randomly around a circle
     *  minRadius-maxRadius: how far from the center of the reticle will the bullet be placed - if minRadius=maxRadius then all bullets will have uniform distance from the center
     */
    public static NonuniformCircularSpread = (minRadiusRadians: number, maxRadiusRadians: number) =>
        new NonUniformCircularSpread(minRadiusRadians, maxRadiusRadians);
}

export interface ISpreadPattern {
    getSpread(numBullets: number, forward: Vec3, up: Vec3, right: Vec3): Vec3[];
}

abstract class BaseSpreadPattern implements ISpreadPattern {
    // We keep a reusable array to reduce garbage
    public spreadPattern: Vec3[] = [];

    public getSpread(numBullets: number, forward: Vec3, up: Vec3, right: Vec3): Vec3[] {
        this.spreadPattern.length = numBullets;
        if (numBullets <= 0) {
            return this.spreadPattern;
        }
        this.generateSpreadPattern(numBullets, forward, up, right);
        return this.spreadPattern;
    }

    protected abstract generateSpreadPattern(numBullets: number, forward: Vec3, up: Vec3, right: Vec3): void;
}

class DefaultSpreadPattern extends BaseSpreadPattern {
    constructor(
        private horizontalSpreadRadius: number,
        private verticalSpreadRadius?: number,
    ) { super(); }

    protected generateSpreadPattern(numBullets: number, forward: Vec3, up: Vec3, right: Vec3) {
        for (let i = 0; i < numBullets; i++) {
            this.spreadPattern[i] = this.getRandomSpreadDirection(forward, up, right);
        }
    }

    private getRandomSpreadDirection(forward: Vec3, up: Vec3, right: Vec3): Vec3 {
        const horizontalSpreadRadius = this.horizontalSpreadRadius;
        const verticalSpreadRadius = this.verticalSpreadRadius ?? horizontalSpreadRadius;
        const spreadDir = forward.clone();

        const hRot = Quaternion.fromAxisAngle(up, UtilsMath.randomRange(-horizontalSpreadRadius / 2, horizontalSpreadRadius / 2) * UtilsMath.DEGREES_TO_RADIANS);
        spreadDir.addInPlace(Quaternion.mulVec3(hRot, spreadDir));

        const vRot = Quaternion.fromAxisAngle(right, UtilsMath.randomRange(-verticalSpreadRadius / 2, verticalSpreadRadius / 2) * UtilsMath.DEGREES_TO_RADIANS);
        spreadDir.addInPlace(Quaternion.mulVec3(vRot, spreadDir));

        spreadDir.normalizeInPlace();
        return spreadDir;
    }
}

class HorizontalSpreadPattern extends BaseSpreadPattern {
    constructor(
        private minDegreesBetweenBullets: number,
        private maxDegreesBetweenBullets: number,
    ) { super(); }

    protected generateSpreadPattern(numBullets: number, forward: Vec3, up: Vec3, right: Vec3) {
        const numBulletsIsEven = numBullets % 2 == 0;

        const numIterations = Math.floor(numBullets / 2);

        let cumulativeDeg = 0;
        for (let i = 1; i < numIterations; i++) {
            const angle = UtilsMath.randomRange(this.minDegreesBetweenBullets, this.maxDegreesBetweenBullets) * i * DEGREES_TO_RADIANS;
            cumulativeDeg += angle;
            this.spreadPattern[i] = rotateVecAroundAxis(forward, up, cumulativeDeg);
            this.spreadPattern[i + 1] = rotateVecAroundAxis(forward, up, -cumulativeDeg);
        }
        if (!numBulletsIsEven) {
            this.spreadPattern[numBullets - 1] = forward;
        }
    }
}

class UniformCircularSpread extends BaseSpreadPattern {
    constructor(
        private maxAngularVariance: number,
        private minRadius: number,
        private maxRadius: number,
    ) { super(); }

    protected generateSpreadPattern(numBullets: number, forward: Vec3, up: Vec3, right: Vec3) {
        this.calculateSpreadDirections(numBullets, forward, right);
    }

    private calculateSpreadDirections(numBullets: number, forward: Vec3, right: Vec3) {
        const anglePerBullet = 2*Math.PI / numBullets;
        let startAngle = UtilsMath.randomRange(0, Math.PI);
        for (let i = 0; i < numBullets; i++) {
            const variance = UtilsMath.randomRange(-this.maxAngularVariance/2, this.maxAngularVariance) * DEGREES_TO_RADIANS;
            const angleOfBullet = startAngle + variance + anglePerBullet * i;
            const r = UtilsMath.randomRange(this.minRadius, this.maxRadius) * DEGREES_TO_RADIANS;
            const rVec = UtilsMath.rotateVecAroundAxis(forward, right, r);
            this.spreadPattern[i] = UtilsMath.rotateVecAroundAxis(rVec, forward, angleOfBullet);
        }
    }
}

class NonUniformCircularSpread extends BaseSpreadPattern {
    private angularDistribution: number[] = [];

    constructor(
        private minRadius: number,
        private maxRadius: number,
    ) { super(); }

    protected generateSpreadPattern(numBullets: number, forward: Vec3, up: Vec3, right: Vec3) {
        this.generateSpreadDistribution(numBullets);
        this.calculateSpreadDirections(numBullets, forward, right);
    }

    // Generate an array of numbers such that the sum of the values of the array is 1
    private generateSpreadDistribution(size: number) {
        this.angularDistribution.length = size;
        // Create random values
        for (let i = 0; i < size; i++) {
            const value = UtilsMath.randomRange(0, 1);
            this.angularDistribution[i] = value / size;
        }
    }

    private calculateSpreadDirections(numBullets: number, forward: Vec3, right: Vec3) {
        let startAngle = UtilsMath.randomRange(0, 2*Math.PI);
        for (let i = 0; i < numBullets; i++) {
            const angleInDistribution = this.angularDistribution[i] * 2 * Math.PI;
            const angleOfBullet = startAngle + angleInDistribution;
            startAngle += angleInDistribution;
            const r = UtilsMath.randomRange(this.minRadius, this.maxRadius) * DEGREES_TO_RADIANS;
            const rVec = UtilsMath.rotateVecAroundAxis(forward, right, r);
            this.spreadPattern[i] = UtilsMath.rotateVecAroundAxis(rVec, forward, angleOfBullet);
        }
    }
}
