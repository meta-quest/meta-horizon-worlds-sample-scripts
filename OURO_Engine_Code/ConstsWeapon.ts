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

import { AssetEx, TextureImageAssetEx } from 'AssetEx';
import { PrespawnedAssetId } from 'AssetPools';
import { CameraShakeAnimation } from 'ConstsCamera';
import { GameContentData } from 'ConstsGameContent';
import { HolsterSlotData, HOLSTER_SLOT_DATA_DEFAULT } from 'ConstsHolster';
import { StatusEffectId } from 'ConstsIdsStatusEffect';
import { WeaponId } from 'ConstsIdsWeapon';
import { ObjTargetPart } from 'ConstsObj';
import * as EventData from 'EventData';
import { Easing } from 'horizon/camera';
import { Color, PlayerDeviceType, Vec3 } from 'horizon/core';
import { ISpreadPattern } from 'WeaponSpreadPatterns';

export const INFINITE_RESERVE_AMMO: boolean = true;
export const AMMO_WARNING_PERCENT = 0.4;

export interface AmmoColorData {
    default: Color;
    warning: Color;
    depleted: Color;
    reloading: Color;
}

export const AMMO_COLOR_DATA_VR = {
    default: new Color(0.49, 1.0, 0.6),
    warning: new Color(1, 1, 0),
    depleted: new Color(1, 0, 0),
    reloading: new Color(0.5, 0.5, 0.5),
};

export const AMMO_COLOR_DATA_XS = {
    default: new Color(1, 1, 1),
    warning: new Color(1, 1, 0),
    depleted: new Color(1, 0, 0),
    reloading: new Color(0.5, 0.5, 0.5),
};

// Status effect data
export type HitStatusEffectData = {
    statusEffectId: StatusEffectId,
    duration: number,
}

//** MODIFIERS */

export type WeaponModifiers = {
    hasInfiniteAmmo: boolean,
    forceEnableAutoFire: boolean,
    attackSpeedMultiplier: number,

    ammoRegenRateMultiplier: number,
    weaponReloadTimeReductionPercent: number,
    extraMaxAmmo: number,
    projectileSpeedMetersPerSecMultiplier: number,
    projectileRangeMultiplier: number,
    splashRadiusMultiplier: number,
}

export const WEAPON_MODIFIERS_DEFAULT: WeaponModifiers = {
    hasInfiniteAmmo: false,
    forceEnableAutoFire: false,
    attackSpeedMultiplier: 1.0,

    ammoRegenRateMultiplier: 1.0,
    weaponReloadTimeReductionPercent: 1.0,
    extraMaxAmmo: 0,

    projectileSpeedMetersPerSecMultiplier: 1.0,
    projectileRangeMultiplier: 1.0,
    splashRadiusMultiplier: 1.0,
};

export enum GrabScheme {
    ANY,
    OWNER_ONLY,
}

//** TARGETING DATA */
export interface TargetingData {
    shouldDoTargetDetection: boolean,
    targetDetectionTargetId: number,
    targetDetectionMaxDistance: number;

    forceUseProjectedReticle: boolean;

    reticleAlignToSurface: boolean;
    reticleMaxDist: number;

    surfaceOffset: number;
    yOffset: number,

    isGroundAOEIndicator: boolean,

    useCustomMeshSetup: boolean;

    baseReticleDistMultiplier: number;
    spreadReticleDistMultiplier: number;
    spreadReticleOffset: number;
    fixedReticleDist: number;
    fixedReticleUseFixedRotation: boolean;

    dynamicallyScaleReticle: boolean;

    reticleScaleVR: number;
    reticleMinScaleVR: number;
    autoFireMaxScaleVR: number;

    reticleScaleXS: number;

    autoFireReticleSpreadMultiplier: number;

    useValidTargetColor: boolean;
    defaultReticleColor: Color;

    shouldPositionSyncGroup: boolean;
    maxSyncGroupDist: number;
    syncGroupShouldRaycast: boolean;
    sycnGroupRaycastOffset: number;
    syncGroupSurfaceOffset: number;

