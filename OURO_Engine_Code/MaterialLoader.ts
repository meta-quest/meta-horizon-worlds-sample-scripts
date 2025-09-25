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

import { setWeaponMaterial, SetWeaponMaterialData } from 'EventsCore';
import { Component, Entity } from 'horizon/core';
import { AssetBundleGizmo } from 'horizon/unity_asset_bundles';
import { exists } from 'UtilsGameplay';

// These values need to be kept in sync with the values defined by the art team. These need to be exported in the Unity Asset Bundles
const EXPORTED_UNITY_MESH_IDS = [
    'Mesh_LOD0',
    'Mesh_LOD1',
    'Mesh_LOD2',
];

const RETRY_DELAY_MILLISECONDS = 1000;
const MAX_RETRY_ATTEMPTS = 10;

export class MaterialLoader extends Component<typeof MaterialLoader> {
    currentWeaponMaterials = new Map<Entity, SetWeaponMaterialData>();

    preStart(): void {
        this.connectLocalBroadcastEvent(setWeaponMaterial, (data) => {
            this.setWeaponMaterial(data);
        });
    }

    private retrySetWeaponMaterial(data: SetWeaponMaterialData, attemptCount: number) {
        if (attemptCount > MAX_RETRY_ATTEMPTS) {
            console.warn(`Unable to set skin after ${MAX_RETRY_ATTEMPTS} attempts - ${data.entity.name.get()}`);
            return;
        }

        console.warn(`Set skin attempt ${attemptCount} - ${data.entity.name.get()}`);
        this.async.setTimeout(() => {
            this.setWeaponMaterial(data, attemptCount);
        }, RETRY_DELAY_MILLISECONDS);
    }

    private setWeaponMaterial(data: SetWeaponMaterialData, attemptCount: number = 0) {
        if (!exists(data.entity) || !exists(data.assetBundleEntity)) {
            throw new Error('Unable to set skin - entity or assetBundleEntity does not exist');
        }

        const assetBundleGizmo = data.assetBundleEntity.as(AssetBundleGizmo);
        if (!assetBundleGizmo) {
            throw new Error(`Unable to set skin - failed to cast assetBundleEntity to gizmo - ${data.entity.name.get()}`);
        }

        if (!assetBundleGizmo.isLoaded()) {
            console.warn(`Unable to set skin - assetBundleEntity is not loaded - ${data.entity.name.get()} - will retry`);
            this.retrySetWeaponMaterial(data, attemptCount + 1);
            return;
        }

        for (const referenceId of EXPORTED_UNITY_MESH_IDS) {
            const reference = assetBundleGizmo.getReference(referenceId, false);
            if (!reference.isLoaded()) {
                console.warn(`Unable to set skin - reference ${referenceId} is not loaded - ${data.entity.name.get()} - will retry`);
                this.retrySetWeaponMaterial(data, attemptCount + 1);
                return;
            }
            reference.setMaterial(data.skinAsset);
        }

        this.currentWeaponMaterials.set(data.entity, data);
    }

    start(): void {
    }
}

Component.register(MaterialLoader);
