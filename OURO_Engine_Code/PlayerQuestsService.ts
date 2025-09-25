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

import { StatId } from 'ConstsIdsStat';
import { getDateId, getUtcMillisecondsFromDateId } from 'ConstsLoginRewards';
import {
    ALL_WEEKLY_QUEST_DATA,
    BaseQuestData, DailyQuestData, DAILY_QUEST_DATA_REGISTRY,
    DAILY_QUEST_DIFFICULTY_MAP, getNRandomQuestsFrom,
    NUM_DAILY_QUESTS_EASY,
    NUM_DAILY_QUESTS_HARD,
    NUM_DAILY_QUESTS_MEDIUM,
    NUM_WEEKLY_QUESTS,
    QuestDifficulty,
    TimeBasedQuestData, WeeklyQuestData, WEEKLY_QUEST_DATA_REGISTRY
} from 'ConstsQuests';
import { DAILIES_SEEN_ID, SeenId, WEEKLIES_SEEN_ID } from 'ConstsSeenState';
import { getStatData } from 'ConstsStats';
import { DataRegistry } from 'EventData';
import { onDailyQuestsChanged, onWeeklyQuestsChanged } from 'Events';
import { TimedQuestsSetTrackingData, TimedQuestTrackingData } from 'GamePlayerData';
import { Component, Player } from 'horizon/core';
import { PlayerCurrenciesDao } from 'PlayerCurrenciesDao';
import { PlayerDataDao } from 'PlayerDataDao';
import { PlayerEntitlementsDao } from 'PlayerEntitlementsDao';
import { PlayerSeenStateDao } from 'PlayerSeenStateDao';
import { mutateStat, PlayerStats, Stats } from 'PlayerStats';
import { PlayerStatsService } from 'PlayerStatsService';
import { PlayerUnlockablesService } from 'PlayerUnlockablesService';
import { TIME_UNITS } from 'UtilsMath';
import { getOrDefaultMap, getOrDefaultObject } from 'UtilsTypescript';

export class PlayerQuestsService {

    dailyQuestsHandler: DailyQuestsHandler;
    weeklyQuestsHandler: WeeklyQuestsHandler;

    timeBasedQuestsHandlers: TimeBasedQuestsHandler<TimeBasedQuestData>[] = [];

    constructor(
        player: Player,
        private entitlements: PlayerEntitlementsDao,
        private currencies: PlayerCurrenciesDao,
        private stats: PlayerStatsService,
        private unlockables: PlayerUnlockablesService,
        seenState: PlayerSeenStateDao,
        playerDataDao: PlayerDataDao,
        horizonApiProvider: Component<any>,
    ) {
        this.dailyQuestsHandler = new DailyQuestsHandler(player, this, playerDataDao, seenState, horizonApiProvider, TIME_UNITS.MILLIS_PER_DAY, DAILY_QUEST_DATA_REGISTRY, DAILIES_SEEN_ID);
        this.weeklyQuestsHandler = new WeeklyQuestsHandler(player, this, playerDataDao, seenState, horizonApiProvider, TIME_UNITS.MILLIS_PER_DAY * TIME_UNITS.DAYS_PER_WEEK, WEEKLY_QUEST_DATA_REGISTRY, WEEKLIES_SEEN_ID);

        this.timeBasedQuestsHandlers.push(this.dailyQuestsHandler);
        this.timeBasedQuestsHandlers.push(this.weeklyQuestsHandler);
    }

    private getStatsForQuest(quest: BaseQuestData): Stats {
        let playerStats: PlayerStats;
        switch (quest.gameMode) {
            case 'ALL':
                playerStats = this.stats.lifetimeStats;
                break;
            case 'POINTS':
                playerStats = this.stats.getStatsForOrThrow('POINTS').getStats();
                break;
            case 'ELIMINATION':
                playerStats = this.stats.getStatsForOrThrow('ELIMINATION').getStats();
                break;
            case 'ACCOUNT':
                playerStats = this.stats.accountStats;
                break;
            default:
                throw Error(`Unknown game mode found in quests data. questId=${quest.id}, gameMode=${quest.gameMode}`);
        }

        if (quest.weaponId != undefined && quest.abilityId != undefined) throw Error(`A quest may not have both a weapon ID and an ability ID. questId=${quest.id}, weaponId=${quest.weaponId}, abilityId=${quest.abilityId}`);
        if (quest.weaponId != undefined) return getOrDefaultObject(playerStats.weapons, quest.weaponId, () => ({}));
        if (quest.abilityId != undefined) return getOrDefaultObject(playerStats.abilities, quest.abilityId, () => ({}));
        return playerStats.total;
    }