    reticleTextDisplay: string;

    weightedBodyParts: Map<ObjTargetPart, number>
}

export const TARGETING_DATA_DEFAULT: TargetingData = {
    shouldDoTargetDetection: false,
    targetDetectionTargetId: 0,
    targetDetectionMaxDistance: 100,

    forceUseProjectedReticle: false,

    reticleAlignToSurface: true,
    reticleMaxDist: 10,

    surfaceOffset: 0.15,
    yOffset: 0,

    isGroundAOEIndicator: false,

    useCustomMeshSetup: false,
    baseReticleDistMultiplier: 1,
    spreadReticleDistMultiplier: 1,
    spreadReticleOffset: 0.05,
    fixedReticleDist: 1,
    fixedReticleUseFixedRotation: false,

    dynamicallyScaleReticle: false,
    reticleScaleVR: 1,
    reticleMinScaleVR: 0.5,
    autoFireMaxScaleVR: 1,

    reticleScaleXS: 1,

    autoFireReticleSpreadMultiplier: 0.5,

    useValidTargetColor: false,
    defaultReticleColor: Color.white,

    shouldPositionSyncGroup: false,
    maxSyncGroupDist: 20,
    syncGroupShouldRaycast: true,
    sycnGroupRaycastOffset: 1,
    syncGroupSurfaceOffset: 0,

    reticleTextDisplay: '',

    weightedBodyParts: new Map([
        [ObjTargetPart.HEAD, 20],
        [ObjTargetPart.TORSO, 70],
        [ObjTargetPart.FOOT, 10],
    ]),
};

//** FIRING DATA */

export enum FiringScheme {
    ONE_SHOT,
    AUTO_FIRE,
    CHARGE_AND_RELEASE,
}

export enum RegenAmmoScheme {
    NONE,
    ACTIVE,
    PASSIVE,
}

export const CAMERA_KICKBACK_ANIMATION_DEFAULT: CameraShakeAnimation = {
    shakeFOV: 0.2,
    shakeStartAnimation: {duration: 0.02, easing: Easing.EaseOut},
    shakeEndAnimation: {duration: 0.05, easing: Easing.EaseInOut},

    rollAngle: 0,
    rollStartAnimOptions: {duration: 0.02, easing: Easing.EaseOut},
    rollEndAnimOptions: {duration: 0.05, easing: Easing.EaseInOut},
};

export interface FiringData {
    projectileId: number,

    fireRate: number;
    unlimitedAmmoFireRate: number;

    fireKickBackDelaySeconds: number,
    fireKickBack: Vec3;
    cameraAnimation: CameraShakeAnimation;
    /**0 = no spread, 1 = 100% of the time has some spread, based on fireMaxSpread*/
    fireSpreadChance: number;
    fireMaxSpread: Vec3;

    /**How much spread angle (degrees) increases per firing event, up to the max spread*/
    autoFireSpreadStep: number;
    autoFireMaxSpread: number;

    /**Dictates how the weapon will fire (i.e. single pull, auto, charge and release).*/
    firingScheme: FiringScheme,
    /**Whether ammo should be refilled when ending a reload (This is generally true, but may be false on special charged weapons) */
    shouldRefillAmmo: boolean,
    shotChargeTime: number,
    unlimitedAmmoShotChargeTime: number,
    /**Amount of shots that will be queued per second when firing scheme is set to charge. Shots queued treated as volley shots. */
    shotChargeMax: number | undefined,
    unlimitedAmmoShotChargeMax: number | undefined,
    initialChargedShotCount: number,

    canManuallyEjectAmmo: boolean;
    canUseReloadGesture: boolean;
    canAutoReload: boolean;

