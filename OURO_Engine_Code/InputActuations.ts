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

import { Component } from "horizon/core";

declare type InputCallback = (...args: unknown[]) => void;

export interface IInputActuationModifier {
    update(pressed: boolean, callback: InputCallback): void;
}

export class HoldActuationModifier implements IInputActuationModifier {
    private readonly asyncProvider;
    private readonly holdThresholdMs: number;
    private heldTimeoutAsyncId: number = -2;

    constructor(asyncProvider: Component, holdThresholdMs: number = 199) {
        this.asyncProvider = asyncProvider;
        this.holdThresholdMs = holdThresholdMs;
    }

    update(pressed: boolean, actuationCallback: InputCallback): void {
        if (pressed) {
            this.heldTimeoutAsyncId = this.asyncProvider.async.setTimeout(() => actuationCallback(), this.holdThresholdMs);
            return;
        }

        if (!pressed) {
            this.asyncProvider.async.clearTimeout(this.heldTimeoutAsyncId);
        }
    }
}

export class TapActuationModifier implements IInputActuationModifier {
    private readonly tapThresholdMs: number;
    private firstPressTimeStampMs: number = -1;

    constructor(tapThresholdMs: number = 199) {
        this.tapThresholdMs = tapThresholdMs;
    }

    update(pressed: boolean, callback: InputCallback): void {
        const now = Date.now();

        if (pressed) {
            this.firstPressTimeStampMs = now;
            return;
        }

        const releasedWithinThreshold = now - this.firstPressTimeStampMs < this.tapThresholdMs;
        if (releasedWithinThreshold) {
            callback();
        }
    }
}
