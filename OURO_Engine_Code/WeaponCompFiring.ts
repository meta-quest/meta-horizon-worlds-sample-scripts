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

import { BaseWeaponComp } from 'BaseWeaponComp';
import * as ConstsGame from 'ConstsGame';
import * as ConstUI from 'ConstsUI';
import * as ConstsWeapon from 'ConstsWeapon';
import { AMMO_COLOR_DATA_VR, FiringScheme, INFINITE_RESERVE_AMMO, RegenAmmoScheme } from 'ConstsWeapon';
import * as Events from 'Events';
import { onWeaponReloadComplete, onWeaponReloadStart, setTargetingReticleText } from 'Events';
import { resetWeapon } from 'EventsNetworked';
import { EntityOrPlayer } from 'ConstsObj';
import { updateAutoAimTarget } from 'EventsPlayerControls';
import { AudioGizmo, AvatarGripPoseAnimationNames, Color, Component, Entity, HapticSharpness, HapticStrength, LocalEvent, Player, PlayerDeviceType, PropTypes, Quaternion, Vec3 } from 'horizon/core';
import { LocalCameraHandler } from 'LocalPlayer';
import { AnimatedAsset } from 'UtilsAnimatedAsset';
import { GameFX, playGameFX, playSFXForPlayer, setOwnerGameFX, setVFXParameters, stopGameFX } from 'UtilsFX';
import * as UtilsGameplay from 'UtilsGameplay';
import { clearAsyncTimeOut, playHaptics, setText, setVisible } from 'UtilsGameplay';
import * as UtilsMath from 'UtilsMath';
import { clamp01 } from 'UtilsMath';
import { getAmmoTextColor } from 'UtilsWeapon';

const ANIM_ID_IS_GRAB_RIGHT = 'isGrabbedRight';
const ANIM_ID_IS_GRAB_LEFT = 'isGrabbedLeft';
const ANIM_ID_IS_EMPTY = 'isEmpty';
const ANIM_ID_IS_FIRING = 'isFiring';
const ANIM_ID_AMMO_AMOUNT = 'ammoAmount';

const ANIM_BONE_ID_AMMO_POS = 'ammoPos';

const MIN_TIME_BETWEEN_VOLLEY = 0.01;
const AUTO_FIRE_QUEUE_THRESHOLD = 0.15;

const WEAPON_RELOAD_GESTURE_ENTRY_THRESHOLD: number = 0.08;
const WEAPON_RELOAD_GESTURE_EXIT_THRESHOLD: number = 0.1;
const INFINITE_AMMO_LABEL = '<font="Kallisto-Bold SDF">0<pos=3em>0';

const AMMO_DEPLETION_UNMORPH_DELAY = 0.25;

const READY_TO_FIRE_FX_SHOW_OFFSET = -0.2;

const VOLUME_AUDIBLE = 1;
const VOLUME_MUTED = 0;
const VOLUME_SWAP_WEAPON_FADE_SECONDS = .2;

export class WeaponCompFiring extends BaseWeaponComp<typeof WeaponCompFiring> {
    static propsDefinition = {
        ...BaseWeaponComp.propsDefinition,

        fireVFX: {type: PropTypes.Entity},
        fireSFX_all: {type: PropTypes.Entity},
        fireSFX_player: {type: PropTypes.Entity},
        fireSFX_other: {type: PropTypes.Entity},

        reloadMechanismShowVFX_all: {type: PropTypes.Entity},
        reloadMechanismShowVFX_player: {type: PropTypes.Entity},
        reloadMechanismShowVFX_lifetime_id: {type: PropTypes.String, default: ''},
        reloadMechanismShowSFX_all: {type: PropTypes.Entity},
        reloadMechanismShowSFX_player: {type: PropTypes.Entity},
        reloadMechanismShowSFX_other: {type: PropTypes.Entity},

        reloadMechanismHideSFX_all: {type: PropTypes.Entity},
        reloadMechanismHideSFX_player: {type: PropTypes.Entity},
        reloadMechanismHideSFX_other: {type: PropTypes.Entity},

        reloadHolsteredSFX_player: {type: PropTypes.Entity},

        shotChargedSFX_player: {type: PropTypes.Entity},

        ammoRefillSFX_all: {type: PropTypes.Entity},
        ammoRefillSFX_player: {type: PropTypes.Entity},
        ammoRefillSFX_other: {type: PropTypes.Entity},

        outOfAmmoSFX_all: {type: PropTypes.Entity},
        outOfAmmoSFX_player: {type: PropTypes.Entity},
        outOfAmmoSFX_other: {type: PropTypes.Entity},

        readyToFireVFX_all: {type: PropTypes.Entity},
        readyToFireVFX_player: {type: PropTypes.Entity},
        readyToFireSFX_all: {type: PropTypes.Entity},
        readyToFireSFX_player: {type: PropTypes.Entity},
        readyToFireSFX_other: {type: PropTypes.Entity},

        reloadGesturePosRef: {type: PropTypes.Entity},

        ammoIndicatorText: {type: PropTypes.Entity},
    };

    isHeld = false;

    firingData = ConstsWeapon.WEAPON_DATA_DEFAULT.firingData;

    autoFireQueued = false;
    fireWaitTimer = 0;
    fireQueued = false;

    autoFireCount = 0;

    weaponAnimatedAsset = new AnimatedAsset(this);
    animGrabID = ANIM_ID_IS_GRAB_RIGHT;

