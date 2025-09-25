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

import * as Events from 'Events';
import {
    onDeath,
    onPlayerAccountLevelDataChanged,
    onPlayerEnterGame,
    onPlayerEquipmentUnlocked,
    onPlayerHighValueContentUnlocked,
    setHUDVisibility,
    showHudLogDataType,
    toggleHUDDebugYOffset
} from 'Events';
import { onCameraModeChanged } from 'EventsNetworked';

import { PrespawnedAssetId } from 'AssetPools';
import { BaseUITextLog, BaseUITextLogEntry, COLOR_HEX_PLAYER_HIGHLIGHT, UITextLogEntryKill, UITextLogEntryStatusEffect, UITextLogEntrySystemEvent } from 'BaseUITextLog';
import { TEAM_VIDEO_CAPTURE_TEAM } from 'ConstsGame';
import { StatusEffectId } from 'ConstsIdsStatusEffect';
import { LoadoutSlot } from 'ConstsLoadout';
import { Game } from 'Game';
import { GamePlayer } from 'GamePlayer';
import { CameraMode } from 'horizon/camera';
import { AttachablePlayerAnchor, CodeBlockEvents, Color, Component, Player, PropTypes, Quaternion, Vec3, World } from 'horizon/core';
import { ServerPlayerAsset } from 'PlayerAsset';
import * as UtilsGameplay from 'UtilsGameplay';
import {
    attachToPlayer,
    detach,
    getRandom,
    setLocalPos,
    setLocalPosRotScale,
    setVisibilityForPlayers,
    setVisible,
    truncateCustomUIText,
    truncateRichText
} from 'UtilsGameplay';

const UPDATE_RATE_LIMIT = 0.1;

const HUD_LOG_LOCAL_Y_POS = 0.015;
const HUD_LOG_LOCAL_Z_POS = 0.2;

const HUD_SYSTEM_LOG_LOCAL_POS = new Vec3(0.2, HUD_LOG_LOCAL_Y_POS, HUD_LOG_LOCAL_Z_POS);
const HUD_PLAYER_STATUS_LOG_LOCAL_POS = new Vec3(-0.2, HUD_LOG_LOCAL_Y_POS, HUD_LOG_LOCAL_Z_POS);

const LOG_ENTRIES_MAX_LEFT: number = 3;
const LOG_REWARD_COLOR_TAG = '<color=#E7D000{0}>';
const LOG_PLAYER_NAME_MAX_LENGTH: number = 12;

const LOG_TEXT_PLAYER_ENTER = [
    ' entered the lobby',
    ' slammed into the lobby',
    ' glided into the lobby',
    ' is ready to rumble',
];

const LOG_TEXT_PLAYER_EXIT = ' left the lobby';

const LOG_TEXT_PREFIX_MULTI_LINE_HEIGHT = '<line-height=95%>';
const LOG_TEXT_POSTFIX_MULTI_LINE_HEIGHT = '</line-height>';


export class PlayerHUD extends ServerPlayerAsset<typeof PlayerHUD> {
    static propsDefinition = {
        spatialContentParent: {type: PropTypes.Entity},
        uiSystemLogText: {type: PropTypes.Entity},
        uiPlayerStatusLogText: {type: PropTypes.Entity},
    };

    override readonly prespawnedAssetId: PrespawnedAssetId = 'PlayerHUD';

    private systemLog!: BaseUITextLog;
    private playerStatusLog!: BaseUITextLog;
    private updateRateLimitTimer = 0;

