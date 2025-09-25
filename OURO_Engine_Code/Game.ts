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

import { GameAnalyticsSegmentType } from 'AnalyticsService';
import { ALL_PRESPAWNED_ASSET_IDS, AssetPools, ASSET_POOL_ASSIGN_TIMEOUT_MILLIS } from 'AssetPools';
import { BaseHzComponent } from 'BaseHzComponent';
import { isSourceWorld } from 'ConstsAssetSourceWorld';
import { loadTeamMembers, NEGATIVE_COLOR } from 'ConstsGame';
import { GameModeId } from 'ConstsIdsGameMode';
import { loadAccountLevelData } from 'ConstsLevelAccount';
import { loadAllEquipmentLevelData } from 'ConstsLevelEquipment';
import { loadLoginPromptData } from 'ConstsLoginPrompt';
import { loadLoginRewardData } from 'ConstsLoginRewards';
import { loadPlaytimeRewardData } from 'ConstsPlaytimeRewards';
import { loadPremiumShopItemData } from 'ConstsPremiumShop';
import { loadAllQuestData } from 'ConstsQuests';
import { loadAllRewardData } from 'ConstsRewards';
import * as ConstsStatusEffect from 'ConstsStatusEffect';
import { FONT_STRING } from 'ConstsUI';
import { GAME_MODE_ID } from 'ConstsWorld';
import { onPlayerEnterGame, showHUDLogAll, SpawnPointLocation } from 'Events';
import * as EventsCrossWorld from 'EventsCrossWorld';
import { getCurrentGameMode, onGetCurrentGameMode, setGameMode } from 'EventsCrossWorld';
import { GameActionHelpers } from 'GameActionHelpers';
import * as BaseGameMode from 'GameMode';
import { GamePlayer } from 'GamePlayer';
import { CodeBlockEvents, Component, Player, World } from 'horizon/core';
import { OutOfBoundsManager } from 'OutOfBoundsManager';
import { PlatformServices, PlatformServicesProps, ServerAnalyticsService } from 'PlatformServices';
import { ServerBaseObjRegistry } from 'ServerBaseObjRegistry';
import { logEx } from 'UtilsConsoleEx';
import { asyncTimeout, setGameEntity, setHzObj, waitForMilliseconds, waitUntil } from 'UtilsGameplay';
import { gameplayObjExists, getDebugName } from 'UtilsObj';
import { deletePerPlayerValueForPlayer } from 'UtilsUI';

const UNIX_MILLISECONDS_TIMESTAMPS_TO_KICK_ALL_PLAYERS = [
    1744344000000, // 4/10 @21:00 Pacific
    1744430400000, // 4/11 @21:00 Pacific
    1744516800000, // 4/12 @21:00 Pacific
];

const PLAYER_ALPHA_KICK_WARNING_TIMEOUT_SECONDS = 120;
const PLAYER_ALPHA_KICK_WARNING_MESSAGE_TIME_SECONDS = 12;
const PLAYER_ALPHA_KICK_WARNING_MESSAGE = `${FONT_STRING}<br><br><br><smallcaps><color=#FFEE00>`
    + `<size=100%>Thank you for Playing!</color></size>`
    + `<br><size=30%><br>The alpha window is complete, kick begins in 2 minutes.`;

export class Game extends BaseHzComponent<typeof Game> {
    static propsDefinition = {
        ...BaseHzComponent.propsDefinition,
        ...PlatformServicesProps,
    };

    static instance: Game;
    private static preStarted = false;
    private static started = false;
    private static postStarted = false;

    private playerIsInWaitingAirlock = new Set<Player>();

    static isPreStarted() {
        return Game.preStarted;
    }

    static isStarted() {
        return Game.started;
    }

    static isPostStarted() {
        return Game.postStarted;
    }

    gameMode!: BaseGameMode.GameMode;
    platformServices!: PlatformServices;
    actionHelpers!: GameActionHelpers;
    outOfBoundsHandler!: OutOfBoundsManager;
    playerAssetPools!: AssetPools;

