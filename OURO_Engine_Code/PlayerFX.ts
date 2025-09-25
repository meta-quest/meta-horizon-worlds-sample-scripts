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

import * as CompHealth from 'CompHealth';
import * as ConstsAbility from 'ConstsAbility';
import * as ConstsDamageNumber from 'ConstsDamageNumber';
import { DamageNumberData, DamageNumberProps, DAMAGE_NUMBER_PROPS_DEFAULT } from 'ConstsDamageNumber';
import * as ConstsGame from 'ConstsGame';
import { PLAYER_HEALTH_CRITICAL_THRESHOLD } from 'ConstsGame';
import * as ConstsGameMode from 'ConstsGameMode';
import * as ConstsObj from 'ConstsObj';
import { EntityOrPlayer, ObjTargetPart } from 'ConstsObj';
import * as ConstsStatusEffect from 'ConstsStatusEffect';
import { StatusEffectData } from 'ConstsStatusEffect';
import * as EventData from 'EventData';
import { ChangeDataHitInfo, CHANGE_DATA_HIT_INFO_DEFAULT } from 'EventData';
import * as Events from 'Events';
import { DeathEventData, onDamageDealt, onDamageTaken, ReviveEventData, SpawnPointLocation, StatusEffectChangedEventData, teleportArenaPlayer } from 'Events';
import * as EventsNetworked from 'EventsNetworked';
import { onCameraModeChanged, showDamageNumber } from 'EventsNetworked';
import * as Game from 'Game';
import { GamePlayer } from 'GamePlayer';
import { GlobalSFXBank } from 'GlobalSFXBank';

import { PrespawnedAssetId } from 'AssetPools';
import { DEFAULT_CAMERA_SETTINGS } from 'ConstsCamera';
import { AbilityId } from 'ConstsIdsAbility';
import { RETICLE_HIT_COLOR_BODY, RETICLE_HIT_COLOR_CRIT } from 'ConstsVFX';
import { CameraMode } from 'horizon/camera';
import { AttachablePlayerAnchor, Color, Component, Entity, HapticSharpness, HapticStrength, Player, PropTypes, Quaternion, Vec3, World } from 'horizon/core';
import { ServerPlayerAsset } from 'PlayerAsset';
import { ServerBaseObjRegistry } from 'ServerBaseObjRegistry';
import { getCameraFOVScaleFactor } from 'UtilsCamera';
import {
    ColorWithAlpha,
    GameFX,
    playGameFX,
    playGameFXAt,
    playSFXForPlayer,
    playVFXForPlayer,
    setVFXParameter,
    setVFXParameters,
    setVFXParametersAndPlay,
    stopGameFX,
    stopVFXForPlayer
} from 'UtilsFX';
import * as UtilsGameplay from 'UtilsGameplay';
import { AsyncTimeout, attachToPlayer, debounceAsync, detach, setText, setVisibilityForPlayers, setVisibilityForPlayersOnPlayerEnterWorld, setVisible } from 'UtilsGameplay';
import * as UtilsMath from 'UtilsMath';
import { equalsApprox } from 'UtilsMath';
import { pushIfExists } from 'UtilsTypescript';

// TODO: Can we remove the screen tinter when you're dead?
const SCREEN_TINTER_LOCAL_POS = new Vec3(0, -0.3, 0.5);
const SCREEN_TINTER_LOCAL_SCALE = new Vec3(10, 2, 1);
const IS_DIRECTION_DOT_THRESHOLD = 0.8;

const VFX_PARAM_HIT_SOURCE_POSITION = 'source_position';
const VFX_PARAM_CRITICAL_HEALTH_PERCENT = 'health_percent';