    getStatValueForQuest(quest: BaseQuestData) {
        return this.getStatsForQuest(quest)[quest.statId] ?? getStatData(quest.statId).initialValue;
    }

    setQuestToCompleteState(quest: BaseQuestData) {
        mutateStat(this.getStatsForQuest(quest), quest.statId, quest.statThreshold);
    }

    hasCompletedQuest(quest: BaseQuestData): boolean {
        return this.entitlements.hasAllEntitlements(quest.completionEntitlements);
    }

    canCompleteQuest(quest: BaseQuestData): boolean {
        if (this.hasCompletedQuest(quest)) {
            return false;
        }

        if (!this.entitlements.hasAllEntitlements(quest.requiredEntitlements)) {
            return false;
        }

        return this.getStatValueForQuest(quest) >= quest.statThreshold;
    }

    completeQuest(quest: BaseQuestData) {
        if (!this.canCompleteQuest(quest)) {
            throw Error(`Attempted to complete a quest that is not completable. questId=${quest.id}, this.hasCompletedQuest(quest)=${this.hasCompletedQuest(quest)}, this.entitlements.hasAllEntitlements(quest.requiredEntitlements)=${this.entitlements.hasAllEntitlements(quest.requiredEntitlements)}, this.getStatValueForQuest(quest)=${this.getStatValueForQuest(quest)}, quest.statThreshold=${quest.statThreshold}`);
        }

        this.grantQuestRewardsAndEntitlements(quest);
    }

    grantQuestRewardsAndEntitlements(quest: BaseQuestData) {
        if (quest.rewardedGold > 0) {
            this.currencies.accrue('GOLD', quest.rewardedGold);
        }

        this.unlockables.grantEntitlementsAndUpdateSeenStates(quest.completionEntitlements);
    }

    hasAnyCompletableQuest<T extends BaseQuestData>(quests: T[]): boolean {
        return quests.some(quest => this.canCompleteQuest(quest));
    }

    // A quest is displayable if you have not completed it and if you have the required entitlements.
    canDisplayQuest(quest: BaseQuestData): boolean {
        return !this.hasCompletedQuest(quest) && this.entitlements.hasAllEntitlements(quest.requiredEntitlements);
    }

    getQuestsPools<T extends BaseQuestData>(quests: T[], sorted?: boolean): {displayableQuests: T[], completableQuests: T[]} {
        let displayableQuests: T[] = [];
        let completableQuests: T[] = [];
        quests.forEach((q) => {
            if (this.canDisplayQuest(q)) {
                displayableQuests.push(q);
            }
            if (this.canCompleteQuest(q)) {
                completableQuests.push(q);
            }
        });

        if (sorted) {
            displayableQuests = displayableQuests.sort((lhs, rhs) => this.questDisplaySorter(lhs, rhs));
            completableQuests = completableQuests.sort((lhs, rhs) => this.questDisplaySorter(lhs, rhs));
        }

        return {
            displayableQuests: displayableQuests,
            completableQuests: completableQuests,
        };
    }

