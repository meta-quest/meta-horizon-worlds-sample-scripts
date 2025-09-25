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

import { CameraModeSettings } from 'ConstsCamera';
import { DamageNumberData } from 'ConstsDamageNumber';
import { AbilityId } from 'ConstsIdsAbility';
import { AnimationId } from 'ConstsIdsAnimation';
import { StatusEffectCategoryId, StatusEffectId } from 'ConstsIdsStatusEffect';
import { WeaponId } from 'ConstsIdsWeapon';
import { LoadoutSlot } from 'ConstsLoadout';
import { HUDControlSchemeType } from 'ConstsMobileButtons';
import { EntityOrPlayer, ObjTargetPart } from 'ConstsObj';
import * as ConstsWeapon from 'ConstsWeapon';
import * as EventData from 'EventData';
import { CameraMode } from 'horizon/camera';
import { Color, Entity, LocalEvent, NetworkEvent, Player, Vec3 } from 'horizon/core';

export function getActionEvent(changeAction: EventData.ChangeAction) {
    switch (changeAction) {
        case EventData.ChangeAction.DAMAGE:
            return applyDamage;
        case EventData.ChangeAction.HEAL:
            return applyHeal;
        case EventData.ChangeAction.STATUS_EFFECT_FROM_WEAPON:
            return applyStatusEffectFromWeapon;
        case EventData.ChangeAction.AGGRO:
            return;
    }
}

//** GENERAL OBJECT */
export const setIsEnabled = new NetworkEvent<{isEnabled: boolean}>('setIsEnabled');

//** CLIENT BASE OBJECT MAP */
export const onReplicatedObjSyncerInitialized = new NetworkEvent<{eventListener: Entity}>('onBaseObjClientSyncServiceInitialized');
export const printReplicatedObjState = new LocalEvent<{}>('printReplicatedObjState');

export type ReplicatedObjPartData = {
    targetPart: ObjTargetPart,
    entity: Entity | null
};

export type ReplicatedObjData = {
    objData: EntityOrPlayer,
    objParts: ReplicatedObjPartData[],
    teamId?: number,
    canTakeDamage: boolean,
    isAlive: boolean,
}
export const updateReplicatedObjs = new NetworkEvent<ReplicatedObjData[]>('updateBaseObjClientSyncService');

//** WEAPON */
export const setWeaponModifiers = new NetworkEvent<ConstsWeapon.WeaponModifiers>('setWeaponModifiers');
export const morphWeapon = new NetworkEvent<{abilityId: AbilityId}>('morphWeapon');
export const unmorphWeapon = new NetworkEvent<{}>('unmorphWeapon');
export const resetWeapon = new NetworkEvent<{}>('resetWeapon');

//** LOADOUT */
export const setWeaponLoadoutInfo = new NetworkEvent<{canHoldWeapons: boolean, loadoutSlot: LoadoutSlot}>('setWeaponLoadoutInfo');
export const setCanUseLoadout = new NetworkEvent<{canUseLoadout: boolean, isInteractingWithUI: boolean, isInSocialMode: boolean, targetLoadoutSlot?: LoadoutSlot}>('setCanUseLoadout');
export const setCanEnterSocialMode = new NetworkEvent<{enabled: boolean}>('setCanEnterSocialMode');
export const setSocialMode = new NetworkEvent<{enabled: boolean}>('setSocialMode');

//** CAPABILITIES */
export const setSpeed = new NetworkEvent<{player: Player, speed: number}>('setSpeed');
export const setGravity = new NetworkEvent<{player: Player, gravity: number}>('setGravity');
export const setJumpData = new NetworkEvent<{player: Player, maxJumpCount: number, jumpForces: Vec3[]}>('setJumpData');
export const setDominantHand = new NetworkEvent<{isRightHand: boolean}>('setDominantHand');
export const requestDominantHand = new NetworkEvent<{}>('requestDominantHand');

//** ATTACK */
export const startAttack = new NetworkEvent<{}>('startAttack');
export const stopAttack = new NetworkEvent<{}>('stopAttack');

export const startHit = new NetworkEvent<{}>('startHit');
export const stopHit = new NetworkEvent<{}>('stopHit');

//** DAMAGE EVENTS */
export const applyDamage = new NetworkEvent<EventData.ChangeDataTarget>('applyDamage');

export const handleSplashAction = new NetworkEvent<EventData.ChangeDataSplash>('handleSplashDamage');

export const handleBeamAction = new NetworkEvent<EventData.ChangeDataCone>('handleBeamDamage');
export const handleConeAction = new NetworkEvent<EventData.ChangeDataCone>('handleConeDamage');

//** HEALING EVENTS */
export const applyHeal = new NetworkEvent<EventData.ChangeDataTarget>('applyHeal');

export const applyRevive = new NetworkEvent<{
    targetData: EntityOrPlayer,
    sourceData: EventData.SourceData,
    playFX: boolean,
}>('applyRevive');