export class PlayerFX extends ServerPlayerAsset<typeof PlayerFX> {
    static propsDefinition = {
        // ATTACHED CONTENT
        headAttachedGroup: {type: PropTypes.Entity},
        bodyAttachedGroup: {type: PropTypes.Entity},

        // ABILITIES
        abilityUnlockVFX: {type: PropTypes.Entity},
        abilityActivationVFX: {type: PropTypes.Entity},

        // HUD VFX
        hudHitDirectionalVFX: {type: PropTypes.Entity},
        hudHitDirectionalVFX_size_id: {type: PropTypes.String, default: 'size'},
        hudHitDirectionalVFX_size: {type: PropTypes.Number, default: 0.375},

        hudShieldBreakVFX: {type: PropTypes.Entity},
        hudShieldRegenVFX: {type: PropTypes.Entity},

        hudReticleHitVFX: {type: PropTypes.Entity},

        // HIT DEALT
        hitVFX: {type: PropTypes.Entity},
        hitSFX_player: {type: PropTypes.Entity},
        hitSFX_other: {type: PropTypes.Entity},

        criticalHitVFX: {type: PropTypes.Entity},
        criticalHitSFX_player: {type: PropTypes.Entity},
        criticalHitSFX_other: {type: PropTypes.Entity},

        burnHitVFX: {type: PropTypes.Entity},
        burnHitSFX_player: {type: PropTypes.Entity},
        burnHitSFX_other: {type: PropTypes.Entity},

        poisonHitVFX: {type: PropTypes.Entity},
        poisonHitSFX_player: {type: PropTypes.Entity},
        poisonHitSFX_other: {type: PropTypes.Entity},

        matStoneHitVFX: {type: PropTypes.Entity},
        matStoneHitSFX_player: {type: PropTypes.Entity},
        matStoneHitSFX_other: {type: PropTypes.Entity},

        // HIT RECEIVED
        hitReceivedVFX: {type: PropTypes.Entity},
        hitReceivedSFX_player: {type: PropTypes.Entity},
        hitReceivedSFX_other: {type: PropTypes.Entity},

        criticalHitReceivedVFX_all: {type: PropTypes.Entity},
        criticalHitReceivedVFX_player: {type: PropTypes.Entity},
        criticalHitReceivedVFX_other: {type: PropTypes.Entity},

        criticalHitReceivedSFX_player: {type: PropTypes.Entity},
        criticalHitReceivedSFX_other: {type: PropTypes.Entity},

        shieldHitReceivedVFX: {type: PropTypes.Entity},
        shieldHitReceivedSFX_player: {type: PropTypes.Entity},
        shieldHitReceivedSFX_other: {type: PropTypes.Entity},

        burnHitReceivedVFX_player: {type: PropTypes.Entity},
        burnHitReceivedVFX_other: {type: PropTypes.Entity},
        burnHitReceivedSFX_player: {type: PropTypes.Entity},
        burnHitReceivedSFX_other: {type: PropTypes.Entity},

        burningHitReceivedVFX_player: {type: PropTypes.Entity},
        burningHitReceivedVFX_other: {type: PropTypes.Entity},
        burningHitReceivedSFX_player: {type: PropTypes.Entity},
        burningHitReceivedSFX_other: {type: PropTypes.Entity},

        // UNDER SHIELD
        underShieldDepletedVFX: {type: PropTypes.Entity},
        underShieldDepletedSFX_player: {type: PropTypes.Entity},
        underShieldDepletedSFX_other: {type: PropTypes.Entity},

        underShieldRegenStartVFX: {type: PropTypes.Entity},
        underShieldRegenStartSFX_player: {type: PropTypes.Entity},
        underShieldRegenStartSFX_other: {type: PropTypes.Entity},

        underShieldRegenCancelVFX: {type: PropTypes.Entity},
        underShieldRegenCancelSFX_player: {type: PropTypes.Entity},
        underShieldRegenCancelSFX_other: {type: PropTypes.Entity},

        underShieldRegenCompleteVFX: {type: PropTypes.Entity},
        underShieldRegenCompleteSFX_player: {type: PropTypes.Entity},
        underShieldRegenCompleteSFX_other: {type: PropTypes.Entity},

        // HEALTH
        criticalHpWarningVFX_player: {type: PropTypes.Entity},
        criticalHpWarningSFX_player: {type: PropTypes.Entity},

        healVFX: {type: PropTypes.Entity},
        healSFX_player: {type: PropTypes.Entity},
        healSFX_other: {type: PropTypes.Entity},

        deathVFX: {type: PropTypes.Entity},
        deathSFX_player: {type: PropTypes.Entity},
        deathSFX_other: {type: PropTypes.Entity},

        respawnVFX: {type: PropTypes.Entity},

        reviveVFX: {type: PropTypes.Entity},
        reviveSFX_player: {type: PropTypes.Entity},
        reviveSFX_other: {type: PropTypes.Entity},

        // DAMAGE NUMBERS
        vfxDamageNumber: {type: PropTypes.Entity},
        damageNumber1: {type: PropTypes.Entity},
        damageNumber2: {type: PropTypes.Entity},
        damageNumber3: {type: PropTypes.Entity},

        // OTHER
        indicatorLine: {type: PropTypes.Entity},
        screenTinter: {type: PropTypes.Entity},
    };

    static VFX_ACTIVATION_COLOR_ID = 'GlobalColor';

    override readonly prespawnedAssetId: PrespawnedAssetId = 'PlayerFX';

    indicatorLineAutoHideAsyncId = -1;

    deathTimer = 0;
    deathTickTimer = 0;

    textDamageNumbers: Entity[] = [];
    textDamageNumberIndex = 0;

    lastKiller: EntityOrPlayer | undefined = undefined;
    shouldPlayCriticalHpWarning = false;