    override onPreStart() {
        this.updateLogLocalPositions();
        this.updateSpatialContentForCameraMode(CameraMode.FirstPerson);

        this.systemLog = new BaseUITextLog(this, this.props.uiSystemLogText, LOG_ENTRIES_MAX_LEFT);
        this.playerStatusLog = new BaseUITextLog(this, this.props.uiPlayerStatusLogText);

        this.connectLocalBroadcastEvent(Events.showHUDLog, (data: showHudLogDataType) => {
            if (this.virtualOwner != data.player) return;
            this.appendSystemLog(data.text, data.color, data.priority);
        });

        this.connectLocalBroadcastEvent(Events.showHUDLogAll, (data) => {
            if (data.outOfMatchPlayersOnly && Game.instance.playerIsInMatch(this.virtualOwner)) {
                return;
            }
            this.appendSystemLog(data.text, data.color, data.priority);
        });

        // Logged system moments
        this.connectLocalBroadcastEvent(onPlayerEnterGame, (data) => {
            if (Game.instance.playerIsInMatch(this.virtualOwner)) {
                return;
            }

            const playerName = this.getDisplayName(data.gamePlayer.owner);
            this.appendSystemLog(playerName + getRandom(LOG_TEXT_PLAYER_ENTER), Color.white);
        });

        this.connectCodeBlockEvent(this.entity, CodeBlockEvents.OnPlayerExitWorld, (player) => {
            if (Game.instance.playerIsInMatch(this.virtualOwner)) {
                return;
            }
            const playerName = this.getDisplayName(player);
            this.appendSystemLog(playerName + LOG_TEXT_PLAYER_EXIT, Color.white);
        });

        this.connectLocalBroadcastEvent(onPlayerAccountLevelDataChanged, (data) => {
            if (Game.instance.playerIsInMatch(this.virtualOwner) || data.prevLevelSaveData.level >= data.levelSaveData.level) {
                return;
            }
            const playerName = this.getDisplayName(data.player);
            this.appendSystemLog(`${playerName} reached level ${data.levelSaveData.level}!`);
        });

        this.connectLocalBroadcastEvent(onPlayerEquipmentUnlocked, (data) => {
            if (Game.instance.playerIsInMatch(this.virtualOwner)) {
                return;
            }
            const playerName = this.getDisplayName(data.player);
            switch (data.gameContentData.loadoutSlot) {
                case LoadoutSlot.WEAPON_PRIMARY: // fallthrough
                case LoadoutSlot.WEAPON_SECONDARY:
                    this.appendSystemLog(`${LOG_TEXT_PREFIX_MULTI_LINE_HEIGHT}${playerName} unlocked<br>the ${data.gameContentData.displayName}${LOG_TEXT_POSTFIX_MULTI_LINE_HEIGHT}`);
                    break;
                case LoadoutSlot.ABILITY_PRIMARY: // fallthrough
                case LoadoutSlot.ABILITY_UTILITY:
                    this.appendSystemLog(`${LOG_TEXT_PREFIX_MULTI_LINE_HEIGHT}${playerName} unlocked<br>${data.gameContentData.displayName}${LOG_TEXT_POSTFIX_MULTI_LINE_HEIGHT}`);
                    break;
                default:
                // no-op
            }
        });

        this.connectLocalBroadcastEvent(onPlayerHighValueContentUnlocked, (data) => {
            if (Game.instance.playerIsInMatch(this.virtualOwner)) {
                return;
            }
            const playerName = this.getDisplayName(data.player);
            this.appendSystemLog(`${LOG_TEXT_PREFIX_MULTI_LINE_HEIGHT}${playerName} unlocked<br>the ${data.contentName} ${data.categoryName}!${LOG_TEXT_POSTFIX_MULTI_LINE_HEIGHT}`);
        });

        // Gameplay
        this.connectLocalBroadcastEvent(onDeath, (data) => {
            this.appendSystemLogEntry(new UITextLogEntryKill(data, this.virtualOwner));
        });

        // Status Effects
        this.connectLocalBroadcastEvent(Events.onStatusEffectApplied, (data) => {
            if (this.virtualOwner != data.targetData) return;
            this.addStatusEffectLog(data.statusEffectId);
        });

        this.connectLocalBroadcastEvent(Events.onStatusEffectRemoved, (data) => {
            if (this.virtualOwner != data.targetData) return;
            this.removeStatusEffectLog(data.statusEffectId);
        });

        this.connectLocalBroadcastEvent(Events.onStatusEffectCompleted, (data) => {
            if (this.virtualOwner != data.targetData) return;
            this.removeStatusEffectLog(data.statusEffectId);
        });

        this.connectLocalBroadcastEvent(World.onUpdate, (data) => this.update(data.deltaTime));

        UtilsGameplay.setVisibilityForPlayersOnPlayerEnterWorld(this, this.entity, () => [this.virtualOwner]);

        setVisible(this.entity, false);
        setVisibilityForPlayers(this.entity, []);
    }

    override onStart() {

    }

    getDisplayName(player: Player) {
        let nameText = truncateCustomUIText(player.name.get(), LOG_PLAYER_NAME_MAX_LENGTH);
        if (player == this.virtualOwner) {
            nameText = `<color=${COLOR_HEX_PLAYER_HIGHLIGHT}>${nameText}</color>`;
        }
        return nameText;
    }