    override async preStart() {
        setHzObj(this);

        super.preStart();

        this.platformServices = new PlatformServices(this, this.props);
        this.platformServices.onPreStart();

        this.actionHelpers = new GameActionHelpers(this);

        this.outOfBoundsHandler = new OutOfBoundsManager(this);

        this.playerAssetPools = new AssetPools(ALL_PRESPAWNED_ASSET_IDS, this);
        this.playerAssetPools.initialize();

        // This HAS to go after PartyManager is initialized
        this.subscribeEvents();

        Game.instance = this;
        setGameEntity(this.entity);

        for (const player of this.world.getPlayers()) {
            logEx(`Game: ${getDebugName(player)} preStart addPlayer`);
            this.addPlayer(player).catch(e => {
                logEx(`Game: ${getDebugName(player)}: Failed to add player from Game::preStart(). error: ${e instanceof Error ? e.message : e}`, 'error');
            });
        }

        try {
            await Promise.all([
                loadTeamMembers(),
                loadAccountLevelData(),
                loadAllEquipmentLevelData(),
                loadAllRewardData(),
                loadAllQuestData(),
                loadLoginRewardData(),
                loadPlaytimeRewardData(),
                loadPremiumShopItemData(),
                loadLoginPromptData(),
            ]);
        } catch (e) {
            console.error(e);
            throw e;
        }

        Game.preStarted = true;
    }

    override async start() {
        await waitUntil(Game.isPreStarted);

        this.platformServices.onStart();

        // default to strike game mode
        this.sendLocalBroadcastEvent(setGameMode, {gameModeId: GAME_MODE_ID});

        Game.started = true;
        this.async.setTimeout(() => this.postStart());
    }

    private async postStart() {
        await waitUntil(Game.isStarted);

        this.platformServices.onPostStart();

        console.log('Starting Game...');

        this.sendLocalBroadcastEvent(EventsCrossWorld.onGameInitialized, {});
        this.scheduleServerShutdown();

        Game.postStarted = true;
    }

    private scheduleServerShutdown() {
        const nowMilliseconds = Date.now();
        UNIX_MILLISECONDS_TIMESTAMPS_TO_KICK_ALL_PLAYERS.forEach(kickTimestampMilliseconds => {
            if (nowMilliseconds > kickTimestampMilliseconds) return;

            const timeUntilKickMilliseconds = kickTimestampMilliseconds - nowMilliseconds;

            this.async.setTimeout(() => this.sendLocalBroadcastEvent(showHUDLogAll, {
                text: PLAYER_ALPHA_KICK_WARNING_MESSAGE,
                color: NEGATIVE_COLOR,
                priority: 0
            }), timeUntilKickMilliseconds - (PLAYER_ALPHA_KICK_WARNING_TIMEOUT_SECONDS * 1000));

            // this.async.setTimeout(() => this.world.getPlayers().forEach(player => new lib2p.World2p(this.world).startGroupTravel(PLAYER_AFK_TIMEOUT_KICK_DESTINATION_WORLD_ID, [player])), timeUntilKickMilliseconds);
        });
    }

    private subscribeEvents() {
        this.connectLocalBroadcastEvent(setGameMode, data => this.setGameMode(data.gameModeId));
        this.connectLocalBroadcastEvent(getCurrentGameMode, _ => this.sendLocalBroadcastEvent(onGetCurrentGameMode, {gameModeId: this.gameMode.state.config.gameModeId, gameMode: this.gameMode}));

        // Player life cycle
        this.connectCodeBlockEvent(
            this.entity,
            CodeBlockEvents.OnPlayerEnterWorld,
            (player) => {
                logEx(`Game: ${getDebugName(player)} OnPlayerEnterWorld addPlayer`);
                this.addPlayer(player).catch(e => {
                    logEx(`Game: ${getDebugName(player)}: Failed to add player from OnPlayerEnterWorld. error: ${e instanceof Error ? e.message : e}`, 'error');
                });
            }
        );

        this.connectCodeBlockEvent(this.entity, CodeBlockEvents.OnPlayerExitWorld, player => {
            logEx(`Game: ${getDebugName(player)} OnPlayerExitWorld removePlayer`);
            try {
                this.removePlayer(player);
            } catch (e) {
                logEx(`Game: ${getDebugName(player)}: Failed to remove player from OnPlayerExitWorld. error: ${e instanceof Error ? e.message : e}`, 'error');
            }
        });

        // Special actions
        this.actionHelpers.registerEventListeners();

        //** Update */
        this.connectLocalBroadcastEvent(World.onUpdate, data => {
            this.platformServices.onUpdate(data.deltaTime);
            this.gameMode?.onUpdate(data.deltaTime);
        });
    }

