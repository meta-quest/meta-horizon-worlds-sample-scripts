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

import { Entity, LocalEvent, MaterialAsset, NetworkEvent, PersistentSerializableState, Player } from 'horizon/core';

//** OBJECT SPAWNING */
export const onPlayerObjSpawned = new LocalEvent<{player: Player}>('onPlayerObjSpawned');
export const assignAsset = new LocalEvent<{expectedPreviousOwner: Player, nextOwner: Player}>('assignAsset');
export type OnAssetCompleteType = {requireAssignBackToServer?: boolean};
export const assignAssetComplete = new NetworkEvent<OnAssetCompleteType>('assignAssetComplete');
export const localAssignAssetComplete = new LocalEvent<OnAssetCompleteType>('localAssignAssetComplete');
export const localUnassignAsset = new LocalEvent<{}>('localUnassignAsset');

export const enableBypassSetPlayerRateLimit = new LocalEvent<{player: Player}>('enableBypassSetPlayerRateLimit');
export const disableBypassSetPlayerRateLimit = new LocalEvent<{player: Player}>('disableBypassSetPlayerRateLimit');

export type SetWeaponMaterialData = {
    entity: Entity,
    assetBundleEntity: Entity,
    skinAsset: MaterialAsset
}
export const setWeaponMaterial = new LocalEvent<SetWeaponMaterialData>('setWeaponMaterial');

//** PVAR */
export const setPlayerVariable = new LocalEvent<{player: Player, pVarKey: string, data: PersistentSerializableState, useCompression: boolean}>('setPlayerVariable');
export const onSetPlayerVariable = new LocalEvent<{pVarKey: string, data: PersistentSerializableState}>('onSetPlayerVariable');