//** STATUS EFFECT */
export const applyStatusEffectFromWeapon = new NetworkEvent<EventData.ChangeDataTarget>('applyStatusEffectFromWeapon');
export const applyStatusEffect = new NetworkEvent<{
    targetData: EntityOrPlayer,
    statusEffectId: StatusEffectId,
    duration: number,
    sourceData: EventData.SourceData,
}>('applyPlayerStatusEffect');
export const removeStatusEffect = new NetworkEvent<{targetData: EntityOrPlayer, statusEffectId: StatusEffectId}>('removePlayerStatusEffect');
export const removeAllStatusEffectsOfCategory = new NetworkEvent<{targetData: EntityOrPlayer, statusEffectCategoryId: StatusEffectCategoryId}>('removeStatusEffectCategory');

//** FORCES */
export const applyForce = new NetworkEvent<EventData.ForceDataTarget>('applyForce');
export const handleSplashForce = new NetworkEvent<EventData.ForceDataSplash>('handleSplashForce');

export const onPlayerStatusEffectApplied = new NetworkEvent<{player: Player, statusEffectId: StatusEffectId}>('onPlayerStatusEffectApplied');
export const onPlayerStatusEffectRemoved = new NetworkEvent<{player: Player, statusEffectId: StatusEffectId}>('onPlayerStatusEffectRemoved');
export const onPlayerStatusEffectCompleted = new NetworkEvent<{player: Player, statusEffectId: StatusEffectId}>('onPlayerStatusEffectCompleted');

export const playStatusEffectRadialPulse = new NetworkEvent<{
    player: Player,
    statusEffectId: StatusEffectId,
    pos: Vec3,
    duration: number,
    radius: number,
    color: Color
}>('doStatusEffectRadialPulse');
export const playStatusEffectTrail = new NetworkEvent<{
    player: Player,
    statusEffectId: StatusEffectId,
    fromPos: Vec3,
    toPos: Vec3,
    duration: number,
    color: Color
}>('playStatusEffectTrail');

//** ABILITIES */
export type AbilityActivatedData = {
    player: Player,
    abilitySlot: number,
    abilityId: AbilityId,
    isRight: boolean,
    activationIndex: number,
    success: boolean,
    errorText?: string
}
export type AbilityDeactivatedData = {
    player: Player,
    abilitySlot: number,
    abilityId: AbilityId,
};
export const equipAbility = new NetworkEvent<{player: Player, abilitySlot: number, abilityId: AbilityId, playFX: boolean, messageCounterId: number}>('equipAbility');
export const onAbilityHandlerInitialized = new NetworkEvent<{player: Player, handler: Entity}>('onAbilityHandlerInitialized');
export const primeAbility = new NetworkEvent<{player: Player, abilitySlot: number, abilityId: AbilityId, isRight: boolean}>('primeAbility');
export const activateAbility = new NetworkEvent<AbilityActivatedData>('activateAbility');
export const deactivateAbility = new NetworkEvent<AbilityDeactivatedData>('deactivateAbility');
export const setAbilityState = new NetworkEvent<{player: Player, abilitySlot: number, abilityId: AbilityId, state: number}>('setAbilityState');

export type ShieldHpChangedPayload = {shieldHp: number, shieldMaxHp: number};
export const shieldHpChanged = new NetworkEvent<ShieldHpChangedPayload>('shieldValueChanged');

//** WEAPON GAMEPLAY */
export const onWeaponOwnershipReceived = new NetworkEvent<{weapon: Entity, weaponId: WeaponId}>('onWeaponSpawned');
export const onWeaponGrab = new NetworkEvent<{player: Player, weapon: Entity, weaponId: WeaponId, loadoutSlot: LoadoutSlot}>('onWeaponGrab');
export const onWeaponRelease = new NetworkEvent<{weapon: Entity, weaponId: WeaponId, loadoutSlot: LoadoutSlot}>('onWeaponRelease');
export const onWeaponDisposed = new NetworkEvent<{weapon: Entity, weaponId: WeaponId, loadoutSlot: LoadoutSlot}>('onWeaponDisposed');
export const onWeaponFired = new NetworkEvent<{weapon: Entity, weaponId: WeaponId}>('onWeaponFired');
export const onWeaponAmmoChanged = new NetworkEvent<{weapon: Entity, weaponId: WeaponId, currentAmmo: number}>('onWeaponAmmoChanged');
export const onWeaponTargetAcquired = new NetworkEvent<{weapon: Entity, weaponId: WeaponId, target: EntityOrPlayer}>('onWeaponTargetAcquired');

//** UI */
export const showLineIndicatorPos = new NetworkEvent<{targetPos: Vec3, color: Color}>('showLineIndicatorPos');
export const showLineIndicatorPlayer = new NetworkEvent<{targetPlayer: Player, color: Color}>('showLineIndicatorPlayer');
export const showLineIndicatorEntity = new NetworkEvent<{targetEntity: Entity, color: Color}>('showLineIndicatorEntity');
export const hideLineIndicator = new NetworkEvent<{}>('hideLineIndicator');
export const showDamageNumber = new NetworkEvent<DamageNumberData>('showDamageNumber');
export const setReticleVisibility = new NetworkEvent<{visible: boolean}>('setReticleVisibility');