    hasUnlimitedAmmo = false;
    ammo = 0;
    reserveAmmo = 0;

    reloadMechanismIsOpen = false;
    isReloading = false;

    reloadGestureAllowed = false;
    labelText: string = '';

    autoReloadAsyncId: number | undefined = undefined;
    isAutoReloading = false;

    projectileLauncher: Entity | undefined = undefined;
    targetingReticle: Entity | undefined = undefined;

    modifiedProjectileLauncherRot = false;

    fireFX!: GameFX;
    reloadMechanismShowFX!: GameFX;
    reloadMechanismHideFX!: GameFX;
    ammoRefillFX!: GameFX;
    outOfAmmoFX!: GameFX;
    readyToFireFX!: GameFX;
    reloadHolsteredFX!: GameFX;

    gameFXs: GameFX[] = [];

    unmorphAsyncId = -1;
    ammoToRegen = 0;

    unMorphedAmmoAmount = -1;
    private shouldChargeVolley = false;
    private chargedShots = 0;
    private lastCharge = 0;
    private volleyCount = 0;
    private startChargingAsapInterval: number | undefined;
    private readyToFireFXTimeoutId?: number;
    private autoAimTarget?: EntityOrPlayer;

    override preStart() {
        this.fireFX = {
            allVFX: this.props.fireVFX,
            allSFX: this.props.fireSFX_all,
            playerSFX: this.props.fireSFX_player,
            otherSFX: this.props.fireSFX_other,
        };
        this.gameFXs.push(this.fireFX);

        this.reloadMechanismShowFX = {
            allSFX: this.props.reloadMechanismShowSFX_all,
            playerSFX: this.props.reloadMechanismShowSFX_player,
            otherSFX: this.props.reloadMechanismShowSFX_other,
            allVFX: this.props.reloadMechanismShowVFX_all,
            playerVFX: this.props.reloadMechanismShowVFX_player,
        };
        this.gameFXs.push(this.reloadMechanismShowFX);

        this.reloadMechanismHideFX = {
            allSFX: this.props.reloadMechanismHideSFX_all,
            playerSFX: this.props.reloadMechanismHideSFX_player,
            otherSFX: this.props.reloadMechanismHideSFX_other,
        };
        this.gameFXs.push(this.reloadMechanismHideFX);

        this.ammoRefillFX = {
            allSFX: this.props.ammoRefillSFX_all,
            playerSFX: this.props.ammoRefillSFX_player,
            otherSFX: this.props.ammoRefillSFX_other,
        };
        this.gameFXs.push(this.ammoRefillFX);

        this.outOfAmmoFX = {
            allSFX: this.props.outOfAmmoSFX_all,
            playerSFX: this.props.outOfAmmoSFX_player,
            otherSFX: this.props.outOfAmmoSFX_other,
        };
        this.gameFXs.push(this.outOfAmmoFX);

        this.readyToFireFX = {
            allVFX: this.props.readyToFireVFX_all,
            playerVFX: this.props.readyToFireVFX_player,
            allSFX: this.props.readyToFireSFX_all,
            playerSFX: this.props.readyToFireSFX_player,
            otherSFX: this.props.readyToFireSFX_other,
        };
        this.gameFXs.push(this.readyToFireFX);

        this.reloadHolsteredFX = {
            playerSFX: this.props.reloadHolsteredSFX_player
        };
        this.gameFXs.push(this.reloadHolsteredFX);

        super.preStart(); // call after populating arrays since preStart calls setOwner and setOwner transfers ownership of array contents
    }

    override start() {
        super.start();

        // This HAS to go after the super.start() which is where parentWeapon is setup
        this.weaponAnimatedAsset.initialize(this.parentWeapon.props.weaponBundle, () => this.setupDefaultAnimState());
    }

    override onWeaponDataChanged() {
        super.onWeaponDataChanged();
        this.async.clearTimeout(this.unmorphAsyncId);

        this.firingData = this.parentWeapon.weaponData.firingData;
        this.projectileLauncher = this.parentWeapon.props.projectileLauncherComponent;
        this.targetingReticle = this.parentWeapon.props.targetingComponent;

        this.projectileLauncher?.transform.localRotation.set(Quaternion.one); // FYI: reset the weapon to the default rotation

        this.handleAmmoOnWeaponDataChanged();
        this.setReloadVFXProperties();


        if (this.canAutoFire() && this.parentWeapon.isTriggerHeld) {
            this.onFirePressed();
        }
    }

    override onWeaponModifiersChanged() {
        super.onWeaponModifiersChanged();

        this.setHasUnlimitedAmmo(this.parentWeapon.weaponModifiers.hasInfiniteAmmo);
    }

    private handleAmmoOnWeaponDataChanged() {
        const ifWeaponHasBeenOverridden = this.parentWeapon.lastWeaponData.firingData.defaultWeaponOverride;
        const hasWeaponIdChangedSinceStart = this.parentWeapon.props.weaponId != this.parentWeapon.weaponData.id;

        if (ifWeaponHasBeenOverridden || hasWeaponIdChangedSinceStart) {
            this.unMorphedAmmoAmount = this.ammo;
            this.refillAmmo(false, false);
        } else if (this.unMorphedAmmoAmount >= 0) {
            this.ammo = this.unMorphedAmmoAmount;
            this.unMorphedAmmoAmount = -1;
            this.updateAmmoUI(true);
        } else {
            this.reset();
        }
    }

