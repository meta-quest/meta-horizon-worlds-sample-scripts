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

import { getDateId } from 'ConstsLoginRewards';
import { onPlaytimeTick } from 'Events';
import { BoostTrackerData, GamePlayerTimeBaseContentData, LoginRewardTrackingData, PlaytimeRewardTrackingData, PLAYTIME_REWARD_TRACKING_DATA_DEFAULT } from 'GamePlayerData';
import { Component, Player } from 'horizon/core';
import { PlayerDataDao, PLAYTIME_TICK_SECONDS } from 'PlayerDataDao';
import { TIME_UNITS } from 'UtilsMath';

export const UNDEFINED_ASYNC_ID = -1;

export class PlayerPlaytimeService {
    playtimeTickAsyncId: number = UNDEFINED_ASYNC_ID;

    constructor(
        private player: Player,
        private playerDataDao: PlayerDataDao,
        private horizonApiProvider: Component<any>,
    ) {
    }

    onLogin() {
        const now = Date.now();

        const timeBasedContentData = this.playerDataDao.data.timeBasedContentData;
        timeBasedContentData.loginUtcMilliseconds = now;
        if (timeBasedContentData.firstLoginUtcMilliseconds == undefined) {
            timeBasedContentData.firstLoginUtcMilliseconds = now;
        }

        // detect new day
        const currentDateId = getDateId(now, TIME_UNITS.MILLIS_PER_DAY);
        const playtimeRewardTracker = this.getPlaytimeRewardTrackingData();
        if (playtimeRewardTracker.assignmentDateId != currentDateId) {
            this.setPlaytimeRewardTrackingData({
                ...PLAYTIME_REWARD_TRACKING_DATA_DEFAULT,
                assignmentDateId: currentDateId,
            });
        }

        // update boost times
        const secondsSinceLastLogout = (now - timeBasedContentData.logoutUtcMilliseconds) / 1000;
        this.tickBoostDurations(secondsSinceLastLogout);
        this.startPlaytimeTick(timeBasedContentData);
    }

    onLogout() {
        this.playerDataDao.data.timeBasedContentData.logoutUtcMilliseconds = Date.now();

        const playtimeRewardTracker = this.getPlaytimeRewardTrackingData();
        playtimeRewardTracker.rewardablePlaytimeSeconds = this.calculateRewardablePlaytimeSeconds();
        this.setPlaytimeRewardTrackingData(playtimeRewardTracker);

        this.horizonApiProvider.async.clearInterval(this.playtimeTickAsyncId);
        this.playtimeTickAsyncId = UNDEFINED_ASYNC_ID;
    }

    getLogoutTimeUTCMilliseconds() {
        if (!this.playerDataDao.data.timeBasedContentData.logoutUtcMilliseconds) {
            return undefined;
        }
        return this.playerDataDao.data.timeBasedContentData.logoutUtcMilliseconds;
    }

    getFirstLoginTimeUtcMilliseconds() {
        return this.playerDataDao.data.timeBasedContentData.firstLoginUtcMilliseconds;
    }

    getLoginTimeUtcMilliseconds() {
        return this.playerDataDao.data.timeBasedContentData.loginUtcMilliseconds;
    }

    getSecondsSpentInInstance() {
        const timeAtLogin = this.getLoginTimeUtcMilliseconds();
        if (!timeAtLogin) {
            return 0;
        }
        return (Date.now() - timeAtLogin) / 1000;
    }

    calculateRewardablePlaytimeSeconds() {
        return this.getPlaytimeRewardTrackingData().rewardablePlaytimeSeconds + this.getSecondsSpentInInstance();
    }

    getLoginRewardTrackingData() {
        return this.playerDataDao.data.timeBasedContentData.loginRewardTrackingData;
    }

    setLoginRewardTrackingData(data: LoginRewardTrackingData) {
        this.playerDataDao.data.timeBasedContentData.loginRewardTrackingData = data;
    }

    canClaimLoginReward() {
        return getDateId(Date.now(), TIME_UNITS.MILLIS_PER_DAY) > this.getLoginRewardTrackingData().lastClaimedDateId;
    }

    shouldShowLoginPrompt() {
        const isFirstLogin = this.playerDataDao.data.timeBasedContentData.firstLoginUtcMilliseconds == this.playerDataDao.data.timeBasedContentData.loginUtcMilliseconds;
        const didSeePromptToday = this.getLastLoginPromptShownDateId() == getDateId(Date.now(), TIME_UNITS.MILLIS_PER_DAY);
        return !isFirstLogin && !didSeePromptToday;
    }

    getLastLoginPromptShownDateId() {
        return this.playerDataDao.data.timeBasedContentData.lastLoginPromptShownDateId;
    }

    updateLastLoginPromptShownDateId() {
        this.playerDataDao.data.timeBasedContentData.lastLoginPromptShownDateId = getDateId(Date.now(), TIME_UNITS.MILLIS_PER_DAY);
    }

    getPlaytimeRewardTrackingData() {
        return this.playerDataDao.data.timeBasedContentData.playtimeRewardTrackingData;
    }

    setPlaytimeRewardTrackingData(data: PlaytimeRewardTrackingData) {
        this.playerDataDao.data.timeBasedContentData.playtimeRewardTrackingData = data;
    }

    setXpBoostTrackingData(data: BoostTrackerData) {
        this.playerDataDao.data.timeBasedContentData.xpBoostTrackingData = data;
    }

    getXpBoostTrackingData() {
        return this.playerDataDao.data.timeBasedContentData.xpBoostTrackingData;
    }

    addXpBoostTime(seconds: number) {
        const trackingData = this.getXpBoostTrackingData();
        trackingData.durationSeconds += seconds;
        this.setXpBoostTrackingData(trackingData);
    }

    setGoldBoostTrackingData(data: BoostTrackerData) {
        this.playerDataDao.data.timeBasedContentData.goldBoostTrackingData = data;
    }

    getGoldBoostTrackingData() {
        return this.playerDataDao.data.timeBasedContentData.goldBoostTrackingData;
    }

    addGoldBoostTime(seconds: number) {
        const trackingData = this.getGoldBoostTrackingData();
        trackingData.durationSeconds += seconds;
        this.setGoldBoostTrackingData(trackingData);
    }

    private startPlaytimeTick(timeBasedContentData: GamePlayerTimeBaseContentData) {
        this.playtimeTickAsyncId = this.horizonApiProvider.async.setInterval(() => {
            if (this.calculateRewardablePlaytimeSeconds() > 30 * TIME_UNITS.SECONDS_PER_MINUTE) timeBasedContentData.played30MinutesInADay = true;

            this.tickBoostDurations(PLAYTIME_TICK_SECONDS);
            this.horizonApiProvider.sendLocalBroadcastEvent(onPlaytimeTick, {player: this.player});
        }, PLAYTIME_TICK_SECONDS * 1000);
    }
    
    private tickBoostDurations(deltaSeconds: number) {
        const xpBoostTracker = this.getXpBoostTrackingData();
        xpBoostTracker.durationSeconds = Math.max(0, xpBoostTracker.durationSeconds - deltaSeconds);
        this.setXpBoostTrackingData(xpBoostTracker);

        const goldBoostTracker = this.getGoldBoostTrackingData();
        goldBoostTracker.durationSeconds = Math.max(0, goldBoostTracker.durationSeconds - deltaSeconds);
        this.setGoldBoostTrackingData(goldBoostTracker);
    }
}