    /**Amount of shots that will fire on one fire action - use this for rapid fire bullets over multiple frames, like semi-auto rifles*/
    volleyCount: number,
    /**Number of bullets that will fire per fire action - use this for bursts, multiple bullets in the same frame, like shotguns*/
    volleyBulletCount: number;
    /**Time between the shots of a single fire action, note there is a minimum time, if volleyCount is 0 or 1 then this is ignored*/
    timeBetweenVolley: number,
    /**If true, then new fire action will reset the autoFire spread calculation, making the initial bullet have minimum spread*/
    resetAutoFireSpreadBetweenVolleys: boolean,

    /** 0 = unlimited */
    maxAmmo: number;
    initialReserveAmmo: number;
    /** 0 = unlimited */
    maxReserveAmmo: number; //
    ammoConsumptionRate: number;
    /**Amount of ammo to regenerate per second*/
    ammoRegenRate: number | undefined,
    /**Scheme on how to regenerate ammo while base weapon is morphed (none, passive, active)*/
    morphedAmmoRegenScheme: RegenAmmoScheme,
    /**Allows this firing data to be treated as default for the firing controller. Important for charge attack*/
    defaultWeaponOverride: boolean | undefined,


    autoReloadTime: number;
    emptyClipAutoReloadTime: number;

    reloadRefillDelay: number;

    ammoPitch: number;
    ammoVolume: number;
    lowAmmoPitch: number;
    lowAmmoVolume: number;

    unmorphOnAmmoDepletion: boolean,
}

export const FIRING_DATA_DEFAULT: FiringData = {
    projectileId: 0,

    fireRate: 0.5,
    unlimitedAmmoFireRate: 0.25,

    fireKickBackDelaySeconds: 0,
    fireKickBack: new Vec3(-5, 0, 0),
    cameraAnimation: CAMERA_KICKBACK_ANIMATION_DEFAULT,
    fireSpreadChance: 0,
    fireMaxSpread: new Vec3(0, 0, 0),

    autoFireSpreadStep: 0,
    autoFireMaxSpread: 2.0, // 5-31-23 value: 2.5


    firingScheme: FiringScheme.ONE_SHOT,
    shouldRefillAmmo: true,
    shotChargeTime: 0,
    unlimitedAmmoShotChargeTime: 0,
    shotChargeMax: undefined,
    unlimitedAmmoShotChargeMax: undefined,
    initialChargedShotCount: 0,

    canManuallyEjectAmmo: true,
    canUseReloadGesture: true,
    canAutoReload: true,

    volleyCount: 1,
    volleyBulletCount: 1,
    timeBetweenVolley: 0.15,
    resetAutoFireSpreadBetweenVolleys: true,

    maxAmmo: 0,
    initialReserveAmmo: 0,
    maxReserveAmmo: 0,
    ammoConsumptionRate: 1,
    ammoRegenRate: undefined,
    morphedAmmoRegenScheme: RegenAmmoScheme.NONE,
    defaultWeaponOverride: undefined,

    autoReloadTime: 1.2,
    emptyClipAutoReloadTime: 1.5,

    reloadRefillDelay: 0.5,

    ammoPitch: 0,
    ammoVolume: 0.4,
    lowAmmoPitch: 3,
    lowAmmoVolume: 1,

    unmorphOnAmmoDepletion: false,
};

/**
 * Configuration which controls AutoTrigger and AimAssist behavior on targets for Mobile and Desktop clients.
 * @property autoTriggerAngle ({@link autoTriggerAngle})
 * @property autoAimAngle ({@link autoAimAngle})
 * @property autoAimNearDistance ({@link autoAimNearDistance})
 * @property autoAimFarDistance ({@link autoAimFarDistance})
 * @property autoAimNearAssistanceStrength ({@link autoAimNearAssistanceStrength})
 * @property autoAimFarAssistanceStrength ({@link autoAimFarAssistanceStrength})
 * @property autoAimNearTargetSize ({@link autoAimNearTargetSize})
 * @property autoAimFarTargetSize ({@link autoAimFarTargetSize})
 */
