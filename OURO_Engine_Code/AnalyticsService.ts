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

import { Component, Player, Vec3 } from 'horizon/core';
import { InWorldAnalytics, MetricEvent, MetricTypes, SegmentEvent, SegmentEventType, SegmentType } from 'horizon/in_world_analytics';
import { GameModeId } from 'ConstsIdsGameMode';
import { UNDEFINED } from 'EventData';
import { onDeath } from 'Events';
import { setGameMode } from 'EventsCrossWorld';
import { onWeaponGrab } from 'EventsNetworked';
import { GamePlayer } from 'GamePlayer';
import { ServerPlatformService } from 'PlatformServices';
import { TIME_UNITS } from 'UtilsMath';
import { gameplayObjExists } from 'UtilsObj';
import { generateUUIDv4, getOrDefaultMap, stringifyWithBigInt } from 'UtilsTypescript';
import {PrespawnedAssetId} from 'AssetPools';
import {WeaponId} from 'ConstsIdsWeapon';
import {StatId} from 'ConstsIdsStat';
import {PlayerStats} from 'PlayerStats';
import {AbilityId} from 'ConstsIdsAbility';
import {toStringSafe} from 'UtilsGameplay';
import * as hzAnalytics from 'AnalyticsTypes';

const DEBUG_LOGGING_ENABLED = false;

export const DELIMITER = '|';

const REQUEST_RATE_LIMIT_PER_SECOND = 64;
// This is an arbitrary depth; keep an eye on this. This is a very spiky call, we mostly send end of match events, so a deep queue isn't a bad thing, as long as it eventually gets flushed
const REQUEST_QUEUE_MAX_DEPTH = 5000;
const MAX_RETRIES_TO_SEND_EVENTS = 3;

export const HEARTBEAT_INTERVAL_SECONDS = 1;
export const KILLER_IDENTIFIER_VALUE = 1;
export const VICTIM_IDENTIFIER_VALUE = -1;

export enum GameAnalyticsSegmentType {
    LOADING_AIRLOCK = 'LOADING_AIRLOCK',
    LOADING_CLEANUP_ASSETS = 'LOADING_CLEANUP_ASSETS',
    LOADING_CLAIM_ASSETS = 'LOADING_CLAIM_ASSETS',
    LOADING_SPAWN_ASSETS = 'LOADING_SPAWN_ASSETS',
    LOADING_RESTORE_SAVE_DATA = 'LOADING_RESTORE_SAVE_DATA',
    LOADING_SYSTEMS = 'LOADING_SYSTEMS',
    LOADING_ENTER_GAME = 'LOADING_ENTER_GAME',
    NUX = 'NUX',
    LOBBY = 'LOBBY',
    ROUND = 'ROUND',
    ROUND_RESOLUTION = 'ROUND_RESOLUTION',
    PODIUM = 'PODIUM',
}

const STRIKE_SEGMENT_TYPE_TO_HORIZON_SEGMENT_TYPE: Map<GameAnalyticsSegmentType, hzAnalytics.SegmentType> = new Map([
    [GameAnalyticsSegmentType.LOADING_AIRLOCK, hzAnalytics.SegmentType.OTHER],
    [GameAnalyticsSegmentType.LOADING_CLEANUP_ASSETS, hzAnalytics.SegmentType.OTHER],
    [GameAnalyticsSegmentType.LOADING_CLAIM_ASSETS, hzAnalytics.SegmentType.OTHER],
    [GameAnalyticsSegmentType.LOADING_SPAWN_ASSETS, hzAnalytics.SegmentType.OTHER],
    [GameAnalyticsSegmentType.LOADING_RESTORE_SAVE_DATA, hzAnalytics.SegmentType.OTHER],
    [GameAnalyticsSegmentType.LOADING_SYSTEMS, hzAnalytics.SegmentType.OTHER],
    [GameAnalyticsSegmentType.LOADING_ENTER_GAME, hzAnalytics.SegmentType.OTHER],
    [GameAnalyticsSegmentType.NUX, hzAnalytics.SegmentType.TUTORIAL],
    [GameAnalyticsSegmentType.LOBBY, hzAnalytics.SegmentType.LOBBY],
    [GameAnalyticsSegmentType.ROUND, hzAnalytics.SegmentType.MAIN],
    [GameAnalyticsSegmentType.ROUND_RESOLUTION, hzAnalytics.SegmentType.MAIN],
    [GameAnalyticsSegmentType.PODIUM, hzAnalytics.SegmentType.MAIN],
]);

