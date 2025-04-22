// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

// CREATOR LEVEL: <Beginner>

import { Asset, Entity, Quaternion, TextureAsset, Vec3 } from 'horizon/core';
import { Image, ImageSource, ImageStyle } from 'horizon/ui';

export function generateGuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0,
    v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export class UITexture {
  static fromAsset(asset: Asset, style: ImageStyle, versionId? : number | undefined) {
    return this.fromAssetId(asset.id.toString(), style, versionId);
  }

  static fromAssetId(assetId: string, style: ImageStyle, versionId? : number | undefined) {
    return Image({
      source: ImageSource.fromTextureAsset(new TextureAsset(BigInt(assetId), versionId ? BigInt(versionId) : BigInt(0))),
      style: style,
    });
  }
}

export class EntityTransformer {
  private static translationOps: Map<string, { entity: Entity, initPosition: Vec3, translation: Vec3, time: number, elapsedTime: number }> = new Map();
  private static rotationOps: Map<string, { entity: Entity, initRotation: Quaternion, rotation: Quaternion, time: number, elapsedTime: number }> = new Map();
  private static scaleOps: Map<string, { entity: Entity, initScale: Vec3, scale: Vec3, time: number, elapsedTime: number }> = new Map();

  public static translateBy(entity: Entity, translation: Vec3, time: number) {
    const translationId = generateGuid();

    this.translationOps.set(translationId, { entity: entity, initPosition: entity.position.get(), translation: translation, time: time, elapsedTime: 0 });
    return { translationId: translationId, rotationId: "", scaleId: "" };
  }

  public static rotateBy(entity: Entity, rotation: Quaternion, time: number) {
    const rotationId = generateGuid();

    this.rotationOps.set(rotationId, { entity: entity, initRotation: entity.rotation.get(), rotation: rotation, time: time, elapsedTime: 0 });

    return { translationId: "", rotationId: rotationId, scaleId: "" };
  }

  public static scaleBy(entity: Entity, scale: Vec3, time: number) {
    const scaleId = generateGuid();

    const scaleDelta = entity.scale.get().componentMul(scale).sub(entity.scale.get());
    this.scaleOps.set(scaleId, { entity: entity, initScale: entity.scale.get(), scale: scaleDelta, time: time, elapsedTime: 0 });

    return { translationId: "", rotationId: "", scaleId: scaleId };
  }

  public static transformBy(entity: Entity, translation: Vec3, rotation: Quaternion, scale: Vec3, time: number) {
    const translationToken = this.translateBy(entity, translation, time);
    const rotationToken = this.rotateBy(entity, rotation, time);
    const scaleToken = this.scaleBy(entity, scale, time);

    return { translationId: translationToken.translationId, rotationId: rotationToken.rotationId, scaleId: scaleToken.scaleId };
  }

  public static translateTo(entity: Entity, position: Vec3, time: number) {
    return this.translateBy(entity, position.sub(entity.position.get()), time);
  }

  public static rotateTo(entity: Entity, rotation: Quaternion, time: number) {
    return this.rotateBy(entity, rotation.mul(entity.rotation.get().inverse()), time);
  }

  public static scaleTo(entity: Entity, scale: Vec3, time: number) {
    const scaleId = generateGuid();

    const scaleDelta = scale.sub(entity.scale.get());
    this.scaleOps.set(scaleId, { entity: entity, initScale: entity.scale.get(), scale: scaleDelta, time: time, elapsedTime: 0 });

    return { translationId: "", rotationId: "", scaleId: scaleId };
  }

  public static transformTo(entity: Entity, position: Vec3, rotation: Quaternion, scale: Vec3, time: number) {
    const translationToken = this.translateTo(entity, position, time);
    const rotationToken = this.rotateTo(entity, rotation, time);
    const scaleToken = this.scaleTo(entity, scale, time);

    return { translationId: translationToken.translationId, rotationId: rotationToken.rotationId, scaleId: scaleToken.scaleId };
  }

  public static update(timeDelta: number) {
    this.translationOps.forEach((op, id) => {
      op.elapsedTime += timeDelta;

      if (op.elapsedTime >= op.time) {
        op.entity.position.set(op.initPosition.add(op.translation));
        this.translationOps.delete(id);
      } else {
        op.entity.position.set(op.initPosition.add(op.translation.mul(op.elapsedTime / op.time)));
      }
    });

    this.rotationOps.forEach((op, id) => {
      op.elapsedTime += timeDelta;
      if (op.elapsedTime >= op.time) {
        op.entity.rotation.set(op.rotation.mul(op.initRotation));
        this.rotationOps.delete(id);
      } else {
        op.entity.rotation.set(Quaternion.slerp(op.initRotation, op.rotation.mul(op.initRotation), op.elapsedTime / op.time));
      }
    });

    this.scaleOps.forEach((op, id) => {
      op.elapsedTime += timeDelta;
      if (op.elapsedTime >= op.time) {
        op.entity.scale.set(op.initScale.add(op.scale));
        this.scaleOps.delete(id);
      } else {
        op.entity.scale.set(op.initScale.add(op.scale.mul(op.elapsedTime / op.time)));
      }
    });
  }

  public static cancel(token: { translationId: string, rotationId: string, scaleId: string }) {
    if (token.translationId !== "") {
      this.translationOps.delete(token.translationId);
    }
    if (token.rotationId !== "") {
      this.rotationOps.delete(token.rotationId);
    }
    if (token.scaleId !== "") {
      this.scaleOps.delete(token.scaleId);
    }
  }
}
