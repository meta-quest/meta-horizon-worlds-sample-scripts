// Copyright (c) Meta Platforms, Inc. and affiliates.

// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.

/**
 * Extended class that specifically toggles the CurveVisualizer class inside Gameutils.ts
 */
import * as hz from 'horizon/core';
import { CurveVisualizer } from 'GameUtils';
import { PlayerFireEventOnTriggerBase } from 'PlayerEventTriggerBase';

class ToggleTrailTrigger extends PlayerFireEventOnTriggerBase<typeof ToggleTrailTrigger> {
	protected onEntityEnterTrigger(_enteredBy: hz.Entity): void { }
	protected onEntityExitTrigger(_exitedBy: hz.Entity): void { }
	protected onPlayerExitTrigger(_exitedBy: hz.Player): void { }

	private toggle = false;
	protected onPlayerEnterTrigger(_enteredBy: hz.Player): void {
		this.toggle = !this.toggle;
		if (this.toggle) {
			this.sendLocalBroadcastEvent(CurveVisualizer.StopDrawingCurve, {});
		}
		else {
			this.sendLocalBroadcastEvent(CurveVisualizer.StartDrawingCurve, {});
		}
	}

}
hz.Component.register(ToggleTrailTrigger);
