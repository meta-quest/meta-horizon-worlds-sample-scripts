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

import { HOLSTER_SLOT_DATA_DEFAULT } from 'ConstsHolster';
import * as ConstsLoadout from 'ConstsLoadout';
import { CAMERA_KICKBACK_ANIMATION_DEFAULT, FiringScheme, FIRING_DATA_DEFAULT, GrabScheme, SCREENS_TARGETING_CONFIG_DEFAULT, WeaponData, WEAPON_DATA_DEFAULT, WEAPON_DATA_REGISTRY } from 'ConstsWeapon';
import { TargetScheme } from 'EventData';
import { Vec3 } from 'horizon/core';
import { AssetEx, TextureImageAssetEx } from 'AssetEx';

export const DEFAULT_PLAYER_WEAPON: WeaponData = {
    ...WEAPON_DATA_DEFAULT,
    grabScheme: GrabScheme.OWNER_ONLY,
    holsterData: HOLSTER_SLOT_DATA_DEFAULT,

    unlockableData: {
        requiredCurrencies: new Map([
            ['GOLD', 5000],
        ]),
    },
};

export const DEFAULT_PRIMARY_WEAPON: WeaponData = {
    ...DEFAULT_PLAYER_WEAPON,
    loadoutSlot: ConstsLoadout.LoadoutSlot.WEAPON_PRIMARY,
};

export const REVOLVER: WeaponData = {
    ...DEFAULT_PRIMARY_WEAPON,
    id: 'weapon1',

    displayName: 'Sample',
    description: 'Sample Weapon Description',
    icon: TextureImageAssetEx.new('0'),
    killLogSprite: 'UNDEFINED',

    images: {
        default: TextureImageAssetEx.new('0'),
        locked: TextureImageAssetEx.new('0')
    },

    asset: AssetEx.new('0'),

    prespawnedAssetId: 'UNDEFINED',

    grabScheme: GrabScheme.OWNER_ONLY,

    firingData: {
        ...FIRING_DATA_DEFAULT,
        fireRate: 0.35,
        unlimitedAmmoFireRate: 0.35,
        maxAmmo: 8,
        initialReserveAmmo: 32,
        maxReserveAmmo: 32,
        autoReloadTime: 1.4,
        emptyClipAutoReloadTime: 1.7,
        ammoVolume: 0.6,
        fireKickBackDelaySeconds: 0.1,
        fireKickBack: new Vec3(-80, 0, 0),
        cameraAnimation: {
            ...CAMERA_KICKBACK_ANIMATION_DEFAULT,
            shakeFOV: 1,
        },
    },
    projectileData: {
        ...WEAPON_DATA_DEFAULT.projectileData,
        amount: 40,
        headshotAmount: 50,
        projectileSpeedMetersPerSecond: 15000,
        projectileRangeMeters: 40,
        targetScheme: TargetScheme.ENEMY_TEAM_ONLY,
    },
    targetingData: {
        ...WEAPON_DATA_DEFAULT.targetingData,
        targetDetectionMaxDistance: 40,
        reticleMaxDist: 10,
        dynamicallyScaleReticle: true,
        reticleAlignToSurface: false,
    },
    screensTargetingConfig: {
        ...SCREENS_TARGETING_CONFIG_DEFAULT,
        targetingActivationRangeMeters: 40,
        autoTriggerHoverDelayThresholdSeconds: 0.25,
    },
    unlockableData: {
        ...DEFAULT_PLAYER_WEAPON.unlockableData,
        ownershipEntitlements: ['WEAPON_SAMPLE'],
    },
};
WEAPON_DATA_REGISTRY.register(REVOLVER);