export interface ScreensTargetingConfig {
    /** Maximum range for autoAim and autoTrigger to be activated */
    targetingActivationRangeMeters: number;

    // AutoAim
    autoAimEnabled: boolean;

    /** Angle from the reticle (center of screen) that the camera will begin magnetising towards the nearest target. See {@link setAimAssistTarget} for more details. */
    autoAimAngle: number;

    /** Near distance to drive strength and target size values.*/
    autoAimNearDistance: number;
    /** Far distance to drive strength and target size values.*/
    autoAimFarDistance: number;

    /** Aim assistance strength at near range. See "assistanceStrength" in {@link AimAssistOptions} for more details.*/
    autoAimNearAssistanceStrength: number;
    /** Aim assistance strength at far range. See "assistanceStrength" in {@link AimAssistOptions} for more details.*/
    autoAimFarAssistanceStrength: number;

    /** Size of targets at far range. See "targetSize" in {@link AimAssistOptions} for more details.*/
    autoAimNearTargetSize: number;
    /** Size of targets at near range. See "targetSize" in {@link AimAssistOptions} for more details.*/
    autoAimFarTargetSize: number;

    // AutoTrigger
    autoTriggerEnabled: boolean;

    /** Angle from the reticle (center of screen) that the weapon will begin firing.*/
    autoTriggerAngle: number;

    /** Delay in seconds before auto trigger activates when crosshair hovers over a target.*/
    autoTriggerHoverDelayThresholdSeconds: number;
}

export const SCREENS_TARGETING_CONFIG_DEFAULT: ScreensTargetingConfig = {
    targetingActivationRangeMeters: 50,

    autoAimEnabled: true,
    autoAimAngle: 12,

    autoAimNearDistance: 0,
    autoAimFarDistance: 30,

    autoAimNearAssistanceStrength: 24,
    autoAimFarAssistanceStrength: 6,

    autoAimNearTargetSize: 24,
    autoAimFarTargetSize: 6,

    autoTriggerEnabled: true,
    autoTriggerAngle: 2,

    autoTriggerHoverDelayThresholdSeconds: 0.125,
};

/**Threshold for when we show a visual for when auto trigger hover begins and will fire.*/
export const AUTO_TRIGGER_HOVER_VISUAL_THRESHOLD_SECONDS = 0.125;

export function getScreensTargetingConfig(weaponData: WeaponData, deviceType: PlayerDeviceType) {
    switch (deviceType) {
        case PlayerDeviceType.VR:
            return undefined;
        case PlayerDeviceType.Mobile:
        case PlayerDeviceType.Desktop:
            return weaponData.screensTargetingConfig;
    }
}

//** MELEE DATA */
export type MeleeData = EventData.ChangeData & {
    meleeAttackAnimationTimeMs: number,
    vrAttackIntervalMs: number,
    forceData: EventData.WeaponForceData,
    statusEffects: HitStatusEffectData[],
}

export const MELEE_DATA_DEFAULT: MeleeData = {
    ...EventData.CHANGE_DATA_DEFAULT,
    amount: 0,
    meleeAttackAnimationTimeMs: 650,
    vrAttackIntervalMs: 650,
    changeScheme: EventData.ChangeScheme.RAW,
    changeAction: EventData.ChangeAction.DAMAGE,
    changeType: EventData.ChangeType.MELEE,
    changeElement: EventData.ChangeElement.UNDEFINED,
    targetScheme: EventData.TargetScheme.ALL,

    forceData: EventData.WEAPON_FORCE_DATA_DEFAULT,
    statusEffects: [],
};

//** OBJECT PLACEMENT DATA */
export type ObjectPlacementData = {
    hitStartDelay: number,
    duration: number,
    offset: number,
}

export const OBJECT_PLACEMENT_DATA_DEFAULT: ObjectPlacementData = {
    hitStartDelay: 0.1,
    duration: 0,
    offset: 0,
};

//** PROJECTILE DATA */
export enum ProjectileShape {
    PROJECTILE = 0,
    CONE,
    BEAM,
}

