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

import { PrespawnedAssetId } from 'AssetPools';
import { BaseWeapon } from 'BaseWeapon';
import { CurrencyId } from 'ConstsCurrencies';
import { GameContentData } from 'ConstsGameContent';
import { AbilityId } from 'ConstsIdsAbility';
import { ClassId } from 'ConstsIdsClass';
import { StatusEffectId } from 'ConstsIdsStatusEffect';
import { WeaponId } from 'ConstsIdsWeapon';
import { EntityOrPlayer } from 'ConstsObj';
import { StatSourceData } from 'ConstsStats';
import { WeaponData } from 'ConstsWeapon';
import * as EventData from 'EventData';
import { GamePlayer } from 'GamePlayer';
import { LevelSaveData, TimedQuestsSetTrackingData } from 'GamePlayerData';
import { Team } from 'GameTeam';
import { Color, LocalEvent, NetworkEvent, Player, Vec3 } from 'horizon/core';
import { LocalClientUIPlayerAsset, PlayerAsset, ServerUIPlayerAsset } from 'PlayerAsset';

//** TEAM SYSTEM */
export const addPlayerToTeam = new LocalEvent<{player: Player, teamId: number, index?: number}>('addPlayerToTeam');
export const removePlayerFromTeam = new LocalEvent<{player: Player}>('removePlayerFromTeam');

//** GAME FLOW */
export const playVictorySequence = new LocalEvent<{podium: GamePlayer[], crowd: GamePlayer[], showRedBG: boolean}>('playVictorySequence');
export const onVictorySequenceEnded = new LocalEvent<{}>('onVictorySequenceEnded');
export const onPodiumAFKTimeout = new LocalEvent<{player:Player}>('onPodiumAFKTimeout');
export const onGamePhaseTransition = new LocalEvent<{
    fromPhase: string,
    toPhase: string,
    delaySeconds: number,
}>('onStrikeGamePhaseEnded');

export enum EndOfMatchOptions {
    UNDEFINED,
    RETURN_TO_LOBBY,
    JOIN_NEW_GAME,
}

export const playerFinishedVictorySequence = new LocalEvent<{player: Player, endOfMatchOption: EndOfMatchOptions}>('teleportPlayerPostVictorySequence');

//** TRAVEL UI */
export type PartyInviteData = {
    player: Player,
    partyId: number,
    slotIndex?: number,
    source?: Player,
}

export const createParty = new LocalEvent<{player: Player}>('createParty');
export const disbandParty = new LocalEvent<{player: Player}>('disbandParty');
export const joinParty = new LocalEvent<PartyInviteData>('joinParty');
export const leaveParty = new LocalEvent<{player: Player}>('leaveParty');

export const sendPartyInvite = new LocalEvent<PartyInviteData>('sendPartyInvite');
export const cancelPartyInvite = new LocalEvent<PartyInviteData>('cancelPartyInvite');
export const onPartyInviteAccepted = new LocalEvent<PartyInviteData>('onPartyInviteAccepted');
export const onPartyInviteDeclined = new LocalEvent<PartyInviteData>('onPartyInviteDeclined');

export const setIsReadyToTravel = new LocalEvent<{player: Player, isReady: boolean}>('setIsReadyToTravel');
export const startTravel = new LocalEvent<{
    player: Player,
    destinationId: bigint,
    timeOut: number,
    matchmakingGroupSize: number,
}>('startPartyTravel');
export const cancelTravel = new LocalEvent<{player: Player}>('cancelPartyTravel');
export const forceTravel = new LocalEvent<{player: Player}>('forceTravel');