    override onAssignVirtualOwner() {
        setVisible(this.entity, true);
        setVisibilityForPlayers(this.entity, [this.virtualOwner]);
        UtilsGameplay.setVisibilityForPlayersOnCameraModeChanged(this, this.entity, this.virtualOwner, () => [this.virtualOwner]);

        attachToPlayer(this.entity, this.virtualOwner, AttachablePlayerAnchor.Head);
        UtilsGameplay.attachToPlayerOnCameraModeChanged(this, this.entity, this.virtualOwner, AttachablePlayerAnchor.Head);

        this.updateLogLocalPositions();
        this.updateSpatialContentForCameraMode(CameraMode.FirstPerson);

        this.connectLocalEvent(this.virtualOwner, setHUDVisibility, (data) => setVisible(this.entity, data.visible));
        this.connectLocalEvent(this.virtualOwner, toggleHUDDebugYOffset, (data) => this.debugOffsetHUDYAxis());
        this.connectNetworkEvent(this.virtualOwner, onCameraModeChanged, (data) => this.updateSpatialContentForCameraMode(data.cameraMode));
    }

    override onUnassignVirtualOwner() {
        detach(this.entity);
        setVisible(this.entity, false);
        setVisibilityForPlayers(this.entity, []);
    }

    private update(deltaTime: number) {
        if (this.virtualOwner == this.world.getServerPlayer()) return;

        this.updateRateLimitTimer += deltaTime;
        if (this.updateRateLimitTimer < UPDATE_RATE_LIMIT) {
            return;
        }
        this.updateRateLimitTimer = -UPDATE_RATE_LIMIT;
    }

    private updateLogLocalPositions() {
        setLocalPos(this.props.uiSystemLogText, HUD_SYSTEM_LOG_LOCAL_POS);
        setLocalPos(this.props.uiPlayerStatusLogText, HUD_PLAYER_STATUS_LOG_LOCAL_POS);
    }

    private updateSpatialContentForCameraMode(cameraMode: CameraMode) {
        const isFirstPerson = cameraMode == CameraMode.FirstPerson;
        const scale = isFirstPerson ? 1 : 0.7;
        const scaleVec = new Vec3(scale, scale, scale);
        const yOffset = isFirstPerson ? 0 : -0.026;
        const posVec = new Vec3(0, yOffset, 0);
        setLocalPosRotScale(this.props.spatialContentParent, posVec, Quaternion.one, scaleVec);
    }

    private debugOffsetHUDYAxis() {
        this.updateLogLocalPositions();
    }

    private appendSystemLog(text: string, color: Color = Color.white, priority: number = 0) {
        this.appendSystemLogEntry(new UITextLogEntrySystemEvent(text, color, priority));
    }

    private appendSystemLogEntry(logEntry: BaseUITextLogEntry) {
        const gp = GamePlayer.getGamePlayer(this.virtualOwner);

        setVisibilityForPlayers(this.entity, [this.virtualOwner]);
        this.systemLog.add(logEntry);
    }

    private addStatusEffectLog(statusEffectId: StatusEffectId) {
        const gp = GamePlayer.getGamePlayer(this.virtualOwner);
        if (!gp || TEAM_VIDEO_CAPTURE_TEAM.includes(gp.playerName)) return;

        const statusEffectHandler = gp.statusEffects.getHandler(statusEffectId);
        if (!statusEffectHandler || !statusEffectHandler.effectData.showOnHUD) {
            return;
        }

        const existingStatusEffectEntries = this.playerStatusLog.getBaseEntriesOfType(UITextLogEntryStatusEffect);
        if (existingStatusEffectEntries.filter((entry) => entry.statusEffectHandler == statusEffectHandler).length > 0) {
            return;
        }

        this.playerStatusLog.add(new UITextLogEntryStatusEffect(statusEffectHandler));
    }

    private removeStatusEffectLog(statusEffectId: StatusEffectId) {
        const gp = GamePlayer.getGamePlayer(this.virtualOwner);
        if (!gp) return;

        const existingStatusEffectEntries = this.playerStatusLog.getBaseEntriesOfType(UITextLogEntryStatusEffect);

        existingStatusEffectEntries.filter((entry) => {
            if (entry.statusEffectHandler.effectData.id == statusEffectId) {
                this.playerStatusLog.remove(entry);
            }
        });
    }

    private getPlayerName(player: Player) {
        return truncateRichText(player.name.get(), LOG_PLAYER_NAME_MAX_LENGTH);
    }
}

Component.register(PlayerHUD);