export class PlayerAnalytics {
    private hasStartedAnalytics = false;

    private currentSegmentType!: GameAnalyticsSegmentType;
    private currentSegmentId!: string;
    private currentSegmentStartTimestamp!: number;
    private readonly heartbeatAsyncInterval!: number;

    constructor(
        private player: Player,
        private globalAnalyticsState: GlobalAnalyticsState,
        private eventQueues: AnalyticsEventQueues,
        private horizonApiProvider: Component
    ) {
        this.heartbeatAsyncInterval = this.horizonApiProvider.async.setInterval(() => this.heartbeat(), HEARTBEAT_INTERVAL_SECONDS * TIME_UNITS.MILLIS_PER_SECOND);
    }

    public terminate() {
        this.endAbortSegment();
        this.horizonApiProvider.async.clearInterval(this.heartbeatAsyncInterval);
    }

    public startSegment(type: GameAnalyticsSegmentType) {
        if (type == this.currentSegmentType) return;

        this.endSegment();

        this.hasStartedAnalytics = true;

        this.currentSegmentType = type;
        this.currentSegmentId = generateUUIDv4();
        this.currentSegmentStartTimestamp = Date.now();

        this.eventQueues.startSegment(this.player, this.globalAnalyticsState.currentMatchId, this.currentSegmentId, this.globalAnalyticsState.currentGameModeId, this.getHorizonSegmentType(), this.getSegmentName());
    }

    private heartbeat() {
        if (!this.hasStartedAnalytics) {
            return;
        }

        this.eventQueues.heartbeat(this.player, this.globalAnalyticsState.currentMatchId, this.currentSegmentId, this.globalAnalyticsState.currentGameModeId, this.getHorizonSegmentType(), this.getSegmentName(), this.getSecondsInSegment(), this.getPlayerPosition(this.player));
    }

    private endSegment() {
        if (!this.hasStartedAnalytics) {
            return;
        }

        this.eventQueues.endSegment(this.player, this.globalAnalyticsState.currentMatchId, this.currentSegmentId, this.globalAnalyticsState.currentGameModeId, this.getHorizonSegmentType(), this.getSegmentName(), this.getSecondsInSegment());
    }

    private endAbortSegment() {
        if (!this.hasStartedAnalytics) {
            return;
        }

        this.eventQueues.endAbortSegment(this.player, this.globalAnalyticsState.currentMatchId, this.currentSegmentId, this.globalAnalyticsState.currentGameModeId, this.getHorizonSegmentType(), this.getSegmentName(), this.getSecondsInSegment());
    }

    private getHorizonSegmentType(): hzAnalytics.SegmentType {
        const horizonSegmentType = STRIKE_SEGMENT_TYPE_TO_HORIZON_SEGMENT_TYPE.get(this.currentSegmentType);
        if (!horizonSegmentType) {
            throw new Error(`Strike analytics segment type ${this.currentSegmentType} does not have a configured Horizon analytics segment type`);
        }
        return horizonSegmentType;
    }

    private getSegmentName() {
        if (this.currentSegmentType == GameAnalyticsSegmentType.ROUND) {
            return `${this.currentSegmentType}${this.globalAnalyticsState.currentRoundNumber}`;
        }

        return this.currentSegmentType.toString();
    }

