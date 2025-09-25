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
import { EntitlementId } from 'ConstsEntitlements';
import { AbilityId, validAbilityId } from 'ConstsIdsAbility';
import { GameModeId } from 'ConstsIdsGameMode';
import { StatId, validStatId } from 'ConstsIdsStat';
import { validWeaponId, WeaponId } from 'ConstsIdsWeapon';
import { RewardContentTypes } from 'ConstsRewards';
import { PLACEHOLDER_ICON } from 'ConstsUI';
import { registerEntitlementIds } from 'ConstsUnlockables';
import { DataRegistry } from 'EventData';
import { getCleanCSVArray, getRandom, loadAndProcessTSVAsset, removeWhiteSpace } from 'UtilsGameplay';
import { getOrDefaultMap } from 'UtilsTypescript';

/** ----------------------------------------------------- GENERAL ----------------------------------------------------- */

export const NUM_DAILY_QUESTS_EASY = 1;
export const NUM_DAILY_QUESTS_MEDIUM = 1;
export const NUM_DAILY_QUESTS_HARD = 1;
export const NUM_DAILY_QUESTS = NUM_DAILY_QUESTS_EASY + NUM_DAILY_QUESTS_MEDIUM + NUM_DAILY_QUESTS_HARD;

export const NUM_WEEKLY_QUESTS = 1;

export type QuestMode = GameModeId | 'ALL' | 'ACCOUNT';
export type QuestDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface BaseQuestData {
    seriesId?: string,
    id: string,
    displayName: string,
    gameMode: QuestMode,
    weaponId?: WeaponId,
    abilityId?: AbilityId,
    statId: StatId,
    statThreshold: number,
    requiredEntitlements: EntitlementId[],
    rewardedGold: number,
    completionEntitlements: EntitlementId[],
    pop1XpromoId?: string;
    rewardedContentTypes: RewardContentTypes[],
    priority?: number
}

async function loadQuestDataFromSpreadsheetAsset<T extends BaseQuestData>(
    dataAsset: AssetEx,
    registry: DataRegistry<string, T>,
    allArray: T[],
    dataMappingFunc: (spreadSheetlineData: Map<string, string | undefined>, lineNumber: number) => T,
    errorDebugString: string,
) {
    await loadAndProcessTSVAsset(
        dataAsset,
        (lineData, lineNumber) => {
            try {
                const data = dataMappingFunc(lineData, lineNumber);

                registerEntitlementIds(data.requiredEntitlements);
                registerEntitlementIds(data.completionEntitlements);

                registry.register(data);
                allArray.push(data);
            } catch (e) {
                console.error(`Failed to load: ${dataAsset.assetId} line ${lineNumber}: ${e}`);
                lineData.print();
            }
        },
        errorDebugString,
    );
}

export async function loadAllQuestData() {
    await Promise.all([
        loadQuestData(),
        loadDailyQuestData(),
        loadWeeklyQuestData(),
    ]);
}

function mapToBaseQuestData(spreadsheetData: Map<string, string | undefined>): BaseQuestData {
    const id = spreadsheetData.getOrThrow('id')!;

    const rewardedGold = Number.parseIntOrDefault(spreadsheetData.getOrThrowNullableValue('rewarded_gold'), 0);
    if (rewardedGold < 0) {
        throw Error(`A quest may not reward negative gold. questId=${id}, rewardedGold=${spreadsheetData.get('rewardedGold')}`);
    }

    let rewardedContentTypes = getCleanCSVArray(spreadsheetData.getOrThrowNullableValue('rewarded_content_types')) as RewardContentTypes[];
    if (rewardedContentTypes.includes('pop1xpromo') && !spreadsheetData.get('pop1_promo_id')) {
        throw Error(`Completion entitlements must have pop1_xpromo_id for pop1Xpromo items. questId=${id}`);
    }

    return {
        seriesId: spreadsheetData.getOrThrowNullableValue('series_id'),
        id,
        displayName: spreadsheetData.getOrThrow('display_name')!,
        gameMode: spreadsheetData.getOrThrow('game_mode')! as QuestMode, // TODO fooj: @Vu this isn't safe, should use our isValid pattern.
        weaponId: spreadsheetData.getOrThrowNullableValue('weapon_id') ? validWeaponId(removeWhiteSpace(spreadsheetData.getOrThrowNullableValue('weapon_id')!)) : undefined,
        abilityId: spreadsheetData.getOrThrowNullableValue('ability_id') ? validAbilityId(removeWhiteSpace(spreadsheetData.getOrThrowNullableValue('ability_id')!)) : undefined,
        statId: validStatId(removeWhiteSpace(spreadsheetData.getOrThrow('stat_id')!)),
        statThreshold: Number.parseInt(spreadsheetData.getOrThrow('stat_threshold')!),
        rewardedGold: rewardedGold,
        requiredEntitlements: getCleanCSVArray(spreadsheetData.getOrThrowNullableValue('required_entitlements')),
        completionEntitlements: getCleanCSVArray(spreadsheetData.getOrThrowNullableValue('completion_entitlements')),
        pop1XpromoId: spreadsheetData.get('pop1_xpromo_id'), // TODO jordan move this, we need a non-base normal quest data type
        rewardedContentTypes: rewardedContentTypes, // TODO fooj: @Vu this isn't safe, should use our isValid pattern.
        priority: spreadsheetData.getOrThrowNullableValue('priority') ? Number.parseInt(spreadsheetData.getOrThrow('priority')!) : undefined,
    };
}