    private setReloadVFXProperties() {
        if (this.reloadMechanismShowFX.allVFX) setVFXParameters(this.reloadMechanismShowFX.allVFX, this.getReloadMechanismShowVFXParameters());
        if (this.reloadMechanismShowFX.playerVFX) setVFXParameters(this.reloadMechanismShowFX.playerVFX, this.getReloadMechanismShowVFXParameters());
    }

    private getReloadMechanismShowVFXParameters() {
        const reloadLifetimeId = this.props.reloadMechanismShowVFX_lifetime_id.trim();
        return reloadLifetimeId ? [{key: reloadLifetimeId, value: this.parentWeapon.weaponData.firingData.reloadRefillDelay}] : [];
    }

    private canAutoFire() {
        return this.isHeld && (
            this.firingData.firingScheme == FiringScheme.AUTO_FIRE ||
            this.parentWeapon.weaponModifiers.forceEnableAutoFire ||
            this.hasUnlimitedAmmo ||
            this.parentWeapon.weaponData.screensTargetingConfig.autoTriggerEnabled
        );
    }

    private getAmmoDisplayEnabled() {
        return this.deviceType == PlayerDeviceType.VR;
    }

    setOwner(player: Player) {
        super.setOwner(player);

        UtilsGameplay.setOwner(this.owner, this.entity);

        this.gameFXs.forEach((value) => setOwnerGameFX(value, this.owner));

        UtilsGameplay.setOwner(this.owner, this.props.reloadGesturePosRef);
        UtilsGameplay.setOwner(this.owner, this.props.ammoIndicatorText);

        if (this.ownerIsPlayer) {
            UtilsGameplay.setVisibilityForPlayers(this.props.ammoIndicatorText, [this.owner]);

            this.connectNetworkEvent(this.owner, resetWeapon, () => this.reset());
            this.connectLocalEvent(this.owner, updateAutoAimTarget, (data) => this.autoAimTarget = data.autoAimTarget);
        }

        this.reset();
    }

    reset() {
        this.cancelAutoReload();
        this.reserveAmmo = this.getInitialReserveAmmo();
        this.refillAmmo(false, false);
        this.updateAmmoUI();

        this.weaponAnimatedAsset.setBool(ANIM_ID_IS_EMPTY, true); // force empty anim state to ensure refilled state is presented properly once refilled
        this.async.setTimeout(() => {
            this.updateWeaponAnimationState(); // update anim state with delay so that anim system reacts properly
        }, 100);
    }

    onGrab(isRightHand: boolean) {
        this.isHeld = true;
        const isVR = this.deviceType == PlayerDeviceType.VR;
        this.animGrabID = isRightHand ? (isVR ? ANIM_ID_IS_GRAB_RIGHT : ANIM_ID_IS_GRAB_LEFT): (isVR ? ANIM_ID_IS_GRAB_LEFT : ANIM_ID_IS_GRAB_RIGHT);
        this.unmuteWeaponsOnGrab();
        this.queueReadyToFireFX(this.parentWeapon.weaponData.firingData.fireRate);
    }

    private unmuteWeaponsOnGrab() {
        const audioOpts = {fade: VOLUME_SWAP_WEAPON_FADE_SECONDS};

        this.props.reloadMechanismShowSFX_player?.as(AudioGizmo)?.volume.set(VOLUME_AUDIBLE, audioOpts);
        this.props.reloadMechanismHideSFX_player?.as(AudioGizmo)?.volume.set(VOLUME_AUDIBLE, audioOpts);
        this.props.ammoRefillSFX_all?.as(AudioGizmo)?.volume.set(VOLUME_AUDIBLE, audioOpts);

        this.props.reloadHolsteredSFX_player?.as(AudioGizmo).volume.set(VOLUME_MUTED, audioOpts);
    }

    onRelease() {
        this.isHeld = false;
        this.autoFireQueued = false;
        this.muteWeaponsOnRelease();
        this.doReload();
        this.stopReadyToFireFX();
        this.resetWeaponAnimationState();
    }

    private muteWeaponsOnRelease() {
        const audioOpts = {fade: VOLUME_SWAP_WEAPON_FADE_SECONDS};

        this.props.reloadMechanismShowSFX_player?.as(AudioGizmo)?.volume.set(VOLUME_MUTED, audioOpts);
        this.props.reloadMechanismHideSFX_player?.as(AudioGizmo)?.volume.set(VOLUME_MUTED, audioOpts);
        this.props.ammoRefillSFX_all?.as(AudioGizmo)?.volume.set(VOLUME_MUTED, audioOpts);

        this.props.reloadHolsteredSFX_player?.as(AudioGizmo).volume.set(VOLUME_AUDIBLE, audioOpts);
    }

    onFirePressed(autoAimTarget?: EntityOrPlayer) {
        this.autoAimTarget = autoAimTarget;

        if (this.firingData.firingScheme == FiringScheme.CHARGE_AND_RELEASE) {
            this.beginChargingShotsAsSoonAsPossible();
            this.shouldChargeVolley = true;
            return;
        }

        if (this.fireWaitTimer > 0 && this.fireWaitTimer <= AUTO_FIRE_QUEUE_THRESHOLD) {
            this.fireQueued = true;
        } else if (!this.autoFireQueued && this.fireWaitTimer <= 0) {
            this.autoFireCount = 0;
            this.fireProjectile();
        }
    }