    // Receiving FX
    hitReceivedFX!: GameFX;
    criticalHitReceivedFX!: GameFX;
    shieldHitReceivedFX!: GameFX;
    burnHitReceivedFX!: GameFX;
    burningHitReceivedFX!: GameFX;

    underShieldDepletedFX!: GameFX;
    underShieldRegenStartFX!: GameFX;
    underShieldRegenCancelFX!: GameFX;
    underShieldRegenCompleteFX!: GameFX;

    healFX!: GameFX;
    deathFX!: GameFX;
    reviveFX!: GameFX;

    // Dealing FX
    defaultHitFX!: GameFX;
    criticalHitFX!: GameFX;

    // Elemental FX
    burnHitFX!: GameFX;
    poisonHitFX!: GameFX;

    // Material FX
    matStoneHitFX!: GameFX;

    private hudHitReticleColor?: ColorWithAlpha = undefined;
    private readonly criticalHPWarningDebounceAsync = new AsyncTimeout(this);

    override onPreStart() {
        this.initializeGameFX();
        this.initializeDamageNumbers();
        this.connectEvents();

        this.setAttachedGroupsVisible(false);

        UtilsGameplay.setVisibilityForPlayersOnPlayerEnterWorld(this, this.props.headAttachedGroup, () => [this.virtualOwner]);
    }

    override onStart() {

    }

    override onAssignVirtualOwner() {
        this.setAttachedGroupsVisible(true);

        const localEntities = this.props.vfxDamageNumber ? [this.props.vfxDamageNumber, ...this.textDamageNumbers] : this.textDamageNumbers;
        localEntities.forEach((entity: Entity) => {
            UtilsGameplay.setOwner(this.virtualOwner, entity); // damage numbers (previously text boobers) scripts are locally owned
        });

        UtilsGameplay.setOwner(this.virtualOwner, this.props.indicatorLine);

        setVisibilityForPlayers(this.props.headAttachedGroup, [this.virtualOwner]);
        UtilsGameplay.setVisibilityForPlayersOnCameraModeChanged(this, this.props.headAttachedGroup, this.virtualOwner, () => [this.virtualOwner]);

        attachToPlayer(this.props.headAttachedGroup, this.virtualOwner, AttachablePlayerAnchor.Head);
        attachToPlayer(this.props.bodyAttachedGroup, this.virtualOwner, AttachablePlayerAnchor.Torso);
        UtilsGameplay.attachToPlayerOnCameraModeChanged(this, this.props.headAttachedGroup, this.virtualOwner, AttachablePlayerAnchor.Head);

        this.connectNetworkEvent(this.virtualOwner, onCameraModeChanged, (data) => this.updateSizeForVFXAttachedTo2DCamera(data.cameraMode));
        this.updateSizeForVFXAttachedTo2DCamera(DEFAULT_CAMERA_SETTINGS.cameraMode);
        this.connectLocalEvent(this.virtualOwner, onDamageTaken, (data) => this.onDamageTaken(data));
        this.connectLocalEvent(this.virtualOwner, onDamageDealt, (data) => this.onDamageDealt(data));
    }

    override onUnassignVirtualOwner() {
        detach(this.props.headAttachedGroup);
        detach(this.props.bodyAttachedGroup);

        this.setAttachedGroupsVisible(false);
    }

    private setAttachedGroupsVisible(visible: boolean) {
        setVisible(this.props.headAttachedGroup, visible);
        setVisible(this.props.bodyAttachedGroup, visible);
    }