export enum SpreadPattern {
    // No spread
    NONE,
    // Default spread is random between the horizontal and vertical spread angles
    DEFAULT,
    // Horizontal spread evenly along the entire horizontal spread angle
    LINEAR_HORIZONTAL,
    // Spread evenly in a circle around the forward vector, vertical randonness makes the circle bigger or smaller, horizontal randomness changes the distance
    // between bullets along the circle.
    CIRCULAR,
}

export enum BeamPiercingDamageScheme {
    STATIC_DAMAGE, // all hit enemies take the same amount of damage
    ORDERED_PERCENTAGES, // uses the damageData array to apply damage to order of targets hit from nearest to furtherest, 1.0 == 100% damage, any additional pierces repeat the last data value
    LINEAR_DROPOFF, // calculates linear dropoff damage based on  minDist and range of the beam
}

export interface BeamPiercingData {
    damageScheme: BeamPiercingDamageScheme,
    damageData?: number[], // list of percent values that are applied to enemies hit in order by distance
    minDist: number, // minDist dist when calculating linear dropoff scheme
    maxHits: number, // max number of hits to be considered, leaving undefined means unlimited hits
}

export const BEAM_PIERCING_DATA_DEFAULT: BeamPiercingData = {
    damageScheme: BeamPiercingDamageScheme.STATIC_DAMAGE,
    minDist: 0,
    maxHits: 0,
};

export enum ProjectileRicochetSourcePosition {
    CURRENT_CAMERA_POSITION,
    LAST_FIRE_CAMERA_POSITION,
}

export const PROJECTILE_RICOCHET_SOURCE_POSITION: ProjectileRicochetSourcePosition = ProjectileRicochetSourcePosition.CURRENT_CAMERA_POSITION;

export type ProjectileData = EventData.ChangeData & {
    projectileShape: ProjectileShape;
    targetScheme: EventData.TargetScheme;

    projectileColor?: Color;

    /**how fast the projectile travels*/
    projectileSpeedMetersPerSecond: number;
    /**how far the projectile travels*/
    projectileRangeMeters: number;
    /**whether projectile expires at the end of the range*/
    projectileDoHitOnExpired: boolean;
    projectileGravity: number;

    /**0 = infinite, currently can only affect spread cone based damage since projectile launcher does not have a distance/life tuning*/
    range: number;

    spreadPattern: ISpreadPattern | undefined,
    spreadCount: number;
    minSpreadRadius: number;
    horizontalSpreadRadius: number;

    /**determines where the launcher does max damage*/
    minSplashRadius: number;
    /**determines where the launcher does min damage*/
    splashRadius: number;
    /**determines how close to the center of the launcher reticle is a crit*/
    splashCriticalRadius: number;
    splashExcludesDirectHit: boolean;

    /**Scalar value dictating how much, or how little target prediction influences where the projectile will end up. 0 is none, 1 is 100%, and so on.*/
    predictionStrength: number;

    forceData: EventData.WeaponForceData;

    hitVFXLife: number;
    /**Total radius for vfx.*/
    hitVFXRadius: number;
    /**Controls the "core" radius of the vfx, usually used to communicate min raidus.*/
    hitVFXRadiusCore: number;
    hitVFXColor: Color;
    hitVFXColorAlpha: number;

    minBeamRadius: number;
    beamRadius: number;
    beamInsideColor: Color;
    beamOutsideColor: Color;
    beamDuration: number; // time beam is alive
    beamActionRate: number; // currently only used for beams, seconds between damage moments
    beamIsPiercing: boolean; // currently only used for beams
    beamPiercingDamageData: BeamPiercingData,

    coneVFXColor: Color;
    coneVFXColorAlpha: number;

    statusEffects: HitStatusEffectData[],

    objectPlacementData: ObjectPlacementData,

    aoeTargetSelectionData: EventData.TargetingSelectionData,
}