    private beginChargingShotsAsSoonAsPossible() {
        if (this.canChargeShots()) {
            UtilsGameplay.clearAsyncInterval(this, this.startChargingAsapInterval);
            this.startChargingAsapInterval = undefined;
            this.chargedShots = this.firingData.initialChargedShotCount;
            this.doOnShotCharged();
            return;
        }
        if (this.startChargingAsapInterval == undefined) {
            this.startChargingAsapInterval = this.async.setInterval(() => this.beginChargingShotsAsSoonAsPossible());
        }
    }

    onFireReleased() {
        if (this.shouldChargeVolley && this.fireWaitTimer <= 0) {
            this.fireProjectile();
            this.shouldChargeVolley = false;
            this.lastCharge = 0;
            this.chargedShots = 0;
            this.updateChargedTargetingReticleDisplay();
        }

        this.autoAimTarget = undefined;
        this.weaponAnimatedAsset.resetLocalTrigger(ANIM_ID_IS_FIRING);
    }

    onReload() {
        this.doReload();
    }

    private doReload() {
        const canReload = this.firingData.canManuallyEjectAmmo && !this.isAutoReloading;
        const isAlreadyAtMaxAmmo = this.ammo >= this.getMaxAmmo();
        if (!canReload || isAlreadyAtMaxAmmo) return;

        this.isAutoReloading = true;
        this.setReloadMechanismState(true);
        this.autoReloadAsyncId = this.async.setTimeout(() => this.cancelAutoReload(), this.getReloadTimeMillis(this.ammo <= 0) * 1000);
    }

    onStartAttack() {
    }

    onStartHit() {
        if (this.isEnabledAndNotReloadingAndHasAmmo()) {
            this.fireProjectile();
        }
    }

    onStopAttack() {
    }

    fireProjectile() {
        if (!this.projectileLauncher) {
            return;
        }

        if (!this.isEnabledAndNotReloadingAndHasAmmo()) {
            playGameFX(this.outOfAmmoFX);
            this.playHaptics(this.parentWeapon.isRightHand);
            if (!this.firingData.ammoRegenRate) {
                return;
            }
        }

        if (this.canConsumeAmmo(this.firingData.ammoConsumptionRate)) {
            this.consumeAmmo(this.firingData.ammoConsumptionRate);

            // handle general firing feedback
            this.weaponAnimatedAsset.setLocalTrigger(ANIM_ID_IS_FIRING);
            playGameFX(this.fireFX);
            this.playHaptics(this.parentWeapon.isRightHand);
            this.playFireAnimationIfNeeded();
            this.updateAutoFireSpreadIfNeeded();
            this.sendFiredEvents();
            this.playOrQueueKickback();
            this.queueReadyToFireFX(this.parentWeapon.weaponData.firingData.fireRate);
            this.volleyCount++;
        }

        if (this.isEnabledAndNotReloadingAndHasAmmo() || this.firingData.ammoRegenRate) {
            this.updateChargedTargetingReticleDisplay(this.volleyCount);
            this.enqueueNextVolley();
        } else {
            this.volleyCount = 0;
            this.updateChargedTargetingReticleDisplay();
        }
    }

    private stopReadyToFireFX() {
        clearAsyncTimeOut(this, this.readyToFireFXTimeoutId);
        stopGameFX(this.readyToFireFX);
    }

    private queueReadyToFireFX(delaySeconds: number) {
        this.stopReadyToFireFX();

        if (this.reloadMechanismIsOpen) return;
        this.readyToFireFXTimeoutId = this.async.setTimeout(() => playGameFX(this.readyToFireFX), (delaySeconds + READY_TO_FIRE_FX_SHOW_OFFSET) * 1000);
    }

    private sendFiredEvents() {
        this.parentWeapon.onFiredSuccess(this.firingData.projectileId, this.firingData.volleyBulletCount, this.autoAimTarget);
    }

    private playFireAnimationIfNeeded() {
        if (this.deviceType != PlayerDeviceType.VR) {
            this.owner.playAvatarGripPoseAnimationByName(AvatarGripPoseAnimationNames.Fire);
        }
    }

    private playOrQueueKickback() {
        if (this.firingData.fireKickBackDelaySeconds > 0) {
            this.async.setTimeout(() => this.playKickback(), this.firingData.fireKickBackDelaySeconds * 1000);
        } else {
            this.playKickback();
        }
    }

    private updateAutoFireSpreadIfNeeded() {
        if (this.firingData.autoFireMaxSpread <= 0) {
            return;
        }
        if (this.autoFireCount > 1) {
            const spread = Math.min(this.autoFireCount * this.firingData.autoFireSpreadStep, this.firingData.autoFireMaxSpread);
            if (this.targetingReticle) {
                const normalizedSpread = spread / this.firingData.autoFireMaxSpread;
                UtilsGameplay.sendLocalEvent(this, this.targetingReticle, Events.setAutoFireSpread, {spread: normalizedSpread});
            }

            const autoFireSpread = UtilsMath.getRandomRotation(new Vec3(spread, spread, 0));
            this.projectileLauncher!.transform.localRotation.set(autoFireSpread);
            this.modifiedProjectileLauncherRot = true;
        } else if (this.modifiedProjectileLauncherRot) {
            this.projectileLauncher!.transform.localRotation.set(Quaternion.one);
            this.modifiedProjectileLauncherRot = false;
        } else {
            if (this.firingData.fireSpreadChance >= UtilsMath.randomRange(0, 1)) {
                this.projectileLauncher!.transform.localRotation.set(UtilsMath.getRandomRotation(this.firingData.fireMaxSpread));
            }
        }
    }