    // sort by completable > progress (as a %) > delta to completion (less delta is better) > gold reward > data entry order
    private questDisplaySorter(a: BaseQuestData, b: BaseQuestData): number {
        if (this.canCompleteQuest(a)) {
            return -1;
        }

        if (this.canCompleteQuest(b)) {
            return 1;
        }

        const aPriority = a.priority;
        const bPriority = b.priority;

        if (aPriority != undefined && bPriority != undefined) return aPriority < bPriority ? 1 : -1;
        else if (aPriority != undefined) return -1;
        else if (bPriority != undefined) return 1;

        const aValue = this.getStatValueForQuest(a);
        const bValue = this.getStatValueForQuest(b);

        const aProgress = aValue / a.statThreshold;
        const bProgress = bValue / b.statThreshold;
        if (aProgress > bProgress) {
            return -1;
        }
        if (bProgress > aProgress) {
            return 1;
        }

        const aDelta = a.statThreshold - aValue;
        const bDelta = b.statThreshold - bValue;
        if (aDelta < bDelta) {
            return -1;
        }
        if (bDelta < aDelta) {
            return 1;
        }

        const aGold = a.rewardedGold;
        const bGold = b.rewardedGold;
        if (aGold > bGold) {
            return -1;
        }
        if (bGold > aGold) {
            return 1;
        }

        return 0;
    }

    revokeCompletionEntitlementsFor(quests: BaseQuestData[]) {
        quests.forEach((quest) => {
            quest.completionEntitlements.forEach((id) => {
                this.entitlements.revokeEntitlement(id);
            });
        });
    }
}

export abstract class TimeBasedQuestsHandler<T extends TimeBasedQuestData> {
    refreshAsyncId?: number;

    isAllowedToAutoAssignNewQuests = true;

    startOfMatchCachedStatValues = new Map<StatId, number>();

    constructor(
        protected player: Player,
        protected questService: PlayerQuestsService,
        protected playerDataDao: PlayerDataDao,
        protected seenState: PlayerSeenStateDao,
        protected horizonApiProvider: Component<any>,
        protected dateIdTimeRangeMilliseconds: number,
        protected questDataRegistry: DataRegistry<string, T>,
        protected seenId: SeenId,
    ) {
        this.assignNewQuestsIfNeeded();
    }

    abstract getQuestsSetTrackingData(): TimedQuestsSetTrackingData;

    abstract setQuestsSetTrackingData(trackingData: TimedQuestsSetTrackingData): void;

    abstract selectNewQuests(): T[];

    getDateId(utcMilliseconds: number) {
        return getDateId(utcMilliseconds, this.dateIdTimeRangeMilliseconds);
    };

    assignNewQuestsIfNeeded() {
        const questsSetTrackingData = this.getQuestsSetTrackingData();
        if (questsSetTrackingData.assignmentDateId != this.getDateId(Date.now()) || questsSetTrackingData.questDatas.length <= 0) {
            this.assignNewQuests();
        }
    }

    assignNewQuests() {
        this.questService.revokeCompletionEntitlementsFor(this.getQuests());

        const questsSetTrackingData = this.getQuestsSetTrackingData();
        questsSetTrackingData.assignmentDateId = this.getDateId(Date.now());
        const newQuests = this.selectNewQuests();
        questsSetTrackingData.questDatas = newQuests.map<TimedQuestTrackingData>((data) => {
            return {
                id: data.id,
                progressValue: 0,
            };
        });

        this.seenState.setIsSeen(this.seenId, false);
        this.setQuestsSetTrackingData(questsSetTrackingData);
        this.setupAutoAssignNewQuestsAtEndTime();
    }

    setupAutoAssignNewQuestsAtEndTime() {
        if (this.refreshAsyncId != undefined) {
            this.horizonApiProvider.async.clearTimeout(this.refreshAsyncId);
        }

        const questsSetTrackingData = this.getQuestsSetTrackingData();
        const endTime = getUtcMillisecondsFromDateId(questsSetTrackingData.assignmentDateId + 1, this.dateIdTimeRangeMilliseconds);
        this.refreshAsyncId = this.horizonApiProvider.async.setTimeout(() => {
            if (this.isAllowedToAutoAssignNewQuests) {
                this.assignNewQuests();
            }
        }, endTime - Date.now());
    }

    cacheStartOfMatchStatValues() {
        this.startOfMatchCachedStatValues.clear();

        const quests = this.getQuests();
        quests.forEach((quest) => {
            this.startOfMatchCachedStatValues.set(quest.statId, this.questService.getStatValueForQuest(quest));
        });
    }