    private async addPlayer(player: Player) {
        const playerAnalytics = ServerAnalyticsService().getPlayerAnalytics(player);

        playerAnalytics.startSegment(GameAnalyticsSegmentType.LOADING_AIRLOCK);

        this.playerIsInWaitingAirlock.add(player);

        await Promise.all([
            waitUntil(Game.isPostStarted),
            waitUntil(() => gameplayObjExists(player)),
            waitForMilliseconds(3000), // lol
        ]);

        if (!this.playerIsInWaitingAirlock.has(player)) {
            // This is the double OnPlayerEnterWorld case
            logEx(`Game: ${getDebugName(player)} addPlayer NO-OP, removed from airlock`, 'warning');

            // NO-OP for Analytics:
            // If we get two OnPlayerEnterWorlds back-to-back, we don't want to stop analytics here, because the player should be going through the add flow.
            // If we get an equivalent OnPlayerExitWorld for each OnPlayerEnterWorld, we also don't want to stop analytics here, because it should be stopped in removePlayer() for the matching enter.

            return;
        }

        this.playerIsInWaitingAirlock.delete(player);

        const isLoading = GamePlayer.gamePlayerLoading.has(player);
        if (isLoading) {
            logEx(`Game: ${getDebugName(player)} addPlayer NO-OP, already loading`, 'warning');
            return;
        }

        const alreadyLoaded = GamePlayer.gamePlayersById.has(player);
        const alreadyRegistered = ServerBaseObjRegistry.getObj(player);
        if (alreadyLoaded || alreadyRegistered) {
            logEx(`Game: ${getDebugName(player)} addPlayer NO-OP, already added/registered`, 'warning');
            return;
        }

        logEx(`Game: ${getDebugName(player)} addPlayer START`);
        const gamePlayer = new GamePlayer(this, player, this.playerAssetPools);

        try {
            GamePlayer.gamePlayerLoading.add(player);
            gamePlayer.initializeComponents();

            // ===== START LONG STARTUP BLOCK =====
            // IMPORTANT: This is the longest part of our startup flow. Unfortunately, Horizon has a timeout that fails to load you into the world if ANYTHING takes longer than 60 seconds.
            // The timeout for many of these functions is handled at the lowest level possible

            playerAnalytics.startSegment(GameAnalyticsSegmentType.LOADING_CLEANUP_ASSETS);
            await this.playerAssetPools.forceCleanUpAllAssets(player);

            // Claim all Player prespawned assets. Importantly, do *not* claim assets like Weapons or Abilities - these are claimed piecemeal by loadout selection.
            playerAnalytics.startSegment(GameAnalyticsSegmentType.LOADING_CLAIM_ASSETS);
            await this.playerAssetPools.claimAssetsForPlayer(player);

            playerAnalytics.startSegment(GameAnalyticsSegmentType.LOADING_SPAWN_ASSETS);
            await asyncTimeout(this.playerAssetPools.spawnAssetsForPlayer(player), `Timed out during spawn assets`, ASSET_POOL_ASSIGN_TIMEOUT_MILLIS);

            gamePlayer.setOwner(player);

            playerAnalytics.startSegment(GameAnalyticsSegmentType.LOADING_RESTORE_SAVE_DATA);
            await gamePlayer.class.restoreFromSaveData();
            // ===== END LONG STARTUP BLOCK =====

            playerAnalytics.startSegment(GameAnalyticsSegmentType.LOADING_SYSTEMS);
            gamePlayer.resetSystems();
            this.outOfBoundsHandler.addTrackedPlayer(player);
            GamePlayer.gamePlayerLoading.delete(player);
            GamePlayer.gamePlayersById.set(player, gamePlayer);

            playerAnalytics.startSegment(GameAnalyticsSegmentType.LOADING_ENTER_GAME);
            this.setOGFSettingsIfInOGF(gamePlayer);
            this.sendLocalBroadcastEvent(onPlayerEnterGame, {gamePlayer: gamePlayer});
            this.sendPlayerToStartingArea(gamePlayer, () => {});

            logEx(`Game: ${getDebugName(player)} addPlayer SUCCESS`);
        } catch (e) {
            let message = `${e}`;
            let stack = ``;
            if (e instanceof Error) {
                const err = e as Error;
                message = e.message;
                stack = `\n${err.stack?.split('\n')?.slice(2)?.join('\n')}`;
            }
            logEx(`Game: ${getDebugName(player)} addPlayer FAILURE, errors or timeouts. Removing from game. ${message}${stack}`);
            ServerAnalyticsService().getPlayerAnalytics(player).errorMetricEvent(`Game.addPlayer|failedToAddPlayer - ${message}`);
            this.removePlayer(player, gamePlayer);
        }
    }