    private enqueueNextVolley() {
        const shouldFireNextVolley = this.volleyCount < this.firingData.volleyCount;
        let canAutoFire = this.canAutoFire();
        const shouldAutoFire = this.firingData.firingScheme != FiringScheme.CHARGE_AND_RELEASE;

        let timeBetweenVolley = 0;
        if (shouldFireNextVolley) {
            timeBetweenVolley = this.firingData.timeBetweenVolley;
            canAutoFire = true;
        } else {
            this.volleyCount = 0;
            // TODO: move this from here, or properly refactor this whole method.
            if (this.firingData.firingScheme == FiringScheme.CHARGE_AND_RELEASE) {
                this.chargedShots = 0;
                this.updateChargedTargetingReticleDisplay();
            }

            //handle auto firing
            timeBetweenVolley = this.firingData.fireRate;
            if (this.hasUnlimitedAmmo) {
                timeBetweenVolley = this.firingData.unlimitedAmmoFireRate;
                canAutoFire = true;
            }
        }

        const attackSpeedMultiplier = this.parentWeapon.weaponModifiers.attackSpeedMultiplier == 0 ? 0 : 1.0 / this.parentWeapon.weaponModifiers.attackSpeedMultiplier;
        timeBetweenVolley = Math.max(timeBetweenVolley * attackSpeedMultiplier, MIN_TIME_BETWEEN_VOLLEY);

        if (canAutoFire && shouldAutoFire) {
            if (!this.autoFireQueued) {
                this.enqueueAutoFire(this.firingData.volleyCount, timeBetweenVolley);
            }
        } else {
            this.fireWaitTimer = timeBetweenVolley;
        }
    }

    private enqueueAutoFire(targetVolleyCount: number, timeBetweenVolley: number) {
        this.autoFireQueued = true;
        this.async.setTimeout(() => {
            this.autoFireQueued = false;
            if (this.parentWeapon.isTriggerHeld || (this.volleyCount != 0 && this.volleyCount < targetVolleyCount)) {

                // reset spread for each volley
                if (this.firingData.resetAutoFireSpreadBetweenVolleys && targetVolleyCount > 1 && this.volleyCount == 0) {
                    this.autoFireCount = 0;
                } else {
                    this.autoFireCount++;
                }

                this.fireProjectile();
            }
        }, timeBetweenVolley * 1000);
    }

    isEnabledAndNotReloadingAndHasAmmo() {
        return this.parentWeapon && this.isEnabled && !this.isReloading && !this.reloadMechanismIsOpen && (this.ammo > 0 || this.getMaxAmmo() <= 0);
    }

    playHaptics(right: boolean) {
        if (this.ownerIsPlayer) {
            UtilsGameplay.playHaptics(this.owner, right, 200, HapticStrength.Strong, HapticSharpness.Sharp);
        }
    }

    playKickback() {
        if (this.firingData.fireKickBack.x != 0) {
            // FYI, this has a two ms delay because otherwise the reset and set events would get out of order.
            this.async.setTimeout(() => this.applyFireKickBackRotation(), 2);
        }

        if (this.deviceType != PlayerDeviceType.VR) {
            this.playFireCameraAnimation();
        }
    }

    private playFireCameraAnimation() {
        LocalCameraHandler().playCameraShake(this.firingData.cameraAnimation);
    }

    applyFireKickBackRotation() {
        if (this.parentWeapon.isHolstered || this.deviceType != PlayerDeviceType.VR) {
            return;
        }
        UtilsGameplay.setRot(this.parentWeapon.entity, Quaternion.mul(this.parentWeapon.entity.rotation.get(), Quaternion.fromEuler(this.firingData.fireKickBack)), true);
    }

    setIsEnabled(enabled: boolean) {
        super.setIsEnabled(enabled);
        this.updateAmmoUI();
        this.updateWeaponAnimationState();
    }

    onVisibilityChanged(isVisible: boolean) {
        if(!isVisible) {
            return;
        }

        // HACK: arbitrary delay after visibility change so that the UAB animator updates its state properly
        this.resetWeaponAnimationState();
        this.async.setTimeout(()=>{
            this.updateWeaponAnimationState();
        }, 100);
    }

    update(deltaTime: number) {
        if (!this.ownerIsPlayer) {
            return;
        }

        if (this.fireWaitTimer > 0) {
            this.fireWaitTimer -= deltaTime;
            if (this.fireWaitTimer <= 0) {
                if (this.fireQueued) {
                    this.fireQueued = false;
                    this.fireProjectile();
                }
            }
        }

        if (this.canChargeShots()) {
            this.chargeProjectileShots(deltaTime);
        }
        this.regenAmmo(deltaTime);
        this.updateReload(deltaTime);
    }

    private canConsumeAmmo(amount: number) {
        return this.ammo >= amount || this.getMaxAmmo() <= 0;
    }

    private setupDefaultAnimState() {
        this.updateWeaponAnimationState();
    }