    private getSecondsInSegment(): number {
        return Math.floor(Date.now() - this.currentSegmentStartTimestamp) / TIME_UNITS.MILLIS_PER_SECOND;
    }

    public weaponGrabMetricEvent(weaponId: WeaponId) {
        this.eventQueues.queueMetricEvent(this.player, this.currentSegmentId, MetricTypes.ACTION, `WEAPON_SWAP|${weaponId}`, 1, this.getPlayerPosition(this.player));
    }

    public killerMetricEvent(killUuid: string) {
        this.eventQueues.queueMetricEvent(this.player, this.currentSegmentId, MetricTypes.DEATH, killUuid, KILLER_IDENTIFIER_VALUE, this.getPlayerPosition(this.player));
    }

    public deathMetricEvent(killUuid: string) {
        this.eventQueues.queueMetricEvent(this.player, this.currentSegmentId, MetricTypes.DEATH, killUuid, VICTIM_IDENTIFIER_VALUE, this.getPlayerPosition(this.player));
    }

    public warnMetricEvent(errorName: string) {
        this.eventQueues.queueMetricEvent(this.player, this.currentSegmentId, MetricTypes.OTHER, `WARN|${errorName}`, 1);
    }

    public errorMetricEvent(errorName: string) {
        this.eventQueues.queueMetricEvent(this.player, this.currentSegmentId, MetricTypes.OTHER, `ERROR|${errorName}`, 1);
    }

    public claimAssetTryCountMetricEvent(id: PrespawnedAssetId, value: number) {
        this.eventQueues.queueMetricEvent(this.player, this.currentSegmentId, MetricTypes.FRICTION, `PrespawnedAssetAttempts|${id}`, value);
    }

    public matchStatsMetricEvents(matchStats: PlayerStats) {
        [
            {prefix: `total${DELIMITER}`, stats: matchStats.total},
            ...Object.keys(matchStats.weapons).flatMap(weaponId => ({prefix: `weapon_${weaponId}${DELIMITER}`, stats: matchStats.weapons[weaponId as WeaponId]})),
            ...Object.keys(matchStats.abilities).flatMap(abilityId => ({prefix: `ability_${abilityId}${DELIMITER}`, stats: matchStats.abilities[abilityId as AbilityId]}))
        ].forEach(entry => {
            for (const statId in entry.stats) {
                this.eventQueues.queueMetricEvent(this.player, this.currentSegmentId, MetricTypes.OTHER, `${entry.prefix}${statId}`, entry.stats[statId as StatId]!);
            }
        });
    }

    public nuxVideoFinishedMetricEvent() {
        this.eventQueues.queueMetricEvent(this.player, this.currentSegmentId, MetricTypes.OTHER, 'nux_video_finished', 1);
    }

    public nuxVideoSkippedMetricEvent() {
        this.eventQueues.queueMetricEvent(this.player, this.currentSegmentId, MetricTypes.OTHER, 'nux_video_skipped', 1);
    }

    public nuxIntroCompletedMetricEvent() {
        this.eventQueues.queueMetricEvent(this.player, this.currentSegmentId, MetricTypes.OTHER, 'nux_intro_completed', 1);
    }

    private getPlayerPosition(player: Player) {
        try {
            return player.position.get();
        } catch {
            return undefined;
        }
    }
}

export class GlobalAnalyticsState {
    private _currentGameModeId?: GameModeId;
    public get currentGameModeId() {
        return this._currentGameModeId;
    }

    private _currentMatchId: string;
    public get currentMatchId() {
        return this._currentMatchId;
    }

    private _currentRoundNumber: number;
    public get currentRoundNumber() {
        return this._currentRoundNumber;
    }

    constructor(private horizonApiProvider: Component) {
        this._currentMatchId = generateUUIDv4();
        this._currentRoundNumber = UNDEFINED;

        this.horizonApiProvider.connectLocalBroadcastEvent(setGameMode, data => this._currentGameModeId = data.gameModeId);
    }