//** WEAPON COMPONENT */
export type OnWeaponGrabPayload = {baseWeapon: BaseWeapon, isRightHand: boolean, player: Player};
export const onWeaponGrab = new LocalEvent<OnWeaponGrabPayload>('onWeaponGrab');
export type OnWeaponReleasePayload = {weaponId: WeaponId, player: Player};
export const onWeaponRelease = new LocalEvent<OnWeaponReleasePayload>('onWeaponRelease');
export type OnWeaponDisposedPayload = {weaponId: WeaponId, player: Player};
export const onWeaponDisposed = new LocalEvent<OnWeaponDisposedPayload>('onWeaponDisposed');
export type OnWeaponAmmoChangedPayload = {currentAmmo: number, weaponData: WeaponData};
export const onWeaponAmmoChanged = new LocalEvent<OnWeaponAmmoChangedPayload>('onWeaponAmmoChanged');
export const onWeaponReloadStart = new LocalEvent<{}>('onWeaponReloadStart');
export const onWeaponReloadComplete = new LocalEvent<{}>('onWeaponReloadComplete');

//** TARGETING RETICLE */
export const setAutoFireSpread = new LocalEvent<{spread: number}>('setAutoFireSpread');
export const setCanFire = new LocalEvent<{canFire: boolean}>('setCanFire');
export const setTargetingReticleText = new LocalEvent<{text: string}>('setTargetingReticleText');

//** DAMAGE */
export type OnDamageForStatsData = EventData.ChangeDataHitInfo & {isValidTarget: boolean, actualDamage: number, damageMitigated: number};
export const onDamageForStats = new LocalEvent<OnDamageForStatsData>('onDamageForStats');
export const onDamageTaken = new LocalEvent<EventData.ChangeDataHitInfo>('onDamageTaken');
export const onDamageDealt = new LocalEvent<EventData.ChangeDataHitInfo>('onDamageDealt');
export  type OnKillForStatsData = EventData.ChangeDataHitInfo & {damagers: [Player, StatSourceData][], isValidTarget: boolean};
export const onKillForStats = new LocalEvent<OnKillForStatsData>('onKillForStats');

export type DeathEventData = EventData.ChangeDataTarget & {
    killerElimStreak?: number,
    targetLastElimStreak?: number,
    isHeadShot: boolean,
}
export const onDeath = new LocalEvent<DeathEventData>('onDeath');
export const onLatestKill = new LocalEvent<{player: Player}>('onKill');

//** HEALING */
export type HealthHealedEventData = EventData.ChangeDataTarget & {
    // who was healed, data, by who
    targetData: EntityOrPlayer,
}
export const onHealthHealed = new LocalEvent<HealthHealedEventData>('onHealthHealed');

export type ReviveEventData = {
    targetData: EntityOrPlayer,
    sourceData: EventData.SourceData,
    playFX: boolean
}
export const onRevive = new LocalEvent<ReviveEventData>('onRevive');

//** STATUS EFFECT */
export type StatusEffectChangedEventData = {
    targetData: EntityOrPlayer,
    statusEffectId: StatusEffectId,
    sourceData: EventData.SourceData,
}
export type StatusEffectAppliedEventData = StatusEffectChangedEventData & {
    duration: number,
}
export const onStatusEffectApplied = new LocalEvent<StatusEffectAppliedEventData>('onStatusEffectApplied');

export const onStatusEffectRemoved = new LocalEvent<StatusEffectChangedEventData>('onStatusEffectRemoved');

export const onStatusEffectCompleted = new LocalEvent<StatusEffectChangedEventData>('onStatusEffectCompleted');

//** PLAYER */
export const onPlayerEnterGame = new LocalEvent<{gamePlayer: GamePlayer}>('onPlayerEnterGame');

export type PlayerHealthChangedData = {player: Player, percent: number, animationTimeSeconds: number};
export const onPlayerHpChange = new LocalEvent<PlayerHealthChangedData>('onPlayerHpChange');
export const onPlayerUnderShieldHpChange = new LocalEvent<PlayerHealthChangedData>('onPlayerUnderShieldHpChange');

export const onPlayerUnderShieldEvent = new LocalEvent<{player: Player, eventId: number}>('onPlayerUnderShieldEvent');