    private updateWeaponAnimationState() {
        const showEmptyState = !this.isEnabled || this.reloadMechanismIsOpen;
        this.weaponAnimatedAsset.setBool(ANIM_ID_IS_EMPTY, showEmptyState);
        this.weaponAnimatedAsset.resetLocalTrigger(ANIM_ID_IS_FIRING);
        this.weaponAnimatedAsset.setLocalFloat(ANIM_ID_AMMO_AMOUNT, showEmptyState ? 0 : this.calculateAmmoPercent());

        this.weaponAnimatedAsset.setLocalBool(this.animGrabID, this.isHeld);

        if (!this.getAmmoDisplayEnabled()) {
            return;
        }
        setVisible(this.props.ammoIndicatorText, this.isHeld && !showEmptyState);
    }

    private resetWeaponAnimationState() {
        this.weaponAnimatedAsset.setBool(ANIM_ID_IS_EMPTY, false);
        this.weaponAnimatedAsset.resetLocalTrigger(ANIM_ID_IS_FIRING);
        this.weaponAnimatedAsset.setLocalFloat(ANIM_ID_AMMO_AMOUNT, this.calculateAmmoPercent());
        this.weaponAnimatedAsset.setLocalBool(ANIM_ID_IS_GRAB_RIGHT, false);
        this.weaponAnimatedAsset.setLocalBool(ANIM_ID_IS_GRAB_LEFT, false);

        if (!this.getAmmoDisplayEnabled()) {
            return;
        }
        setVisible(this.props.ammoIndicatorText, false);
    }

    private setHasUnlimitedAmmo(hasUnlimitedAmmo: boolean) {
        const unlimitedAmmoIsNewlyApplied = !this.hasUnlimitedAmmo && hasUnlimitedAmmo;
        this.hasUnlimitedAmmo = hasUnlimitedAmmo;
        if (unlimitedAmmoIsNewlyApplied) {
            this.cancelAutoReload();
            this.reserveAmmo = this.getInitialReserveAmmo();
            this.refillAmmo(false, true);
            this.isReloading = false;

            if (this.parentWeapon.isTriggerHeld) {
                this.async.setTimeout(() => this.onFirePressed());
            }
        }
        this.updateAmmoUI();
    }

    private refundAmmo() {
        this.reserveAmmo += this.ammo;
        this.ammo = 0;
    }

    private consumeAmmo(amount: number) {
        if (this.getMaxAmmo() <= 0 || this.hasUnlimitedAmmo) {
            return;
        }
        this.ammo = Math.max(this.ammo - amount, 0);
        if (this.ammo == 0) {
            this.onAmmoDepleted();
        }
        this.parentWeapon.onAmmoChanged(this.ammo);
        this.updateAmmoUI();
    }

    private onAmmoDepleted() {
        if (this.firingData.canAutoReload) {
            this.setReloadMechanismState(true);
        }
        if (this.firingData.unmorphOnAmmoDepletion) {
            this.async.clearTimeout(this.unmorphAsyncId);
            this.unmorphAsyncId = this.async.setTimeout(() => this.parentWeapon.unmorph(), AMMO_DEPLETION_UNMORPH_DELAY * 1000);
        } else if (this.canRefillAmmo() && this.firingData.canAutoReload) {
            this.onReload();
        }
    }

    private canRefillAmmo() {
        return (this.reserveAmmo >= 0 || this.getMaxReserveAmmo() <= 0);
    }

    private refillAmmo(consumeReserveAmmo: boolean, playFX: boolean = true, onSuccess?: () => void) {
        const shouldRefillAmmo = !consumeReserveAmmo || this.canRefillAmmo();
        if (!shouldRefillAmmo) return;

        const shouldRefillCompletely = !consumeReserveAmmo || this.getMaxReserveAmmo() <= 0;
        if (shouldRefillCompletely) {
            this.ammo = this.getMaxAmmo();
        } else {
            this.ammo = Math.min(this.getMaxAmmo(), this.reserveAmmo);
            this.reserveAmmo = Math.max(0, this.reserveAmmo - this.ammo);
        }

        if (this.getAmmoRegenRate()) {
            this.ammoToRegen = 0;
        }

        if (playFX) {
            playGameFX(this.ammoRefillFX);
        }

        onSuccess?.();
        this.updateAmmoUI();
        this.parentWeapon?.onAmmoChanged(this.ammo);
    }

    private setReloadMechanismState(isOpen: boolean, actuallyPutAmmoBackInTheClip: boolean = true) {
        // Unclear on intent here for actuallyPutAmmoBackInTheClip
        if (this.isReloading || this.reloadMechanismIsOpen == isOpen) {
            return;
        }

        this.reloadMechanismIsOpen = isOpen;

        this.updateWeaponAnimationState();

        if (this.reloadMechanismIsOpen) {
            // When you've slid the actual cartridge out to reload
            this.reloadGestureAllowed = false;
            this.refundAmmo();
            this.updateAmmoUI();

            this.stopReadyToFireFX();
            if (!this.parentWeapon.isHolstered) {
                playGameFX(this.reloadMechanismShowFX, {player: this.owner});
            }

            this.playHaptics(this.parentWeapon.isRightHand);
            this.dispatchReloadEvents(onWeaponReloadStart);
        } else {
            // After it's already open, sliding it back in
            this.cancelAutoReload();
            this.queueReadyToFireFX(this.parentWeapon.weaponData.firingData.reloadRefillDelay);

            // Note this is only a sound at the moment
            playGameFX(this.parentWeapon.isHolstered ? this.reloadHolsteredFX : this.reloadMechanismHideFX, {player: this.owner});
            this.applyFireKickBackRotation();

            this.playHaptics(this.parentWeapon.isRightHand);

            if (actuallyPutAmmoBackInTheClip) {
                this.logReloadStat();
                this.isReloading = true;

                this.async.setTimeout(() => {
                    this.isReloading = false;

                    if (this.canRefillAmmo()) {
                        this.refillAmmo(this.getMaxReserveAmmo() != 0, true, () => {
                            // TODO: added this because this used to conflate the animation state outside of this function which would cause reload state to break.
                            this.dispatchReloadEvents(onWeaponReloadComplete);
                            this.reloadMechanismIsOpen = false;
                            this.isReloading = false;
                        });
                    } else {
                        this.setReloadMechanismState(true);
                    }

                    this.continueAutoTriggerIfStillHoveredOverTarget();

                }, this.firingData.reloadRefillDelay * 1000);
            }
        }
    }