export function getNRandomQuestsFrom<T extends BaseQuestData>(quests: T[], count: number, exclusionList: T[] = []): T[] {
    const selectedQuests: T[] = [];
    const pool = quests.filter((quest) => !exclusionList.includes(quest));
    for (let i = 0; i < count; ++i) {
        if (pool.length <= 0) {
            break;
        }
        const selection = getRandom(pool);
        selectedQuests.push(selection);
        pool.splice(pool.indexOf(selection, 1));
    }
    return selectedQuests;
}

/** ----------------------------------------------------- REGULAR QUESTS ----------------------------------------------------- */
const QUEST_DATA_SPREADSHEET = AssetEx.new('0');

export interface QuestData extends BaseQuestData {
}

export const QUEST_DATA_REGISTRY = new DataRegistry<string, QuestData>('Quests');
export const ALL_QUEST_DATA: QuestData[] = [];

export async function loadQuestData() {
    await loadQuestDataFromSpreadsheetAsset<QuestData>(
        QUEST_DATA_SPREADSHEET,
        QUEST_DATA_REGISTRY,
        ALL_QUEST_DATA,
        (spreadsheetData, lineNumber) => mapToBaseQuestData(spreadsheetData),
        'QuestData',
    );
}

/** -------------------------------------------------- BASE TIMED QUESTS --------------------------------------------------- */
export interface TimeBasedQuestData extends BaseQuestData {
    icon: TextureImageAssetEx,
}

function mapToTimeBasedQuestData(spreadsheetData: Map<string, string | undefined>): TimeBasedQuestData {
    return {
        ...mapToBaseQuestData(spreadsheetData),
        icon: spreadsheetData.getOrThrowNullableValue('icon') ? TextureImageAssetEx.latest(spreadsheetData.getOrThrow('icon')!) : PLACEHOLDER_ICON,
    };
}


/** ----------------------------------------------------- DAILY QUESTS ----------------------------------------------------- */
const DAILY_QUEST_DATA_SPREADSHEET = AssetEx.new('0');

export interface DailyQuestData extends TimeBasedQuestData {
    questDifficulty: QuestDifficulty,
}

export const DAILY_QUEST_DATA_REGISTRY = new DataRegistry<string, DailyQuestData>('Daily Quests');
export const ALL_DAILY_QUEST_DATA: DailyQuestData[] = [];
export const DAILY_QUEST_DIFFICULTY_MAP = new Map<QuestDifficulty, DailyQuestData[]>();

function mapToDailyQuestData(spreadsheetData: Map<string, string | undefined>): DailyQuestData {
    return {
        ...mapToTimeBasedQuestData(spreadsheetData),
        questDifficulty: removeWhiteSpace(spreadsheetData.getOrThrow('quest_difficulty')!) as QuestDifficulty, // TODO fooj: @Vu this isn't safe, should use our isValid pattern.
    };
}

export async function loadDailyQuestData() {
    await loadQuestDataFromSpreadsheetAsset<DailyQuestData>(
        DAILY_QUEST_DATA_SPREADSHEET,
        DAILY_QUEST_DATA_REGISTRY,
        ALL_DAILY_QUEST_DATA,
        (spreadsheetData, lineNumber) => {
            const data: DailyQuestData = mapToDailyQuestData(spreadsheetData);
            getOrDefaultMap(DAILY_QUEST_DIFFICULTY_MAP, data.questDifficulty, () => []).push(data);
            return data;
        },
        'DailyQuestData',
    );
}

/** ----------------------------------------------------- WEEKLY QUESTS ----------------------------------------------------- */
const WEEKLY_QUEST_DATA_SPREADSHEET = AssetEx.new('0');

export interface WeeklyQuestData extends TimeBasedQuestData {
}

export const WEEKLY_QUEST_DATA_REGISTRY = new DataRegistry<string, WeeklyQuestData>('Weekly Quests');
export const ALL_WEEKLY_QUEST_DATA: WeeklyQuestData[] = [];

export async function loadWeeklyQuestData() {
    await loadQuestDataFromSpreadsheetAsset<WeeklyQuestData>(
        WEEKLY_QUEST_DATA_SPREADSHEET,
        WEEKLY_QUEST_DATA_REGISTRY,
        ALL_WEEKLY_QUEST_DATA,
        (spreadsheetData) => mapToTimeBasedQuestData(spreadsheetData),
        'WeeklyQuestData',
    );
}