    private initializeGameFX() {
        // Received FX
        this.hitReceivedFX = {
            allVFX: this.props.hitReceivedVFX,
            playerSFX: this.props.hitReceivedSFX_player,
            otherSFX: this.props.hitReceivedSFX_other,
        };

        this.criticalHitReceivedFX = {
            allVFX: this.props.criticalHitReceivedVFX_all,
            playerVFX: this.props.criticalHitReceivedVFX_player,
            othersVFX: this.props.criticalHitReceivedVFX_other,
            playerSFX: this.props.criticalHitReceivedSFX_player,
            otherSFX: this.props.criticalHitReceivedSFX_other,
        };

        this.shieldHitReceivedFX = { // FYI: plays at hit loc
            allVFX: this.props.shieldHitReceivedVFX,
            playerSFX: this.props.shieldHitReceivedSFX_player,
            otherSFX: this.props.shieldHitReceivedSFX_other,
        };

        this.burnHitReceivedFX = {
            playerVFX: this.props.burnHitReceivedVFX_player,
            othersVFX: this.props.burnHitReceivedVFX_other,
            playerSFX: this.props.burnHitReceivedSFX_player,
            otherSFX: this.props.burnHitReceivedSFX_other,
        };

        this.burningHitReceivedFX = {
            playerVFX: this.props.burningHitReceivedVFX_player,
            othersVFX: this.props.burningHitReceivedVFX_other,
            playerSFX: this.props.burningHitReceivedSFX_player,
            otherSFX: this.props.burningHitReceivedSFX_other,
        };

        this.underShieldDepletedFX = {
            allVFX: this.props.underShieldDepletedVFX,
            playerVFX: this.props.hudShieldBreakVFX,
            playerSFX: this.props.underShieldDepletedSFX_player,
            otherSFX: this.props.underShieldDepletedSFX_other,
        };

        this.underShieldRegenStartFX = {
            allVFX: this.props.underShieldRegenStartVFX,
            playerVFX: this.props.hudShieldRegenVFX,
            playerSFX: this.props.underShieldRegenStartSFX_player,
            otherSFX: this.props.underShieldRegenStartSFX_other,
        };

        this.underShieldRegenCancelFX = {
            allVFX: this.props.underShieldRegenCancelVFX,
            playerSFX: this.props.underShieldRegenCancelSFX_player,
            otherSFX: this.props.underShieldRegenCancelSFX_other,
        };

        this.underShieldRegenCompleteFX = {
            allVFX: this.props.underShieldRegenCompleteVFX,
            playerSFX: this.props.underShieldRegenCompleteSFX_player,
            otherSFX: this.props.underShieldRegenCompleteSFX_other,
        };

        this.healFX = {
            allVFX: this.props.healVFX,
            playerSFX: this.props.healSFX_player,
            otherSFX: this.props.healSFX_other,
        };

        this.deathFX = {
            allVFX: this.props.deathVFX,
            playerSFX: this.props.deathSFX_player,
            otherSFX: this.props.deathSFX_other,
        };

        this.reviveFX = {
            allVFX: this.props.reviveVFX,
            playerSFX: this.props.reviveSFX_player,
            otherSFX: this.props.reviveSFX_other,
        };

        // Dealing FX
        this.defaultHitFX = {
            allVFX: this.props.hitVFX,
            playerSFX: this.props.hitSFX_player,
            otherSFX: this.props.hitSFX_other,
        };

        this.criticalHitFX = {
            allVFX: this.props.criticalHitVFX,
            playerSFX: this.props.criticalHitSFX_player,
            otherSFX: this.props.criticalHitSFX_other,
        };

        this.burnHitFX = {
            allVFX: this.props.burnHitVFX,
            playerSFX: this.props.burnHitSFX_player,
            otherSFX: this.props.burnHitSFX_other,
        };

        this.poisonHitFX = {
            allVFX: this.props.poisonHitVFX,
            playerSFX: this.props.poisonHitSFX_player,
            otherSFX: this.props.poisonHitSFX_other,
        };

        this.matStoneHitFX = {
            allVFX: this.props.matStoneHitVFX,
            playerSFX: this.props.matStoneHitSFX_player,
            otherSFX: this.props.matStoneHitSFX_other,
        };
    }

    private initializeDamageNumbers() {
        pushIfExists(this.textDamageNumbers, this.props.damageNumber1);
        pushIfExists(this.textDamageNumbers, this.props.damageNumber2);
        pushIfExists(this.textDamageNumbers, this.props.damageNumber3);
    }