    incrementCurrentRoundNumber() {
        this._currentRoundNumber++;
    }

    matchStart() {
        this._currentMatchId = generateUUIDv4();

        // Per discussion with data team, we DON'T actually need a match segment event; instead, we stitch together rounds joined by the matchId. Each player has their own segmentId for the round.

        this._currentRoundNumber = 0;
    }
}

class AnalyticsEventQueues {
    private inWorldAnalytics = InWorldAnalytics.getInstance();

    // The HTTP client has a rate limit of 64 requests per second. Batch and chunk every call into chunks to not get rate limited
    private segmentEventsQueue: {player: Player, event: SegmentEvent, retries: number}[] = [];
    private metricEventsQueue: {player: Player, event: MetricEvent, retries: number}[] = [];

    constructor(private horizonApiProvider: Component) {

    }

    initialize() {
        this.horizonApiProvider.async.setInterval(() => {
            this.sendSegmentEvents();
            this.sendMetricEvents();
        }, 1000);
    }

    startSegment(player: Player, matchId: string, segmentId: string, gameModeId: GameModeId | undefined, segmentType: SegmentType, segmentName: string) {
        this.queueSegmentEvent(player, matchId, segmentId, gameModeId, 0, segmentType, segmentName, SegmentEventType.START);
    }

    heartbeat(player: Player, matchId: string, segmentId: string, gameModeId: GameModeId | undefined, segmentType: SegmentType, segmentName: string, durationSeconds: number, position?: Vec3) {
        this.queueSegmentEvent(player, matchId, segmentId, gameModeId, durationSeconds, segmentType, segmentName, SegmentEventType.HEARTBEAT, position);
    }

    endSegment(player: Player, matchId: string, segmentId: string, gameModeId: GameModeId | undefined, segmentType: SegmentType, segmentName: string, durationSeconds: number) {
        this.queueSegmentEvent(player, matchId, segmentId, gameModeId, durationSeconds, segmentType, segmentName, SegmentEventType.END);
    }

    endAbortSegment(player: Player, matchId: string, segmentId: string, gameModeId: GameModeId | undefined, segmentType: SegmentType, segmentName: string, durationSeconds: number) {
        this.queueSegmentEvent(player, matchId, segmentId, gameModeId, durationSeconds, segmentType, segmentName, SegmentEventType.END_ABORT);
    }

    queueSegmentEvent(player: Player, matchId: string, segmentId: string, gameModeId: GameModeId | undefined, durationSeconds: number, segmentType: SegmentType, segmentName: string, eventType: SegmentEventType, position?: Vec3) {
        this.segmentEventsQueue.push({
            player,
            event: {
                matchId: matchId,
                segmentId: segmentId,
                settings: {
                    gameMode: gameModeId,
                    cosmetics: [],
                },
                timestampSeconds: Date.now(),
                durationSeconds,
                segmentType,
                segmentName,
                eventType,
                position
            },
            retries: 0
        });
    }

    queueMetricEvent(player: Player, segmentId: string, metricType: MetricTypes, metricName: string, value: number, position?: Vec3) {
        this.metricEventsQueue.push({
            player,
            event: {
                segmentId: segmentId,
                timestampSeconds: Date.now(),
                metricType,
                metricName,
                value,
                position,
            },
            retries: 0
        });
    }

    private sendSegmentEvents() {
        this.checkQueueDepth('segment', this.segmentEventsQueue);
        const segmentEventsToSend = this.segmentEventsQueue.splice(0, REQUEST_RATE_LIMIT_PER_SECOND);
        if (DEBUG_LOGGING_ENABLED && segmentEventsToSend.length > 0) console.log(`Sending ${segmentEventsToSend.length} segment events`);
        segmentEventsToSend.filter(entry => gameplayObjExists(entry.player)).forEach(entry => {
            try {
                this.inWorldAnalytics.sendSegmentEvent(entry.player, entry.event);
            } catch (e) {
                if (++entry.retries < MAX_RETRIES_TO_SEND_EVENTS) {
                    this.segmentEventsQueue.push(entry);
                    return;
                }

                console.error(`Failed to send segment event after ${MAX_RETRIES_TO_SEND_EVENTS} [${e}]: ${stringifyWithBigInt(entry.event)}`);
            }
        });
    }