    private dispatchReloadEvents(event: LocalEvent) {
        if (!this.isHeld) return;
        this.sendLocalEvent(this.owner, event, {});
    }

    private continueAutoTriggerIfStillHoveredOverTarget() {
        if (!this.parentWeapon.isTriggerHeld || !this.parentWeapon.weaponData.screensTargetingConfig.autoTriggerEnabled) {
            return;
        }

        this.fireProjectile();
    }

    private updateReload(deltaTime: number) {
        if (!this.reloadMechanismIsOpen || this.isReloading || !this.props.reloadGesturePosRef || !this.firingData.canUseReloadGesture) {
            return;
        }

        const reloadRef = this.props.reloadGesturePosRef.position.get();
        const handPos = UtilsGameplay.getHandPos(this.owner, !this.parentWeapon.isRightHand);

        if (this.reloadGestureAllowed) {
            if (UtilsMath.isInRange(reloadRef, handPos, WEAPON_RELOAD_GESTURE_ENTRY_THRESHOLD)) {
                this.reloadGestureAllowed = false;

                this.setReloadMechanismState(false);
                this.logReloadStat();
            }
        } else {
            if (!UtilsMath.isInRange(reloadRef, handPos, WEAPON_RELOAD_GESTURE_EXIT_THRESHOLD)) {
                this.reloadGestureAllowed = true;
            }
        }
    }

    private updateAmmoUI(updateTargetingReticle: boolean = true) {
        const ammoPercent = this.calculateAmmoPercent();
        this.updateAnimatedAmmoBar(ammoPercent);

        const canFire = this.isEnabledAndNotReloadingAndHasAmmo();
        if (this.targetingReticle && updateTargetingReticle) {
            UtilsGameplay.sendLocalEvent(this, this.targetingReticle, Events.setCanFire, {canFire: canFire});
        }

        if ((this.getMaxAmmo() <= 0 || this.hasUnlimitedAmmo) && this.isEnabled) {
            this.setAmmoDisplayText(INFINITE_AMMO_LABEL, ConstsGame.WIN_COLOR);
        } else {
            this.setAmmoDisplayText(this.getAmmoTextFormatting(), getAmmoTextColor(ammoPercent));
        }
    }

    private updateAnimatedAmmoBar(ammoPercent: number) {
        this.weaponAnimatedAsset.setLocalFloat(ANIM_ID_AMMO_AMOUNT, ammoPercent);
    }

    private getAmmoTextFormatting() {
        let str = ConstUI.FONT_STRING + '<cspace=0.25em>'; // initial formatting

        if (this.getMaxReserveAmmo() > 0) {
            str += '<size=90%>' + this.ammo.toString() + '</size>';
            str += '<size=45%><line-height=40%><br><br><br>(' + this.reserveAmmo.toString() + ')';
        } else if (this.ammoToRegen > 0) {
            str += '<size=45%><br>';
            str += '<size=90%>' + this.ammo.toString() + '</size>';
            str += '<size=45%><line-height=40%><br><br><br><br>' + this.getRegenTickBarString() + '';
        } else {
            str += '<size=90%>' + this.ammo.toString();
        }
        return str;
    }

    private setAmmoDisplayText(txt: string, color: Color = AMMO_COLOR_DATA_VR.default) {
        if (this.labelText == txt && !this.getAmmoDisplayEnabled()) return;
        setText(this.props.ammoIndicatorText, `<color=${color.toHex()}>${this.labelText}`);
        this.labelText = txt;
    }

    private calculateAmmoPercent() {
        return this.getMaxAmmo() > 0 ? clamp01(this.ammo / this.getMaxAmmo()) : 1.0;
    }

    private cancelAutoReload() {
        if (!this.isAutoReloading) return;

        this.isAutoReloading = false;
        if (this.autoReloadAsyncId) {
            this.async.clearTimeout(this.autoReloadAsyncId);
        }
        this.autoReloadAsyncId = undefined;
        this.setReloadMechanismState(false, this.firingData.shouldRefillAmmo);
    }

    private logReloadStat() {
    }