    private connectEvents() {
        this.connectLocalBroadcastEvent(Events.onHealthHealed, (data) => {
            if (this.virtualOwner == data.targetData) {
                playGameFX(this.healFX, {player: this.virtualOwner});
            }
        });

        this.connectLocalBroadcastEvent(Events.onPlayerHpChange, (data) => {
            if (this.virtualOwner != data.player) {
                return;
            }

            if (data.percent > 0) {
                this.deathTimer = 0;
                this.deathTickTimer = 0;
            }

            const nextFrameDelay = 0;
            debounceAsync(this.criticalHPWarningDebounceAsync, nextFrameDelay, () => this.playCriticalHPWarning(data.percent));
        });

        this.connectLocalBroadcastEvent(Events.onPlayerUnderShieldEvent, (data) => {
            if (this.virtualOwner == data.player) {
                switch (data.eventId) {
                    case CompHealth.UnderShieldEventId.DEPLETED:
                        playGameFX(this.underShieldDepletedFX, {player: this.virtualOwner});
                        break;
                    case CompHealth.UnderShieldEventId.REGEN_STARTED:
                        playGameFX(this.underShieldRegenStartFX, {player: this.virtualOwner});
                        break;
                    case CompHealth.UnderShieldEventId.REGEN_CANCELED:
                        stopGameFX(this.underShieldRegenStartFX, this.virtualOwner, this);
                        playGameFX(this.underShieldRegenCancelFX, {player: this.virtualOwner});
                        break;
                    case CompHealth.UnderShieldEventId.REGEN_COMPLETED:
                        stopGameFX(this.underShieldRegenStartFX, this.virtualOwner, this);
                        playGameFX(this.underShieldRegenCompleteFX, {player: this.virtualOwner});
                        break;
                }
            }
        });

        this.connectLocalBroadcastEvent(Events.onStatusEffectApplied, (data) => {
            this.showStatusEffectTextIfNeeded(data, 'APPLIED', effectData => effectData.showApplyMessage);
        });

        this.connectLocalBroadcastEvent(Events.onStatusEffectRemoved, (data) => {
            this.showStatusEffectTextIfNeeded(data, 'REMOVED', effectData => effectData.showRemovedMessage);
        });

        this.connectLocalBroadcastEvent(Events.onStatusEffectCompleted, (data) => {
            this.showStatusEffectTextIfNeeded(data, 'COMPLETED', effectData => effectData.showCompletedMessage);
        });

        this.connectLocalBroadcastEvent(Events.onDeath, this.onDeath.bind(this));

        this.connectLocalBroadcastEvent(Events.onRevive, this.onRevive.bind(this));

        this.connectLocalBroadcastEvent(Events.onPlayerAbilityEquipped, (data) => {
            if (this.virtualOwner == data.player && data.playFX) {
                const abilityData = ConstsAbility.ABILITY_DATA_REGISTRY.get(data.abilityId);
                if (abilityData) {
                    const color = new ColorWithAlpha(abilityData.color.r, abilityData.color.g, abilityData.color.b, 1);
                    setVFXParametersAndPlay(this.props.abilityActivationVFX, {}, [{key: PlayerFX.VFX_ACTIVATION_COLOR_ID, value: color}]);
                }
            }
        });

        this.connectLocalBroadcastEvent(Events.showLineIndicator, (data) => {
            if (this.virtualOwner == data.player) {
                this.showIndicatorLine(data.targetPos, data.targetData, data.color);
            }
        });

        this.connectLocalBroadcastEvent(Events.hideLineIndicator, (data) => {
            if (this.virtualOwner == data.player) {
                this.hideIndicatorLine();
            }
        });

        this.connectNetworkBroadcastEvent(EventsNetworked.primeAbility, (data) => {
            if (this.virtualOwner == data.player) {
                this.playAbilityVFX(data.abilityId);
            }
        });

        this.connectNetworkBroadcastEvent(EventsNetworked.activateAbility, (data) => {
            if (this.virtualOwner == data.player && data.success) {
                this.playAbilityVFX(data.abilityId);
            }
        });

        this.connectLocalBroadcastEvent(World.onUpdate, (data) => this.update(data.deltaTime));
    }

    private update(deltaTime: number) {
        this.updateDeathTimer(deltaTime);
    }

    /**FOV Changes when the camera modes are changed and we need to change the size property on camera attached (screen-space) VFX accordingly.*/
    private updateSizeForVFXAttachedTo2DCamera(cameraMode: CameraMode) {
        const cameraFOVScaleFactor = getCameraFOVScaleFactor(cameraMode);

        setVFXParameter(this.props.hudHitDirectionalVFX, this.props.hudHitDirectionalVFX_size_id, this.props.hudHitDirectionalVFX_size * cameraFOVScaleFactor);
    }

    private playCriticalHPWarning(hpPercent: number) {
        if (hpPercent > PLAYER_HEALTH_CRITICAL_THRESHOLD) {
            this.shouldPlayCriticalHpWarning = false;
            stopVFXForPlayer(this.props.criticalHpWarningVFX_player, this.virtualOwner);
        }

        if (equalsApprox(hpPercent, 0)) {
            stopVFXForPlayer(this.props.criticalHpWarningVFX_player, this.virtualOwner);
        } else if (hpPercent < PLAYER_HEALTH_CRITICAL_THRESHOLD && !this.shouldPlayCriticalHpWarning) {
            this.shouldPlayCriticalHpWarning = true;
            setVFXParametersAndPlay(this.props.criticalHpWarningVFX_player, {players: [this.virtualOwner]}, [[VFX_PARAM_CRITICAL_HEALTH_PERCENT, hpPercent * 100]]);
            playSFXForPlayer(this.props.criticalHpWarningSFX_player, this.virtualOwner);
        } else if (this.shouldPlayCriticalHpWarning) {
            setVFXParameter(this.props.criticalHpWarningVFX_player, VFX_PARAM_CRITICAL_HEALTH_PERCENT, hpPercent * 100);
        }
    }