    getQuestProgressValue(quest: T) {
        const questsSetTrackingData = this.getQuestsSetTrackingData();
        for (const trackingData of questsSetTrackingData.questDatas) {
            if (trackingData.id == quest.id) {
                return trackingData.progressValue;
            }
        }
        return 0;
    }

    setQuestProgressValue(quest: T, value: number) {
        const questsSetTrackingData = this.getQuestsSetTrackingData();
        for (const trackingData of questsSetTrackingData.questDatas) {
            if (trackingData.id == quest.id) {
                trackingData.progressValue = value;
            }
        }
        this.setQuestsSetTrackingData(questsSetTrackingData);
    }

    getQuests() {
        const quests: T[] = [];
        this.getQuestsSetTrackingData().questDatas.forEach((trackingData) => {
            const data = this.questDataRegistry.get(trackingData.id);
            if (data) {
                quests.push(data);
            }
        });
        return quests;
    };
}

export class DailyQuestsHandler extends TimeBasedQuestsHandler<DailyQuestData> {
    getQuestsSetTrackingData(): TimedQuestsSetTrackingData {
        return this.playerDataDao.data.timeBasedContentData.dailyQuestsData;
    }

    setQuestsSetTrackingData(questsSetTrackingData: TimedQuestsSetTrackingData) {
        this.playerDataDao.data.timeBasedContentData.dailyQuestsData = questsSetTrackingData;
        this.horizonApiProvider.sendLocalBroadcastEvent(onDailyQuestsChanged, {player: this.player, questsSetTrackingData: questsSetTrackingData});
    }

    private selectAndExcludeQuests(difficulty: QuestDifficulty, numToSelect: number, refExcludedQuests: Set<BaseQuestData>, refExcludedSeriesIds: Set<string>) {
        const pool = this.questService.getQuestsPools(getOrDefaultMap(DAILY_QUEST_DIFFICULTY_MAP, difficulty, () => []).filter((q) => {
            return !refExcludedQuests.has(q) && (!q.seriesId || !refExcludedSeriesIds.has(q.seriesId));
        }));
        const selectedQuests = getNRandomQuestsFrom(pool.displayableQuests, numToSelect);
        selectedQuests.forEach((q) => {
            refExcludedQuests.add(q);
            if (q.seriesId) {
                refExcludedSeriesIds.add(q.seriesId);
            }
        });
        return selectedQuests;
    }

    selectNewQuests(): DailyQuestData[] {
        const exclusions = new Set(this.getQuests());
        const excludedSeriesIds = new Set<string>();
        return [
            ...this.selectAndExcludeQuests('EASY', NUM_DAILY_QUESTS_EASY, exclusions, excludedSeriesIds),
            ...this.selectAndExcludeQuests('MEDIUM', NUM_DAILY_QUESTS_MEDIUM, exclusions, excludedSeriesIds),
            ...this.selectAndExcludeQuests('HARD', NUM_DAILY_QUESTS_HARD, exclusions, excludedSeriesIds),
        ];
    }
}

export class WeeklyQuestsHandler extends TimeBasedQuestsHandler<WeeklyQuestData> {
    getQuestsSetTrackingData(): TimedQuestsSetTrackingData {
        return this.playerDataDao.data.timeBasedContentData.weeklyQuestsData;
    }

    setQuestsSetTrackingData(questsSetTrackingData: TimedQuestsSetTrackingData) {
        this.playerDataDao.data.timeBasedContentData.weeklyQuestsData = questsSetTrackingData;
        this.horizonApiProvider.sendLocalBroadcastEvent(onWeeklyQuestsChanged, {player: this.player, questsSetTrackingData: questsSetTrackingData});
    }

    selectNewQuests(): WeeklyQuestData[] {
        const questPool = this.questService.getQuestsPools(ALL_WEEKLY_QUEST_DATA);
        return getNRandomQuestsFrom(questPool.displayableQuests, NUM_WEEKLY_QUESTS, this.getQuests());
    }
}