    private removePlayer(player: Player, gp?: GamePlayer) {
        if (this.playerIsInWaitingAirlock.has(player)) ServerAnalyticsService().getPlayerAnalytics(player).errorMetricEvent('Game.removePlayer|playerExitedBeforeAddPlayerComplete');
        this.playerIsInWaitingAirlock.delete(player);

        const gamePlayer = gp ?? GamePlayer.gamePlayersById.get(player);

        if (gamePlayer) {
            logEx(`Game: ${getDebugName(player)} removePlayer`);

            gamePlayer.persistentStorageService?.removePlayer();

            this.gameMode?.phase?.removePlayer(gamePlayer);
            GamePlayer.gamePlayersById.delete(player);
            GamePlayer.gamePlayerLoading.delete(player);
            gamePlayer.onPlayerExit();
            gamePlayer.onDestroy();

            // Purposely don't await for this
            this.playerAssetPools.cleanupAllAssetsOnRemove(player).catch(err => logEx(`Game: ${getDebugName(player)} removePlayer FAILURE ${err}`));
            this.playerAssetPools.deleteSpawnControllersForPlayer(player);
            this.outOfBoundsHandler.removeTrackedPlayer(player);
            deletePerPlayerValueForPlayer(player);
        }

        ServerAnalyticsService().stopPlayerAnalytics(player);
    }

    private setGameMode(gameMode: GameModeId) {
        console.log(`Game: setGameMode: ${gameMode}`);
        if (this.gameMode) {
            this.gameMode.dispose();
        }

        switch (gameMode) {
            case 'ELIMINATION':
                break;
            case 'POINTS':
                break;
            default:
                console.error(`Unsupported GameMode: ${gameMode}. Implement in Game.ts`);
                return;
        }
    }

    isGameMode(gameModeId: GameModeId) {
        return this.gameMode.state.config.gameModeId == gameModeId;
    }

    playerIsInMatch(player: Player) {
        return this.gameMode.state.getGamePlayers().some((gp) => gp.owner == player);
    }

    private setOGFSettingsIfInOGF(gamePlayer: GamePlayer) {
        if (isSourceWorld(this.world)) {
            this.gameMode?.phase?.applyLocationSettingsToGamePlayer(gamePlayer, SpawnPointLocation.LOBBY);
        }
    }

    private sendPlayerToStartingArea(gamePlayer: GamePlayer, onComplete?: () => void) {
        if (isSourceWorld(this.world)) {
            // Don't move players in OGF (allows 'Preview from here' to function)
            return;
        }

        if (Game.playerNeedsToSeeNux(gamePlayer.owner)) {
            // Nux controller handles teleports if it's needed
            return;
        }

        this.gameMode.phase?.teleportPlayer(gamePlayer.owner, SpawnPointLocation.LOBBY, -1, undefined, onComplete);
    }

    // This lives here to avoid circular references
    public static playerNeedsToSeeNux(player: Player) {
        const gp = GamePlayer.getGamePlayerOrThrow(player);
        const gameModeAllowsNux = Game.instance.gameMode.state.config.allowNux;
        const playerHasSeenNux = gp.persistentStorageService.playerData.getNuxStarted();
        return gameModeAllowsNux && !playerHasSeenNux;
    }
}

Component.register(Game);