    private onDamageDealt(data: ChangeDataHitInfo) {
        // owner did the hit
        let hitPos = data.sourceData.pos;

        let damageNumberProps: ConstsDamageNumber.DamageNumberProps = {
            ...this.getTypeOfHitDealtFXAndDamageNumberProps(data).damageNumberProps,
            driftDir: new Vec3(UtilsMath.randomOfTwoNumbers(-1, 1), 0, 0),
        };
        let text = data.changeData.amount.toString();

        if (data.isCrit) {
            playGameFXAt(this.criticalHitFX, hitPos, {player: this.virtualOwner});
            damageNumberProps = ConstsDamageNumber.DAMAGE_NUMBER_PROPS_CRIT;
        }

        if (damageNumberProps.sizeDelta != 0) {
            text = '<size=' + Math.round(100 + damageNumberProps.sizeDelta) + '%>' + text;
        }

        text += damageNumberProps.subText;

        switch (data.material) { // Handles SFX per material type
            case ConstsObj.ObjMaterial.STONE:
                playGameFXAt(this.matStoneHitFX, hitPos, {player: this.virtualOwner});
                break;
        }

        if (damageNumberProps.flipSpawnBoundsBasedOnDir && damageNumberProps.driftDir) { // TODO: Could prob cleanup
            damageNumberProps = {
                ...damageNumberProps,
                minMaxSpawnDistance: ConstsDamageNumber.flipMinMaxBasedOnDriftDir(damageNumberProps.minMaxSpawnDistance, damageNumberProps.driftDir),
            };
        }

        const damageNumberData: DamageNumberData = {
            player: this.virtualOwner,
            text: text,
            color: damageNumberProps.colorString ? Color.fromHex(damageNumberProps.colorString) : Color.white,
            pos: hitPos,
            dir: damageNumberProps.driftDir,
            lifetime: damageNumberProps.lifetime,
            driftDistance: damageNumberProps.driftDistance,
            sizeDelta: damageNumberProps.sizeDelta,
            minMaxSpawnDistance: damageNumberProps.minMaxSpawnDistance,
            animation: damageNumberProps.animation,
            relativeObj: data.targetData,
            changeData: data,
        };

        this.playHudReticleHitFX(data);
        this.playHitDealtFX(data);
        this.showVFXDamageNumber(damageNumberData);
    }

    private onDamageTaken(data: ChangeDataHitInfo) {
        const hitPos = data.sourceData.pos;
        const headPos = this.virtualOwner.head.position.get();
        const playerPos = data.isCrit ? headPos : this.virtualOwner.torso.position.get();
        const dirToHit = Vec3.sub(hitPos, playerPos).normalizeInPlace();

        const playerRight = UtilsGameplay.getRightOfPlayer(this.virtualOwner);
        const hitDotAgainstPlayerRight = playerRight.dot(dirToHit);
        const hitIsToTheSide = Math.abs(hitDotAgainstPlayerRight) > IS_DIRECTION_DOT_THRESHOLD;

        // handle impact feedback
        if (hitIsToTheSide) {
            UtilsGameplay.playHaptics(this.virtualOwner, Math.sign(hitDotAgainstPlayerRight) > 0, 200, HapticStrength.Strong, HapticSharpness.Coarse);
        } else {
            UtilsGameplay.playHaptics(this.virtualOwner, true, 200, HapticStrength.Strong, HapticSharpness.Coarse);
            UtilsGameplay.playHaptics(this.virtualOwner, false, 200, HapticStrength.Strong, HapticSharpness.Coarse);
        }

        const sourceObj = ServerBaseObjRegistry.getObj(data.sourceData.obj);
        const damageSourcePos = sourceObj ? sourceObj.getTargetPartPos(ObjTargetPart.TORSO) ?? sourceObj.getPos() : hitPos;
        // Note that the CompHealth.isAlive is still true here, even though this is a killshot, so we look at hp instead
        const playerIsAlive = (GamePlayer.getGamePlayer(this.virtualOwner)?.health.hp ?? 0) > 0;
        if (playerIsAlive) {
            setVFXParametersAndPlay(this.props.hudHitDirectionalVFX, {players: [this.virtualOwner]}, [
                {key: VFX_PARAM_HIT_SOURCE_POSITION, value: damageSourcePos},
            ]);
        } else {
            console.log(`Trying to stop hudHitDirectionalVFX`);
            stopVFXForPlayer(this.props.hudHitDirectionalVFX, this.virtualOwner);
        }

        playGameFXAt(this.getHitReceivedFX(data), hitPos, {player: this.virtualOwner});
    }

    private playHitDealtFX(data: ChangeDataHitInfo) {
        if (data.isCrit || data.isHeadshotHit) {
            return; // We are handling crit hit's when the entity that gets hit receives damage.
        }

        const typeOfHitFXAndDamageNumberProps = this.getTypeOfHitDealtFXAndDamageNumberProps(data);
        playGameFXAt(typeOfHitFXAndDamageNumberProps.hitFX, data.sourceData.pos, {
            player: this.virtualOwner,
            rot: Quaternion.lookRotation(this.getEffectDirection(data)),
        });
    }

