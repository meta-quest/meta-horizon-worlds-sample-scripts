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

import { Player, Vec3 } from "horizon/core";

/**
* Top level segment type for the event.
* */
export enum SegmentType {
    CHANGE_SETTING = "change_setting",
    CUTSCENE = "cutscene",
    LOBBY = "lobby",
    MAIN = "main",
    MENU = "menu",
    STORE = "store",
    TUTORIAL = "tutorial",
    OTHER = "other"
}
/**
 * Defines the type of events that can occur within a segment.
 *
 * Segment Event Rules:
 * - Each segment must have exactly one START event
 * - Each segment must conclude with either END (successful completion) or END_ABORT (incomplete termination)
 * - Additional events (UPDATE, PAUSE, RESUME, etc.) can occur between START and END
 */
export enum SegmentEventType {
    START = "start",
    END = "end",
    END_ABORT = "end_abort",
    UPDATE = "update",
    PAUSE = "pause",
    RESUME = "resume",
    CHANGE_SETTING = "change_setting",
    HEARTBEAT = "heartbeat"
}
/**
 * Payload structure for segment events.
 *
 * @param segmentId - Unique segment identifier (UUID v4 recommended). Must remain consistent across all events within the same segment lifecycle
 * @param timestampSeconds - Unix timestamp in seconds when the event occurred (e.g., 1748422565)
 * @param segmentType - Type of segment where the player is located (e.g., SegmentType.MAIN)
 * @param segmentName - Customized name that identifies the specific segment (e.g., "battle_main")
 * @param eventType -  Event type for this segment (e.g., SegmentEventType.START)
 * @param settingDifficulty - An optional field. Current difficulty level setting (e.g., "easy", "normal", "hard")
 * @param settingGameMode - An optional field. Current game mode configuration (e.g., "multiplayer", "single_player")
 * @param settingCosmetics - An optional field. Array of active cosmetic items at event time (e.g., ["cool_hat", "blue_shirt"])
 * @param durationSeconds - An optional field. Time elapsed in seconds since segment start (e.g., 12)
 * @param playerCount - An optional field. Total number of players currently in this segment (e.g., 2)
 * @param position - An optional field. Player's 3D coordinates at event time (e.g., new Vec3(1, 2, 3))
 */
export interface SegmentEvent {
    segmentId: string;
    timestampSeconds: number;
    segmentType: SegmentType;
    segmentName: string;
    eventType: SegmentEventType;
    settingDifficulty?: string;
    settingGameMode?: string;
    settingCosmetics?: Array<string>;
    durationSeconds?: number;
    playerCount?: number;
    position?: Vec3;
}
/**
 * Metric Types to categorize the metric
 */
export declare enum MetricTypes {
    ACTION = "action",
    DAMAGE = "damage",
    DEATH = "death",
    DISCOVERY = "discovery",
    DISTANCE = "distance",
    FRICTION = "friction",
    OUTCOME = "outcome",
    PROGRESSION = "progression",
    RATE = "rate",
    REWARD_CURRENCY = "reward_currency",
    REWARD_ITEMS = "reward_items",
    REWARD_POINTS = "reward_points",
    REWARD_STATUS = "reward_status",
    SOCIAL = "social",
    OTHER = "other"
}
/**
 * Interface for payload definition sent for in-world metric events
 *
 * @param segmentId - A unique identifier of a segment (recommend UUID v4). This segment id should stay the same for the segment (all events between its start and end segment event type)
 * @param timestampSeconds - Unix timestamp in seconds when the event occurred (e.g., 174842256)
 * @param metricType - Type of metric being measured (e.g., MetricTypes.DAMAGE)
 * @param metricName - Customized name that identifies the specific metric (e.g., "base_purchase")
 * @param value - Numerical value associated with this metric event (e.g., 3.5)
 * @param position - An optional field. Player's 3D coordinates at event time (e.g., new Vec3(1, 2, 3))
 */
export interface MetricEvent {
    segmentId: string;
    timestampSeconds: number;
    metricType: MetricTypes;
    metricName: string;
    value: number;
    position?: Vec3;
}
/**
 * Interface for payload definition sent for custom events
 *
 * @param segmentId - A unique identifier of a segment (recommend UUID v4). This segment id should stay the same for the segment (all events between its start and end segment event type)
 * @param timestampSeconds - Unix timestamp in seconds when the event occurred (e.g., 174842256)
 * @param eventType - Custom event type identifier used for routing to appropriate parsing logic (e.g., "game_start")
 * @param payload - Custom JSON payload containing event-specific data as a stringified JSON object. Schema must be coordinated with the content DE team.
*/
export interface CustomEvent {
    segmentId: string;
    timestampSeconds: number;
    eventType: string;
    payload: string;
}
/**
 * Analytics service for tracking in-world user activities and behaviors within Horizon experiences.
 * Provides methods to log segment events, metric events, and custom events for comprehensive
 * analytics coverage including user engagement, friction analysis, conversion funnels, and more.
 *
 * @example
 * ```typescript
 * const analyticsInstance = InWorldAnalytics.getInstance();
 * const payload: SegmentEvent = {
 *     segmentId: 'abcd-1234',
 *     timestampSeconds: Date.now(),
 *     segmentType: SegmentType.LOBBY,
 *     segmentName: 'my_awesome_lobby',
 *     eventType: SegmentEventType.START,
 *     settingDifficulty: 'example_difficult_af',
 *     settingGameMode: 'example_game_mode',
 *     settingCosmetics: [
 *        'example_cosmetic_1',
 *        'example_cosmetic_2',
 *        'example_cosmetic_3',
 *     ],
 *     durationSeconds: 1800,
 *     playerCount: 2,
 *     position: new Vec3(1, 2, 3),
 *    };
 * analyticsInstance.sendSegmentEvent(player, payload);
 * ```
 */
export declare class InWorldAnalytics {
    private static instance;
    private constructor();
    /**
     * The getInstance() method is a static method that returns an instance of the InWorldAnalytics class.
     * Use this method to ensure that only one instance of the class is initialised throughout the application.
     * example usage: const analyticsInstance = InWorldAnalytics.getInstance();
     */
    static getInstance(): InWorldAnalytics;
    sendSegmentEvent(player: Player, payload: SegmentEvent): void;
    sendMetricEvent(player: Player, payload: MetricEvent): void;
    sendCustomEvent(player: Player, payload: CustomEvent): void;
}