//** HUD */
export const onLocalPlayerHUDControlsReady = new NetworkEvent<{}>('onLocalPlayerHUDControlsReady');
export const setDefaultHUDControlScheme = new NetworkEvent<{scheme: HUDControlSchemeType}>('setDefaultHUDControlScheme');
export const addHUDControlSchemeOverride = new NetworkEvent<{scheme: HUDControlSchemeType}>('addHUDControlSchemeOverride');
export const removeHUDControlSchemeOverride = new NetworkEvent<{scheme: HUDControlSchemeType}>('removeHUDControlSchemeOverride');

export const requestHUDControlSchemeStructure = new NetworkEvent<{}>('requestHUDControlSchemeStructure');
export const sendHUDControlSchemeStructure = new NetworkEvent<{structure: string}>('sendHUDControlSchemeStructure');

//** NAMETAG */
export const trackNametag = new NetworkEvent<{player: Player, nametag: Entity | null, overlaid: boolean}>('trackNametag');

//** PLAYER INPUT ROUTING */
export const toggleDebugUIForPlayer = new NetworkEvent<{playerId: number}>('toggleDebugUIForPlayer');

//** CAMERA */
export const setDefaultCameraSettings = new NetworkEvent<CameraModeSettings>('setCameraMode');
export const addCameraOverride = new NetworkEvent<CameraModeSettings>('pushCameraMode');
export const removeCameraOverride = new NetworkEvent<CameraModeSettings>('popCameraMode');
export const onCameraModeChanged = new NetworkEvent<{cameraMode: CameraMode}>('onCameraModeChanged');
export const clearCameraStack = new NetworkEvent<{}>('clearCameraStack');
export const setCameraFollowTarget = new NetworkEvent<{target: Entity | Player | null}>('setCameraFollowTarget');
export const switchCameraTargetNext = new NetworkEvent<{}>('switchCameraTargetNext');
export type DeathCameraSettings = CameraModeSettings & {isFollowCam: boolean};
export const enableDeathCamera = new NetworkEvent<DeathCameraSettings>('enableDeathCamera');
export const disableDeathCamera = new NetworkEvent<DeathCameraSettings>('disableDeathCamera');

export const requestCameraControlStructure = new NetworkEvent<{}>('requestCameraControlStructure');
export const sendCameraControlStructure = new NetworkEvent<{structure: string}>('sendCameraControlStructure');

//** ANIMATION */
export const playAnimationSequence = new NetworkEvent<{sequence: AnimationId}>('playAnimationSequence');
export const stopAllAnimationSequences = new NetworkEvent<{}>('stopAllAnimationSequences');

//** DEBUG */
export const showBlinkDebugs = new NetworkEvent<{show: boolean}>('showBlinkDebugs');

//** SOCIAL API */
export const areMutuallyFollowing = new NetworkEvent<{candidate: Player, responseKey: string}>('areMutuallyFollowing');

export function onAreMutuallyFollowing(responseKey: string) {
    return new NetworkEvent<{areMutuallyFollowing: boolean}>(responseKey);
}

//** NUX */
export const nuxPlayWelcomeVideo = new NetworkEvent<{}>('nuxPlayWelcomeVideo');
export const nuxWelcomeVideoFinished = new NetworkEvent<{}>('nuxWelcomeVideoFinished');
export const nuxWelcomeVideoSkipped = new NetworkEvent<{}>('nuxWelcomeVideoSkipped');
export const nuxTrackLocalClient = new NetworkEvent<{}>('nuxTrackLocalClient');
export const nuxMovementHintAmountExceeded = new NetworkEvent<{}>('nuxMovementHintAmountExceeded');
export const nuxRotationHintAmountExceeded = new NetworkEvent<{}>('nuxRotationHintAmountExceeded');
export const nuxWeaponSwapped = new NetworkEvent<{}>('nuxWeaponSwapped');
export const nuxCompleted = new NetworkEvent<{}>('nuxCompleted');
export const nuxSetVideoVolume = new NetworkEvent<{player: Player, volume: number}>('nuxSetVideoVolume');
export type NuxUIVisibilityData = {show: boolean};
export const nuxShowMoveHintUI = new NetworkEvent<NuxUIVisibilityData>('nuxShowMoveHintUI');
export const nuxShowRotateHintUI = new NetworkEvent<NuxUIVisibilityData>('nuxShowRotateHintUI');
export const nuxShowAimHintUI = new NetworkEvent<NuxUIVisibilityData>('nuxShowAimHintUI');
export const nuxShowAbilityHintUI = new NetworkEvent<NuxUIVisibilityData>('nuxShowAbilityHintUI');
export const nuxShowSwapHintUI = new NetworkEvent<NuxUIVisibilityData>('nuxShowSwapHintUI');
export const nuxShowHoldAndReleaseUI = new NetworkEvent<NuxUIVisibilityData>('nuxShowHoldAndReleaseUI');