    private getTypeOfHitDealtFXAndDamageNumberProps(data: ChangeDataHitInfo): {hitFX: GameFX, damageNumberProps: DamageNumberProps} {
        switch (data.changeData.changeElement) {
            case EventData.ChangeElement.FIRE:
                return {hitFX: this.burnHitFX, damageNumberProps: ConstsDamageNumber.DAMAGE_NUMBER_PROPS_ELEMENT_FIRE};

            case EventData.ChangeElement.FIRE_BURN:
                return {hitFX: this.burnHitFX, damageNumberProps: ConstsDamageNumber.DAMAGE_NUMBER_PROPS_ELEMENT_FIRE_BURN};

            case EventData.ChangeElement.POISON:
                return {hitFX: this.poisonHitFX, damageNumberProps: ConstsDamageNumber.DAMAGE_NUMBER_PROPS_ELEMENT_POISON};

            default:
                return {hitFX: this.defaultHitFX, damageNumberProps: ConstsDamageNumber.DAMAGE_NUMBER_PROPS_DEFAULT};
        }
    }

    private getEffectDirection(data: ChangeDataHitInfo): Vec3 {
        const targetPos = data.targetData!.position.get();
        const zeroYVec = new Vec3(1, 0, 1);
        return data.sourceData.pos.clone().subInPlace(targetPos).componentMulInPlace(zeroYVec).normalizeInPlace();
    }

    private playHudReticleHitFX(data: ChangeDataHitInfo) {
        const targetColor = data.isHeadshotHit || data.isCrit ? RETICLE_HIT_COLOR_CRIT : RETICLE_HIT_COLOR_BODY;
        if (this.hudHitReticleColor == targetColor) {
            playVFXForPlayer(this.props.hudReticleHitVFX, this.virtualOwner);
            return;
        }

        setVFXParametersAndPlay(this.props.hudReticleHitVFX, {players: [this.virtualOwner]}, [{key: 'color', value: targetColor}])?.then(() => {
            this.hudHitReticleColor = targetColor;
        });
    }

    private getHitReceivedFX(data: ChangeDataHitInfo) {
        if (data.isCrit || data.isHeadshotHit) {
            return this.criticalHitReceivedFX;
        }

        if (data.isShieldHit) {
            return this.shieldHitReceivedFX;
        }

        switch (data.changeData.changeElement) {
            case EventData.ChangeElement.FIRE:
                return this.burnHitReceivedFX;

            case EventData.ChangeElement.FIRE_BURN:
                return this.burningHitReceivedFX;

            default:
                return this.hitReceivedFX;
        }
    }

    private showVFXDamageNumber(damageNumberData: DamageNumberData) {
        if (!this.props.vfxDamageNumber) return;
        this.sendNetworkEvent(this.props.vfxDamageNumber, showDamageNumber, damageNumberData);
    }

    private showTextDamageNumber(damageNumberData: DamageNumberData) {
        if (this.textDamageNumbers.length == 0) {
            return;
        }

        const damageNumber = this.textDamageNumbers[this.textDamageNumberIndex];
        this.sendNetworkEvent(damageNumber, showDamageNumber, damageNumberData);
        this.textDamageNumberIndex = (this.textDamageNumberIndex + 1) % this.textDamageNumbers.length;
    }

    private showIndicatorLine(targetPos: Vec3, targetData: EntityOrPlayer, color: Color) {
        const targetObj = ServerBaseObjRegistry.getObj(targetData);
        if (targetObj) {
            if (targetObj.gameplayObject instanceof Entity) {
                UtilsGameplay.sendNetworkEvent(this, this.props.indicatorLine, EventsNetworked.showLineIndicatorEntity, {targetEntity: targetObj.horizonApiProvider.entity, color: color});
            } else {
                UtilsGameplay.sendNetworkEvent(this, this.props.indicatorLine, EventsNetworked.showLineIndicatorPlayer, {targetPlayer: (targetObj as GamePlayer).owner, color: color});
            }
        } else {
            UtilsGameplay.sendNetworkEvent(this, this.props.indicatorLine, EventsNetworked.showLineIndicatorPos, {targetPos: targetPos, color: color});
        }
    }

    private hideIndicatorLine() {
        this.async.clearTimeout(this.indicatorLineAutoHideAsyncId);
        UtilsGameplay.sendNetworkEvent(this, this.props.indicatorLine, EventsNetworked.hideLineIndicator, {});
    }

    private playPlayerVO(source: Player, vo: UtilsGameplay.EntityOrUndefined) {
        if (this.virtualOwner == source) {
            playSFXForPlayer(vo, source);
        }
    }