    private regenAmmo(deltaTime: number) {
        if (this.parentWeapon.getIsMorphed() && this.firingData.morphedAmmoRegenScheme == RegenAmmoScheme.NONE || this.shouldChargeVolley) {
            return;
        }

        const morphedRegenIsPassive = this.parentWeapon.getIsMorphed() && this.firingData.morphedAmmoRegenScheme == RegenAmmoScheme.PASSIVE;

        const ammoRegenRate = this.getAmmoRegenRate();
        const ammoToCount = morphedRegenIsPassive ? this.unMorphedAmmoAmount : this.ammo;

        if (ammoRegenRate == undefined || ammoToCount >= this.getMaxAmmo()) {
            return;
        }

        this.ammoToRegen += deltaTime * ammoRegenRate;

        if (morphedRegenIsPassive) {
            this.regenAmmoWhileMorphed();
            return;
        }

        if (this.ammoToRegen >= 1) {
            this.ammo++;
            this.ammoToRegen = 0;
            this.updateAmmoUI();
            this.parentWeapon.onAmmoChanged(this.ammo);
        } else {
            this.updateAmmoUI(false);
        }
    }

    private regenAmmoWhileMorphed() {
        if (this.ammoToRegen < 1 || this.unMorphedAmmoAmount == undefined) {
            return;
        }

        this.unMorphedAmmoAmount++;
        this.ammoToRegen = 0;
    }

    private getRegenTickBarString() {
        let str = `<align=left><cspace=-0.4em>`;
        const pct = this.ammoToRegen / 1;
        const maxTicks = 25;
        const targetTicks = Math.floor(maxTicks * pct);

        for (let i = 1; i < targetTicks; i++) {
            str += i < targetTicks ? 'I' : ' ';
        }
        return '     ' + str;
    }

    private canChargeShots() {
        return this.firingData.firingScheme == FiringScheme.CHARGE_AND_RELEASE && this.shouldChargeVolley && this.isEnabledAndNotReloadingAndHasAmmo();
    }

    private chargeProjectileShots(deltaTime: number) {
        const currentAmmoCount = this.firingData.morphedAmmoRegenScheme == RegenAmmoScheme.PASSIVE ? this.unMorphedAmmoAmount : this.ammo;
        const chargeShotMax = this.firingData.shotChargeMax ? this.getMaximumCharges() : currentAmmoCount;
        if (!this.shouldChargeVolley || this.chargedShots > chargeShotMax) {
            return;
        }
        this.chargedShots += this.getShotChargeTime() * deltaTime;
        if (Math.floor(this.chargedShots) > this.lastCharge) {
            this.doOnShotCharged();
        }
    }

    private getMaximumCharges() {
        if (this.firingData.shotChargeMax == undefined) {
            return 0;
        }
        if (this.hasUnlimitedAmmo && this.firingData.unlimitedAmmoShotChargeMax) {
            return this.firingData.unlimitedAmmoShotChargeMax;
        }
        return this.firingData.shotChargeMax;
    }

    private getShotChargeTime() {
        if (!this.hasUnlimitedAmmo) {
            return this.firingData.shotChargeTime;
        }
        return this.firingData.unlimitedAmmoShotChargeTime > 0 ? this.firingData.unlimitedAmmoShotChargeTime : this.firingData.shotChargeTime;
    }

    private doOnShotCharged() {
        this.lastCharge = Math.floor(this.chargedShots);
        this.updateAmmoUI();
        playSFXForPlayer(this.props.shotChargedSFX_player, this.owner);
        playHaptics(this.owner, this.parentWeapon.isRightHand, 100);
        this.updateChargedTargetingReticleDisplay();
    }

    private updateChargedTargetingReticleDisplay(volleyShots?: number) {
        if (!this.targetingReticle || this.firingData.firingScheme != FiringScheme.CHARGE_AND_RELEASE) {
            return;
        }
        const targetingReticleChargedShotText = ''.padStart(Math.floor(volleyShots ? this.chargedShots - volleyShots : this.chargedShots), '|');
        this.sendLocalEvent(this.targetingReticle, setTargetingReticleText, {text: targetingReticleChargedShotText});
    }

    //** Modified Firing Properties */

    private getAmmoRegenRate() {
        if (this.parentWeapon && this.parentWeapon.getIsMorphed()) {
            return this.parentWeapon.lastWeaponData.firingData.ammoRegenRate ? this.parentWeapon.lastWeaponData.firingData.ammoRegenRate * this.parentWeapon.weaponModifiers.ammoRegenRateMultiplier : undefined;
        }

        return this.firingData.ammoRegenRate ? this.firingData.ammoRegenRate * this.parentWeapon.weaponModifiers.ammoRegenRateMultiplier : undefined;
    }

    private getReloadTimeMillis(isEmpty: boolean) {
        const reloadTime = isEmpty ? this.firingData.emptyClipAutoReloadTime : this.firingData.autoReloadTime;
        const newReloadTime = reloadTime - (this.firingData.emptyClipAutoReloadTime * this.parentWeapon.weaponModifiers.weaponReloadTimeReductionPercent);
        return Math.max(0.1, newReloadTime);
    }

    private getMaxAmmo() {
        if (this.parentWeapon && this.parentWeapon.getIsMorphed()) {
            return this.parentWeapon.lastWeaponData.firingData.maxAmmo + this.parentWeapon.weaponModifiers.extraMaxAmmo;
        }
        return this.parentWeapon != undefined ? this.firingData.maxAmmo + this.parentWeapon.weaponModifiers.extraMaxAmmo : this.firingData.maxAmmo;
    }

    private getInitialReserveAmmo() {
        return INFINITE_RESERVE_AMMO ? 0 : this.firingData.initialReserveAmmo;
    }

    private getMaxReserveAmmo() {
        return INFINITE_RESERVE_AMMO ? 0 : this.firingData.maxReserveAmmo;
    }
}

Component.register(WeaponCompFiring);
