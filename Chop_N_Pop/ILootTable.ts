// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

import { Entity, Quaternion, Vec3 } from "horizon/core";

export interface ILootTable {
  shouldDropItem(): boolean;
  dropRandomItem(position : Vec3, rotation : Quaternion): void;
  clearItem(item : Entity) : void;
  clearItems() : void;
}
