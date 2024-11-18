// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

/**
 * Contains helper classes for advanced Math functions
 */
import { Quaternion, Vec3 } from "horizon/core";

export const Deg2Rad: number = Math.PI / 180;   //mutiply by this to convert degrees to radians
export const Rad2Deg: number = 180 / Math.PI;   //mutiply by this to convert radians to degrees

export function acuteAngleBetweenVecs(v1: Vec3, v2: Vec3): number {
  return Math.acos(v1.dot(v2));
}

export function getClockwiseAngle(v1: Vec3, v2: Vec3): number {
  let dot = v1.x * v2.x + v1.z * v2.z;      // dot product
  let det = v1.x * v2.z - v1.z * v2.x;      // determinant
  let angle = Math.atan2(det, dot);         // atan2(y, x) or atan2(sin, cos)
  // atan2 returns counterclockwise angles from -180 to 180,
  // so convert to clockwise and make sure it's from 0 to 360
  angle = (-angle + (2 * Math.PI)) % (2 * Math.PI);
  return angle;
}

export function getForward(rotation: Quaternion): Vec3 {
  return Quaternion.mulVec3(rotation, Vec3.forward).normalize();
}