export const onPlayerClassChange = new LocalEvent<{player: Player, classId: ClassId}>('onPlayerClassChange');

export const onPlayerLoadoutChange = new LocalEvent<{player: Player}>('onPlayerLoadoutChanged');

export const onPlayerAbilityUnlocked = new LocalEvent<{player: Player, abilityId: AbilityId}>('onPlayerAbilityUnlocked');
export const onPlayerAbilityEquipped = new LocalEvent<{player: Player, abilitySlot: number, abilityId: AbilityId, playFX: boolean, messageCounterId: number}>('onPlayerAbilityEquipped');

export const onPlayerAirborne = new LocalEvent<{}>('onPlayerAirborne');
export const onPlayerLanded = new LocalEvent<{}>('onPlayerLanded');
export const onPlayerJumped = new LocalEvent<{jumpCount: number}>('onPlayerJumped');

export const onPlayerEquipmentUnlocked = new LocalEvent<{player: Player, gameContentData: GameContentData<any>}>('onPlayerUnlockEquipment');
export const onPlayerHighValueContentUnlocked = new LocalEvent<{player:Player, contentName:string, categoryName:string}>('onPlayerHighValueContentUnlocked');

//** PLAYER UI */

export type showHudLogDataType = {player: Player, text: string, color: Color, priority: number};
export const showHUDLog = new LocalEvent<showHudLogDataType>('showHUDLog');
export const showHUDLogAll = new LocalEvent<{text: string, color: Color, priority: number, outOfMatchPlayersOnly?:boolean}>('showHUDLogAll');


export const showLineIndicator = new LocalEvent<{player: Player, targetPos: Vec3, targetData: EntityOrPlayer, color: Color}>('showLineIndicator');
export const hideLineIndicator = new LocalEvent<{player: Player}>('hideLineIndicator');

export const setHUDVisibility = new LocalEvent<{visible: boolean, player: Player}>('setHUDVisibility');
export const showLoginPromptIfNeeded = new LocalEvent<{player: Player}>('showLoginPromptIfNeeded');

export const setRecordingModeEnabled = new LocalEvent<{enabled: boolean, player: Player}>('setRecordingModeEnabled');

export const onGameTimeChange = new LocalEvent<{time: number}>('onGameTimeChange');

export const updateTeamHealthBars = new LocalEvent<PlayerHealthChangedData & {team: Team}>('updateTeamHealthBars');

export const setPlayerInputIsBlocked = new LocalEvent<{isBlocked: boolean, player: Player}>('setPlayerInputIsBlocked');

//** Assets
export const registerPrespawnedAsset = new LocalEvent<{
    prespawnedAssetId: PrespawnedAssetId,
    component: PlayerAsset<any> | LocalClientUIPlayerAsset<any> | ServerUIPlayerAsset<any>,
    isClientLocalAsset: boolean,
}>('registerPrespawnedAsset');

// This is a string because the editor properties can't be enums :(
export enum SpawnPointLocation {
    UNDEFINED = '',
    LOBBY = 'lobby',
    ARENA = 'arena',
    PODIUM = 'podium',
    CROWD = 'crowd',
    NUXJAIL = 'nux',
}

export enum SpawnScheme {
    TEAM_AND_INDEX,
    SAFETY_AND_TEAM_PROXIMITY,
    VICTORY_CONDITIONS,
}

export interface TeleportData {
    player: Player,
    spawnPointLocationTag: string,
    teamId: number,
    index: number,
    spawnScheme?: SpawnScheme,
    onComplete?: () => void,
}

export const teleportArenaPlayer = new LocalEvent<TeleportData>('teleportArenaPlayer');

export type NametagSettingsPayload = {allies: Player[], enemies: Player[], location: SpawnPointLocation, showAllyHealth: boolean};
export const configureNametagAndHealthbarSettings = new LocalEvent<NametagSettingsPayload>('configureNametagAndHealthbarVisibility');
export const showHealthbarTemporarily = new LocalEvent<{players: Player[], temporaryDurationMillis: number}>('showHealthbarTemporarily');