export const PROJECTILE_DATA_DEFAULT: ProjectileData = {
    ...EventData.CHANGE_DATA_DEFAULT,
    amount: 0,
    changeScheme: EventData.ChangeScheme.RAW,
    changeAction: EventData.ChangeAction.DAMAGE,
    changeType: EventData.ChangeType.PROJECTILE,
    changeElement: EventData.ChangeElement.UNDEFINED,
    targetScheme: EventData.TargetScheme.ALL,

    projectileShape: ProjectileShape.PROJECTILE,

    projectileSpeedMetersPerSecond: 400,
    projectileRangeMeters: 0,
    projectileDoHitOnExpired: false,
    projectileGravity: 0,

    range: 0,

    spreadPattern: undefined,
    spreadCount: 1,
    minSpreadRadius: 0,
    horizontalSpreadRadius: 0,

    minSplashRadius: 0,
    splashRadius: 0,
    splashCriticalRadius: 0,
    splashExcludesDirectHit: true,

    predictionStrength: 0,
    forceData: EventData.WEAPON_FORCE_DATA_DEFAULT,

    hitVFXLife: 0.5,
    hitVFXRadius: 0,
    hitVFXRadiusCore: 0,
    hitVFXColor: Color.white,
    hitVFXColorAlpha: 1,

    minBeamRadius: 0,
    beamRadius: 0,
    beamInsideColor: Color.white,
    beamOutsideColor: Color.white,
    beamDuration: 0.5,
    beamActionRate: 0,
    beamIsPiercing: false,
    beamPiercingDamageData: BEAM_PIERCING_DATA_DEFAULT,

    coneVFXColor: Color.white,
    coneVFXColorAlpha: 1,

    statusEffects: [],

    objectPlacementData: OBJECT_PLACEMENT_DATA_DEFAULT,

    aoeTargetSelectionData: EventData.TARGETING_SELECTION_DATA_DEFAULT,
};

//** WEAPON DATA */
export enum WeaponCategory {
    DEFAULT = 0,
}

export interface WeaponData extends GameContentData<WeaponId> {
    asset?: AssetEx,

    prespawnedAssetId: PrespawnedAssetId,

    category: WeaponCategory,

    instructionText: string,

    grabScheme: GrabScheme,
    holsterData: HolsterSlotData,
    pickupHaptics: undefined,

    meleeData: MeleeData,
    projectileData: ProjectileData,
    firingData: FiringData,
    targetingData: TargetingData,

    holdingStatusEffectIds: StatusEffectId[],

    screensTargetingConfig: ScreensTargetingConfig;
}

export const WEAPON_DATA_REGISTRY = new EventData.DataRegistry<WeaponId, WeaponData>('Weapon');

export const WEAPON_DATA_DEFAULT: WeaponData = {
    id: EventData.UNDEFINED_STRING,

    displayName: 'Undefined',
    description: '',
    icon: TextureImageAssetEx.new('0'),
    killLogSprite: undefined,

    images: {
        default: TextureImageAssetEx.new('0'),
        locked: TextureImageAssetEx.new('0'),
    },

    loadoutSlot: undefined,
    isReleased: true,

    asset: undefined,

    prespawnedAssetId: 'UNDEFINED',

    category: WeaponCategory.DEFAULT, // for targeting certain behaviors such as weapon morphing, morph data's category has to match the current weapon's category to take effect.

    instructionText: '',

    grabScheme: GrabScheme.ANY,
    holsterData: HOLSTER_SLOT_DATA_DEFAULT,
    pickupHaptics: undefined,

    meleeData: MELEE_DATA_DEFAULT,
    projectileData: PROJECTILE_DATA_DEFAULT,
    firingData: FIRING_DATA_DEFAULT,
    targetingData: TARGETING_DATA_DEFAULT,

    holdingStatusEffectIds: [],
    screensTargetingConfig: SCREENS_TARGETING_CONFIG_DEFAULT,

};
WEAPON_DATA_REGISTRY.register(WEAPON_DATA_DEFAULT);