    private sendMetricEvents() {
        this.checkQueueDepth('metric', this.metricEventsQueue);
        const metricEventsToSend = this.metricEventsQueue.splice(0, REQUEST_RATE_LIMIT_PER_SECOND);
        if (DEBUG_LOGGING_ENABLED && metricEventsToSend.length > 0) console.log(`Sending ${metricEventsToSend.length} segment events`);
        metricEventsToSend.filter(entry => gameplayObjExists(entry.player)).forEach(entry => {
            try {
                this.inWorldAnalytics.sendMetricEvent(entry.player, entry.event);
            } catch (e) {
                if (++entry.retries < MAX_RETRIES_TO_SEND_EVENTS) {
                    this.metricEventsQueue.push(entry);
                    return;
                }

                console.error(`Failed to send metric event after ${MAX_RETRIES_TO_SEND_EVENTS} [${e}]: ${stringifyWithBigInt(entry.event)}`);
            }
        });
    }

    private checkQueueDepth(queueName: string, queue: any[]) {
        if (queue.length > REQUEST_QUEUE_MAX_DEPTH) {
            console.warn(`${queueName} events have ${queue.length} events to send, dropping so that events to send == ${REQUEST_QUEUE_MAX_DEPTH}`);
            queue.splice(REQUEST_QUEUE_MAX_DEPTH, queue.length - REQUEST_QUEUE_MAX_DEPTH);
        }
    }
}

export class AnalyticsService implements ServerPlatformService {
    private playerAnalytics = new Map<Player, PlayerAnalytics>();
    private globalAnalyticsState = new GlobalAnalyticsState(this.horizonApiProvider);
    private eventQueues = new AnalyticsEventQueues(this.horizonApiProvider);

    constructor(private horizonApiProvider: Component) {

    }

    serverPreStart() {
        this.subscribePlayerEvents();
    }

    serverStart() {
    }

    serverPostStart() {
        this.eventQueues.initialize();
    }

    serverUpdate(deltaTimeSeconds: number) {
    }

    getPlayerAnalytics(player: Player): PlayerAnalytics {
        return this.playerAnalytics.getOrDefault(player, () => new PlayerAnalytics(player, this.globalAnalyticsState, this.eventQueues, this.horizonApiProvider));
    }

    stopPlayerAnalytics(player: Player) {
        const playerAnalytics = this.playerAnalytics.get(player);

        if (!playerAnalytics) {
            throw new Error(`Attempted to stop PlayerAnalytics for ${toStringSafe(player)}, but PlayerAnalytics did not exist for that player`)
        }

        playerAnalytics.terminate();
        this.playerAnalytics.delete(player);
    }

    getGlobalAnalyticsState(): GlobalAnalyticsState {
        return this.globalAnalyticsState;
    }

    // Do this here instead of in each PlayerAnalytics to cut down on event subscriptions.
    private subscribePlayerEvents() {
        this.horizonApiProvider.connectNetworkBroadcastEvent(onWeaponGrab, data => this.getPlayerAnalytics(data.player).weaponGrabMetricEvent(data.weaponId));
        this.horizonApiProvider.connectLocalBroadcastEvent(onDeath, changeData => {
            const killUuid = generateUUIDv4();

            const killer = changeData.sourceData.obj instanceof Player ? changeData.sourceData.obj as Player : undefined;
            if (killer) this.getPlayerAnalytics(killer).killerMetricEvent(killUuid);

            const target = changeData.targetData instanceof Player ? changeData.targetData as Player : undefined;
            if (target) this.getPlayerAnalytics(target).deathMetricEvent(killUuid);
        });
    }
}