    private updateDeathTimer(deltaTime: number) {
        if (this.deathTimer > 0) {
            this.deathTickTimer += deltaTime;
            if (this.deathTickTimer >= 1) {
                this.deathTickTimer -= 1;
                playSFXForPlayer(GlobalSFXBank.instance.props.timerTickSFX, this.virtualOwner);
            }

            this.deathTimer -= deltaTime;
            if (this.deathTimer <= 0) {
                this.deathTimer = 0;
            }
        }
    }

    private onDeath(data: DeathEventData) {
        if (this.virtualOwner == data.targetData) {
            stopVFXForPlayer(this.props.criticalHpWarningVFX_player, this.virtualOwner);

            // owner died
            playGameFXAt(this.deathFX, this.virtualOwner.foot.position.get(), {player: this.virtualOwner});

            const deathData = Game.Game.instance.gameMode ? Game.Game.instance.gameMode.state.config.deathData : ConstsGameMode.GAME_MODE_DEATH_DATA_DEFAULT;

            this.deathTimer = deathData.respawnTime;
            this.deathTickTimer = 0;

            this.lastKiller = data.sourceData.obj;

            this.playPlayerVO(this.virtualOwner, GlobalSFXBank.instance.props.deathVO);

            // this.showScreenTint(SCREEN_TINTER_COLOR_DEATH);

            if (this.lastKiller) {
                this.async.clearTimeout(this.indicatorLineAutoHideAsyncId);
                this.showIndicatorLine(data.sourceData.pos, this.lastKiller, ConstsGame.NEGATIVE_COLOR);
                if (deathData.killerIndicatorDisplayTime > 0) {
                    this.indicatorLineAutoHideAsyncId = this.async.setTimeout(() => this.hideIndicatorLine(), deathData.killerIndicatorDisplayTime * 1000);
                }
            }
        } else if (this.virtualOwner == data.sourceData.obj) {
            // owner is the killer
            let specialVOPlayed = false;

            playSFXForPlayer(GlobalSFXBank.instance.props.targetDownSFX, this.virtualOwner);

            if (this.lastKiller && UtilsGameplay.exists(GlobalSFXBank.instance.props.revengeKillVO)) {
                if (this.lastKiller == data.targetData) {
                    specialVOPlayed = true;
                    this.playPlayerVO(this.virtualOwner, GlobalSFXBank.instance.props.revengeKillVO);
                    this.lastKiller = undefined;
                }
            }

            if (!specialVOPlayed) {
                this.playPlayerVO(this.virtualOwner, GlobalSFXBank.instance.props.targetDownVO);
            }
        } else if (data.targetData instanceof Player) {
            // check if teammate died
            this.playPlayerVO(this.virtualOwner, GlobalSFXBank.instance.props.teammateDownVO);
        }
    }

    private onRevive(data: ReviveEventData) {
        if (this.virtualOwner == data.targetData) {
            if (data.playFX) {
                playGameFX(this.reviveFX, {player: this.virtualOwner});
            }

            this.deathTimer = 0;
            this.deathTickTimer = 0;
            this.hideIndicatorLine();
        }
    }

    private showStatusEffectTextIfNeeded(data: StatusEffectChangedEventData, text: string, shouldShow: (effectData: StatusEffectData) => boolean) {
        if (this.virtualOwner == data.sourceData.obj) {
            const targetObj = ServerBaseObjRegistry.getObj(data.targetData);
            if (!targetObj) {
                return;
            }

            const effectData = ConstsStatusEffect.STATUS_EFFECT_DATA_REGISTRY.get(data.statusEffectId);
            if (!effectData || !shouldShow(effectData)) {
                return;
            }

            this.showTextDamageNumber({
                ...DAMAGE_NUMBER_PROPS_DEFAULT,
                player: this.virtualOwner,
                text: `<size=30%>${text}<br><size=50%> ${effectData.displayName}`,
                color: effectData.color,
                pos: targetObj.getPos(),
                dir: Vec3.zero,
                lifetime: 1.5,
                changeData: {
                    ...CHANGE_DATA_HIT_INFO_DEFAULT,
                    targetData: this.virtualOwner,
                },
            });
        }
    }

    private playAbilityVFX(abilityId: AbilityId) {
        const abilityData = ConstsAbility.ABILITY_DATA_REGISTRY.get(abilityId);
        if (abilityData && abilityData.playActivationEffect) {
            const color = new ColorWithAlpha(abilityData.color.r, abilityData.color.g, abilityData.color.b, 1);
            setVFXParametersAndPlay(this.props.abilityActivationVFX, {}, [{key: PlayerFX.VFX_ACTIVATION_COLOR_ID, value: color}]);
        }
    }
}

Component.register(PlayerFX);