//** CURRENCIES */
export const onCurrencyAmountChanged = new LocalEvent<{player: Player, currencyId: CurrencyId, previousAmount: number, currentAmount: number}>('onCurrencyAmountChanged');

//** SEEN STATE */
export const onEntitlementGrantAndSeenStateUpdated = new LocalEvent<{player: Player}>('onEntitlementGrantAndSeenStateUpdated');

//** REWARDS */
export const onPlayerTitleChanged = new LocalEvent<{player: Player, titleId: string}>('onPlayerTitleChanged');
export const onPlayerBgCardChanged = new LocalEvent<{player: Player, bgCardId: string}>('onPlayerBgCardChanged');
export const onPlayerStickerSlot1Changed = new LocalEvent<{player: Player, stickerId: string}>('onPlayerStickerSlot1Changed');
export const onPlayerStickerSlot2Changed = new LocalEvent<{player: Player, stickerId: string}>('onPlayerStickerSlot2Changed');
export const onPlayerWeaponsSkinChanged = new LocalEvent<{player: Player, weaponId: WeaponId, skinId: string}>('onPlayerWeaponsSkinChanged');

//** LEVELS */
export const onPlayerAccountLevelDataChanged = new LocalEvent<{player: Player, readonly prevLevelSaveData: LevelSaveData, readonly levelSaveData: LevelSaveData}>('onPlayerAccountLevelDataChanged');
export const onWeaponLevelDataChanged = new LocalEvent<{player: Player, weaponId: WeaponId, readonly levelSaveData: LevelSaveData}>('onWeaponLevelDataChanged');
export const onAbilityLevelDataChanged = new LocalEvent<{player: Player, abilityId: AbilityId, readonly levelSaveData: LevelSaveData}>('onAbilityLevelDataChanged');

//** QUESTS */
export const onDailyQuestsChanged = new LocalEvent<{player: Player, questsSetTrackingData: TimedQuestsSetTrackingData}>('onDailyQuestsChanged');
export const onWeeklyQuestsChanged = new LocalEvent<{player: Player, questsSetTrackingData: TimedQuestsSetTrackingData}>('onWeeklyQuestsChanged');

export const onPlaytimeTick = new LocalEvent<{player: Player}>('onPlaytimeRewardTick');

//** OBJECTS */
export const onReplicatedObjectsUpdated = new LocalEvent<{}>('onReplicatedObjectsUpdated');

/* DEBUG */
export const showSplashAndConeHitDebugLines = new LocalEvent<{show: boolean}>('showSplashAndConeHitDebugLines');
export const showSplashDebugVisuals = new LocalEvent<{show: boolean}>('showSplashDebugVisuals');
export const showConeDebugVisuals = new LocalEvent<{show: boolean}>('showConeDebugVisuals');
export const toggleHUDDebugYOffset = new LocalEvent<{}>('toggleHUDDebugYOffset');
export const onDebugDrawInitialized = new NetworkEvent<{}>('onDebugDrawInitialized');

//** SOCIAL */
export const onPlayerFriendCacheUpdated = new LocalEvent<{}>('onPlayerFriendCacheUpdated');

//** NUX */
export const nuxSwapButtonPressed = new LocalEvent<{}>('nuxSwapButtonPressed');
export const nuxShowHowToBuyEquipment = new LocalEvent<{player: Player}>('nuxShowHowToBuyEquipment');
export const nuxFirstEquipmentPurchaseMade = new LocalEvent<{player: Player, equipmentName: string}>('nuxFirstEquipmentPurchaseMade');
export const nuxSetHUDVisibility = new LocalEvent<{player: Player, visible: boolean}>('nuxSetHUDVisibility');

//** MATCHMAKING */
export const matchmakingTeamsFormed = new LocalEvent<{teams: GamePlayer[][]}>('matchmakingTeamsFormed');
