// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

// CREATOR LEVEL: <<Intermediate>>

// [See Chop 'n' pop for usage example]

import { Singleton } from 'Singleton';
import { Asset, Component, Entity, Quaternion, Vec3 } from 'horizon/core';
import { RuntimeConfigStore } from 'RuntimeConfigStore';

class CuePosition {
  entity: Entity;
  position: Vec3;
  rotation: Quaternion;
  disabled: boolean = false;

  constructor(entity: Entity, position: Vec3, rotation: Quaternion) {
    this.entity = entity;
    this.position = position;
    this.rotation = rotation;
  }
}

export class SceneManager extends Singleton<typeof SceneManager> {
  static propsDefinition = {};

  private cuePositions: Map<string, CuePosition>;
  private spawnedElements: Set<Entity>;
  private garbageCollectOnReset: Set<Entity>;

  // Singleton instance of SceneManager
  static instance: SceneManager;

  constructor() {
    super();
    SceneManager.instance = this;
    this.cuePositions = new Map<string, CuePosition>;
    this.spawnedElements = new Set<Entity>;
    this.garbageCollectOnReset = new Set<Entity>;
  }

  public spawnSceneElement(sceneAsset: Asset, position: Vec3, rotation: Quaternion, persistOnReset: boolean) {
    if (sceneAsset == undefined) {
      return;
    }

    this.world.spawnAsset(sceneAsset, position, rotation).then
    (spawnedSceneElements => {
      if (spawnedSceneElements.length > 0 && spawnedSceneElements[0] != undefined) {
        const sceneElement = spawnedSceneElements[0];
        this.spawnedElements.add(sceneElement);

        const assetConfig = RuntimeConfigStore.getInstance().getAssetConfig(sceneAsset);
        if (assetConfig != undefined) {
          assetConfig.apply(sceneElement);
        }

        if (persistOnReset) {
          this.addSceneElement(sceneElement, position, rotation);
        } else {
          this.garbageCollectOnReset.add(sceneElement);
        }
      } else {
        console.error("Failed to spawn scene element: " + sceneAsset.toString());
      }
    });
  }

  public addSceneElement(entity: Entity, position: Vec3, rotation: Quaternion) {
    if (!this.cuePositions.has(entity.id.toString())) {
      this.cuePositions.set(entity.id.toString(), new CuePosition(entity, position, rotation));
    }
    else {
      this.cuePositions.get(entity.id.toString())!.disabled = false;
    }
  }

  public disableElementReset(entity: Entity) {
    // Manually disable the reset for an entity if we don't want it to reset while on the server
    if (this.cuePositions.has(entity.id.toString())) {
      this.cuePositions.get(entity.id.toString())!.disabled = true;
    }
  }

  public resetScene() {
    // Only acts on the server, so if an entity is owned by a client, it will not be reset
    this.cuePositions.forEach((cuePosition) => {
      if (!cuePosition.disabled) {
        cuePosition.entity.position.set(cuePosition.position);
        cuePosition.entity.rotation.set(cuePosition.rotation);
      }
    });

    this.garbageCollectOnReset.forEach((entity) => {
      this.spawnedElements.delete(entity);
      this.world.deleteAsset(entity);
    });
    this.garbageCollectOnReset.clear();
  }
}
Component.register(SceneManager);
