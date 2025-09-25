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

import { Component, PropTypes } from "horizon/core";

export class GlobalSFXBank extends Component<typeof GlobalSFXBank> {
    static propsDefinition = {
        timerTickSFX: {type: PropTypes.Entity},

        levelUpSFX: {type: PropTypes.Entity},
        levelUpVO: {type: PropTypes.Entity},

        titleUnlockSFX: {type: PropTypes.Entity},

        rewardUnlockSFX: {type: PropTypes.Entity},
        rewardUnlockVO: {type: PropTypes.Entity},

        deathVO: {type: PropTypes.Entity},

        targetDownSFX: {type: PropTypes.Entity},
        targetDownVO: {type: PropTypes.Entity},
        teammateDownVO: {type: PropTypes.Entity},

        reloadHolsteredSFX: {type: PropTypes.Entity},

        revengeKillVO: {type: PropTypes.Entity},

        abilityUnlockSFX: {type: PropTypes.Entity},
        abilityUnlockVO: {type: PropTypes.Entity},

        abilityActivateSFX: {type: PropTypes.Entity},
        abilityDeactivateSFX: {type: PropTypes.Entity},
        abilityReadySFX: {type: PropTypes.Entity},
        abilityErrorSFX: {type: PropTypes.Entity},

        uiButtonClickSFX: {type: PropTypes.Entity},
        uiErrorSFX: {type: PropTypes.Entity},
        uiSkipSFX: {type: PropTypes.Entity},

        // mm = mainmenu
        mmClickPlay: {type: PropTypes.Entity}, // The Play button and anything inside ex: TDM or 3v3
        mmTier1: {type: PropTypes.Entity}, // the main buttons Career and Locker
        mmTier2: {type: PropTypes.Entity}, // buttons inside of the menu ex: Customize to choose titles
        mmTier3: {type: PropTypes.Entity}, // our "select" sound. Used when choosing a sticker, title, or weapon skin
        mmCloseCancel: {type: PropTypes.Entity}, // closing the menu (downward arrow) and also any X menus like closing the play menu
        mmPartyNotif: {type: PropTypes.Entity}, // when you get the "!" that you got invited to a party
        mmInsufficient: {type: PropTypes.Entity}, // when you don't have enough money or don't meet a requirement like level or entitlement
        mmEquip: {type: PropTypes.Entity}, // when you equip something

        // rr = round result
        rrQuestCompleteLg: {type: PropTypes.Entity}, // Checkbox for completing quests and large playtime
        rrQuestCompleteSm: {type: PropTypes.Entity}, // small playtime reward collect
        rrMeterLoop: {type: PropTypes.Entity}, // for ANY bar fill up, leveling, quests etc. Is a loop so play and stop it
        rrPanelOut: {type: PropTypes.Entity}, // whenever a "stats" panel disappears. ex: the gold tally panel
        rrRoundBanner: {type: PropTypes.Entity}, // plays at the start of the banner that displays "round 1,2,3 etc"
        rrRoundLost: {type: PropTypes.Entity}, // when the banner appears and you lose
        rrRoundWon: {type: PropTypes.Entity}, // when the banner appears and you win
        rrScoreTick: {type: PropTypes.Entity}, // in 3v3 when the score number changes

        // eg = endgame
        egGoldAdded: {type: PropTypes.Entity}, // Gold gets added to total in end game screen
        egLevelUpBanner: {type: PropTypes.Entity}, // when the level up banner appears
        egPodiumFirst: {type: PropTypes.Entity}, // when you get the first place and the "1st Place" word slams in
        egPodiumOther: {type: PropTypes.Entity}, // when you get second AND thrid place. word slams in
        egRewardEarned: {type: PropTypes.Entity}, // big reward earned splash screen. Only for EARNING the reward (not purchase)
        egRewardPurchase: {type: PropTypes.Entity}, // when you purchase a reward splash screen
    };

    static instance: GlobalSFXBank;

    preStart() {
        GlobalSFXBank.instance = this;
    }

    start() {

    }
}

Component.register(GlobalSFXBank);
