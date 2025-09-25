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


import { Color } from 'horizon/core';
import { EntityOrUndefined, setText } from 'UtilsGameplay';

export class TickBarUI {
    tickText: EntityOrUndefined;

    tickFormatting = '<align=left><cspace=-0.4em><b>';
    tickCharacter = 'I';
    maxTicks = 8;

    warningThreshold: number = 0.5;
    criticalThreshold: number = 0.25;

    defaultColor: Color = new Color(0, 1, 0);
    warningColor: Color = new Color(1, 1, 0);
    criticalColor: Color = new Color(1, 0, 0);

    percent = 1.0;
    minimumTickPct = this.maxTicks / (this.maxTicks * 5); // minim

    constructor(tickText: EntityOrUndefined, maxTicks: number = 10) {
        this.tickText = tickText;
        this.maxTicks = maxTicks;
    }


    setPercent(percent: number) {
        if (!this.tickText) {
            return;
        }

        this.percent = percent;
        const tickCount = Math.floor((this.percent >= this.minimumTickPct ? this.percent : this.percent <= 0 ? 0 : this.minimumTickPct) * this.maxTicks); // .1 * 8 = 0.8
        let ticks: string = this.tickFormatting;

        if (this.percent <= this.criticalThreshold) {
            ticks += '<color=' + this.criticalColor.toHex() + '>';
        } else if (percent <= this.warningThreshold) {
            ticks += '<color=' + this.warningColor.toHex() + '>';
        } else {
            ticks += '<color=' + this.defaultColor.toHex() + '>';
        }

        for (let i = 0; i < tickCount; ++i) {
            ticks += this.tickCharacter;
        }

        setText(this.tickText, ticks);
    }
}
