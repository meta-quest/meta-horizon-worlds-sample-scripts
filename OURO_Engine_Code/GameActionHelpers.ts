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

import * as BaseObj from 'BaseObj';
import * as ConstsObj from 'ConstsObj';
import { DAMAGE_TARGET_PARTS, ObjHitResult } from 'ConstsObj';
import * as ConstsWeapon from 'ConstsWeapon';
import { drawDebugCone, drawDebugLine, drawDebugSphere } from 'DebugDraw';
import {
    AmountCalculationScheme,
    calculateAmount, ChangeData,
    ChangeDataCone,
    ChangeDataSplash,
    ChangeDataWithSource, CHANGE_DATA_BEAM_DEFAULT,
    CHANGE_DATA_CONE_DEFAULT,
    CHANGE_DATA_SPLASH_DEFAULT, ForceDataSplash,
    ForceType, FORCE_DATA_DEFAULT,
    FORCE_DATA_SPLASH_DEFAULT,
    FORCE_DATA_WITH_SOURCE_DEFAULT, SourceData, TargetingSelectionData, TARGETING_SELECTION_DATA_DEFAULT, TargetScheme
} from 'EventData';
import { showConeDebugVisuals, showSplashAndConeHitDebugLines, showSplashDebugVisuals } from 'Events';
import * as EventsNetworked from 'EventsNetworked';
import { GlobalServerObjects } from 'GlobalServerObjects';
import { Color, Component, Entity, LayerType, Player, Vec3 } from 'horizon/core';
import { ServerBaseObjRegistry } from 'ServerBaseObjRegistry';
import * as UtilsGameplay from 'UtilsGameplay';
import { raycastIgnoreAncestorTags } from 'UtilsGameplay';
import * as UtilsMath from 'UtilsMath';
import * as UtilsObj from 'UtilsObj';

let DRAW_LINE_DEBUGS_SPLASH_CONE = false;
let DRAW_SPLASH_DEBUG_VISUALS = false;
let DRAW_CONE_DEBUG_VISUALS = false;
/* Player's body parts can slightly crash into collision, this offset pushes back where obstruction ray starts to compensate. */
const UNOBSTRUCTED_RAY_START_OFFSET = -0.25;

/** -----------------------------------------------------  LOCAL ACTION FUNCTIONS ----------------------------------------- */
export function applyAction(component: Component, target: Player | Entity, changeData: ChangeData, sourceData: SourceData, worldPos: Vec3, targetRelativePos?: Vec3) {
    const actionEvent = EventsNetworked.getActionEvent(changeData.changeAction);
    if (!actionEvent) {
        return;
    }

    UtilsGameplay.sendNetworkEvent(component, target, actionEvent, {
        targetData: target,
        changeData: changeData,
        sourceData: {
            ...sourceData,
            pos: worldPos,
            targetRelativePos: targetRelativePos,
        },
    });
}

export function applySplashAction(component: Component, changeData: ChangeData, sourceData: SourceData, origin: Vec3, minRadius: number, radius: number, targetSelectionData: TargetingSelectionData = TARGETING_SELECTION_DATA_DEFAULT) {
    component.sendNetworkBroadcastEvent(EventsNetworked.handleSplashAction, {
        ...CHANGE_DATA_SPLASH_DEFAULT,
        changeData: changeData,
        sourceData: {
            ...sourceData,
            pos: origin,
        },
        minRadius: minRadius,
        radius: radius,
        targetSelectionData: {
            ...targetSelectionData,
            pos: origin,
        },
    });
}

export function applyBeamAction(component: Component, changeData: ChangeData, sourceData: SourceData, origin: Vec3, dir: Vec3, minRadius: number, radius: number, range: number, targetSelectionData: TargetingSelectionData = TARGETING_SELECTION_DATA_DEFAULT) {
    component.sendNetworkBroadcastEvent(EventsNetworked.handleBeamAction, {
        ...CHANGE_DATA_BEAM_DEFAULT,
        changeData: changeData,
        sourceData: {
            ...sourceData,
            pos: origin,
        },
        dir: dir,
        minRadius: minRadius,
        radius: radius,
        range: range,
        targetSelectionData: {
            ...targetSelectionData,
            pos: origin,
        },
    });
}

export function applyConeAction(component: Component, changeData: ChangeData, sourceData: SourceData, origin: Vec3, dir: Vec3, minRadius: number, radius: number, range: number, targetSelectionData: TargetingSelectionData = TARGETING_SELECTION_DATA_DEFAULT) {
    component.sendNetworkBroadcastEvent(EventsNetworked.handleConeAction, {
        ...CHANGE_DATA_CONE_DEFAULT,
        changeData: changeData,
        sourceData: {
            ...sourceData,
            pos: origin,
        },
        dir: dir,
        minRadius: minRadius,
        radius: radius,
        range: range,
        targetSelectionData: {
            ...targetSelectionData,
            pos: origin,
        },
    });
}

export function applyForce(component: Component, target: Player | Entity, sourceData: SourceData, forceType: ForceType, force: number, forceDir: Vec3) {
    UtilsGameplay.sendNetworkEvent(component, target, EventsNetworked.applyForce, {
        ...FORCE_DATA_WITH_SOURCE_DEFAULT,
        targetData: target,
        forceData: {
            ...FORCE_DATA_DEFAULT,
            forceType: forceType,
            force: force, // TODO: Check that I don't need to send the target
            forceDir: forceDir,
        },
        sourceData: sourceData,
    });
}

export function handleSplashForce(component: Component, sourceData: SourceData, targetScheme: TargetScheme, origin: Vec3, forceType: ForceType, force: number, radius: number, horizontalOnly: boolean) {
    component.sendNetworkBroadcastEvent(EventsNetworked.handleSplashForce, {
        ...FORCE_DATA_SPLASH_DEFAULT,
        targetScheme: targetScheme,
        forceData: {
            ...FORCE_DATA_DEFAULT,
            forceType: forceType,
            force: force,
        },
        sourceData: {
            ...sourceData,
            pos: origin,
        },
        radius: radius,
        horizontalOnly: horizontalOnly,
    });
}

/** -----------------------------------------------------  GAME ACTION HELPER ----------------------------------------- */
export class GameActionHelpers {
    hzObj: Component;

    constructor(hzObj: Component) {
        this.hzObj = hzObj;
    }

    registerEventListeners() {
        this.hzObj.connectNetworkBroadcastEvent(EventsNetworked.handleSplashAction, (data) => this.handleSplashAction(data));
        this.hzObj.connectNetworkBroadcastEvent(EventsNetworked.handleBeamAction, (data) => this.handleBeamAction(data));
        this.hzObj.connectNetworkBroadcastEvent(EventsNetworked.handleConeAction, (data) => this.handleConeAction(data));
        this.hzObj.connectNetworkBroadcastEvent(EventsNetworked.handleSplashForce, (data) => this.handleSplashForce(data));
        this.hzObj.connectLocalBroadcastEvent(showSplashAndConeHitDebugLines, (data) => DRAW_LINE_DEBUGS_SPLASH_CONE = data.show);
        this.hzObj.connectLocalBroadcastEvent(showSplashDebugVisuals, (data) => DRAW_SPLASH_DEBUG_VISUALS = data.show);
        this.hzObj.connectLocalBroadcastEvent(showConeDebugVisuals, (data) => DRAW_CONE_DEBUG_VISUALS = data.show);
    }

    calculateSplashFallOff(minAmount: number, amount: number, amountCalculationScheme: AmountCalculationScheme, origin: Vec3, hitPos: Vec3, sqrMinRadius: number, sqrRadius: number) {
        const fallOffRange = sqrRadius - sqrMinRadius;
        const sqrDist = hitPos.distanceSquared(origin);
        const fallOff = fallOffRange != 0 ? UtilsMath.clamp01(Math.max(0, sqrDist - sqrMinRadius) / fallOffRange) : 0;
        return Math.ceil(calculateAmount(amountCalculationScheme, minAmount, amount, fallOff));
    }

    handleSplashAction(data: ChangeDataSplash) {
        if (data.radius <= 0) {
            return;
        }

        const actionEvent = EventsNetworked.getActionEvent(data.changeData.changeAction);
        if (!actionEvent) {
            return;
        }

        // detect targets in radius
        const candidates: BaseObj.BaseObj[] = [];
        const candidateHitResults = new Map<BaseObj.BaseObj, ConstsObj.ObjHitResult[]>();
        ServerBaseObjRegistry.forEachTarget(data.changeData.targetScheme, data.sourceData, (target) => {
            const bodyPartsInRangeInPriorityOrder = target.getBodyPartsInRange(data.sourceData.pos, data.radius, DAMAGE_TARGET_PARTS, data.minRadius);
            const unobstructedBodyParts = this.getUnobstructedHits(bodyPartsInRangeInPriorityOrder, data, target, -.5);

            if (!unobstructedBodyParts) {
                return;
            }

            candidates.push(target);
            candidateHitResults.set(target, unobstructedBodyParts);
        });

        // apply action to target selection
        const sqrMinRadius = data.minRadius * data.minRadius;
        const sqrRadius = data.radius * data.radius;
        UtilsObj.forEachInSelection(candidates, data.targetSelectionData, (candidate) => {
            const hitResults = candidateHitResults.get(candidate);
            if (!hitResults) {
                return;
            }
            const hitPos = UtilsMath.getClosestPointInSphereTo(data.sourceData.pos, hitResults[0].pos, hitResults[0].radius);

            UtilsGameplay.sendNetworkEvent(this.hzObj, candidate.gameplayObject, actionEvent, {
                ...data,
                changeData: {
                    ...data.changeData,
                    amountCalculationScheme: AmountCalculationScheme.USE_AMOUNT, // use max since we're calculating the final amount here
                    amount: this.calculateSplashFallOff(
                        data.changeData.minAmount,
                        data.changeData.amount,
                        data.changeData.aoeAmountCalculationScheme,
                        data.sourceData.pos,
                        hitPos,
                        sqrMinRadius,
                        sqrRadius),
                },
                targetData: candidate.getEventTargetData(),
                sourceData: {
                    ...data.sourceData,
                    pos: hitPos,
                },
            });
        });

        if (DRAW_SPLASH_DEBUG_VISUALS) {
            drawDebugSphere(data.sourceData.pos, data.minRadius, Color.black, 5);
            drawDebugSphere(data.sourceData.pos, data.radius, Color.green, 5);
        }
    }

    handleBeamAction(data: ChangeDataCone) {
        if (data.radius <= 0 || data.range <= 0) {
            return;
        }

        const actionEvent = EventsNetworked.getActionEvent(data.changeData.changeAction);
        if (!actionEvent) {
            return;
        }

        // detect targets within beam
        const candidates: BaseObj.BaseObj[] = [];
        const candidateHitResults = new Map<BaseObj.BaseObj, ConstsObj.ObjHitResult>();
        const candidateHitDist = new Map<BaseObj.BaseObj, number>();
        ServerBaseObjRegistry.forEachTarget(data.changeData.targetScheme, data.sourceData, (target) => {
            const result = target.getFirstBodyPartInBeam(data.sourceData.pos, data.dir, data.radius, data.range, ConstsObj.DAMAGE_TARGET_PARTS, data.minRadius);
            if (result && result.didHit) {
                candidates.push(target);
                candidateHitResults.set(target, result);
                candidateHitDist.set(target, UtilsMath.dist(result.hitPos, data.sourceData.pos));
            }
        });

        let piercingData: ConstsWeapon.BeamPiercingData | undefined = undefined;
        if (data.sourceData.weaponId) {
            const weaponData = ConstsWeapon.WEAPON_DATA_REGISTRY.get(data.sourceData.weaponId);
            if (weaponData) {
                piercingData = weaponData.projectileData.beamPiercingDamageData;
            }
        }

        // apply action to target selection
        const sqrMinRadius = data.minRadius * data.minRadius;
        const sqrRadius = data.radius * data.radius;
        let hitCount = 0;
        let damageRange = data.range;

        if (piercingData) {
            switch (piercingData.damageScheme) {
                case ConstsWeapon.BeamPiercingDamageScheme.ORDERED_PERCENTAGES:
                    candidates.sort((a, b) => {
                        const aDist = candidateHitDist.get(a);
                        const bDist = candidateHitDist.get(b);
                        if (aDist == undefined || bDist == undefined) {
                            return -1;
                        }
                        return aDist - bDist;
                    });
                    break;
                case ConstsWeapon.BeamPiercingDamageScheme.LINEAR_DROPOFF:
                    damageRange = data.range - piercingData.minDist;
                    break;
            }
        }

        UtilsObj.forEachInSelection(candidates, data.targetSelectionData, (candidate) => {
            const result = candidateHitResults.get(candidate);
            if (!result) {
                return;
            }

            let damageScaler = 1.0;
            if (piercingData) {
                if (piercingData.maxHits > 0 && hitCount >= piercingData.maxHits) {
                    return;
                }

                switch (piercingData.damageScheme) {
                    case ConstsWeapon.BeamPiercingDamageScheme.ORDERED_PERCENTAGES:
                        if (piercingData.damageData && piercingData.damageData.length > 0) {
                            damageScaler = piercingData.damageData[Math.min(hitCount, piercingData.damageData.length - 1)];
                        }
                        break;
                    case ConstsWeapon.BeamPiercingDamageScheme.LINEAR_DROPOFF:
                        const hitDist = candidateHitDist.get(candidate);
                        if (hitDist && hitDist > piercingData.minDist) {
                            const fallOff = (hitDist - piercingData.minDist) / damageRange;
                            damageScaler = UtilsMath.clamp01(1.0 - fallOff);
                        }
                        break;
                }
            }


            hitCount++;
            const hitPos = UtilsMath.getClosestPointToLineInSphere(data.sourceData.pos, data.dir, result.pos, result.radius);
            const lineProjection = UtilsMath.getClosestPointOnLine(hitPos, data.sourceData.pos, data.dir);
            UtilsGameplay.sendNetworkEvent(this.hzObj, candidate.gameplayObject, actionEvent, {
                ...data,
                changeData: {
                    ...data.changeData,
                    amountCalculationScheme: AmountCalculationScheme.USE_AMOUNT, // use max since we're calculating the final amount here
                    amount: damageScaler * this.calculateSplashFallOff(
                        data.changeData.minAmount,
                        data.changeData.amount,
                        data.changeData.aoeAmountCalculationScheme,
                        lineProjection,
                        hitPos,
                        sqrMinRadius,
                        sqrRadius),
                },
                targetData: candidate.getEventTargetData(),
                sourceData: {
                    ...data.sourceData,
                    pos: hitPos,
                },
            });
        });
    }

    handleConeAction(data: ChangeDataCone) {
        if (data.radius <= 0 || data.range <= 0) {
            return;
        }

        const actionEvent = EventsNetworked.getActionEvent(data.changeData.changeAction);
        if (!actionEvent) {
            return;
        }

        // detect targets within cone
        const candidates: BaseObj.BaseObj[] = [];
        const candidateHitResultsInPriorityOrder = new Map<BaseObj.BaseObj, ObjHitResult[]>();
        ServerBaseObjRegistry.forEachTarget(data.changeData.targetScheme, data.sourceData, (target) => {
            const bodyPartsInConeInPriorityOrder = target.getBodyPartsInCone(data.sourceData.pos, data.dir, data.radius, data.range, DAMAGE_TARGET_PARTS, data.minRadius);
            const unobstructedBodyParts = this.getUnobstructedHits(bodyPartsInConeInPriorityOrder, data, target, 1);

            if (!unobstructedBodyParts) {
                return;
            }
            candidates.push(target);
            candidateHitResultsInPriorityOrder.set(target, unobstructedBodyParts);
        });

        // apply action to target selection
        const sqrMinRadius = data.minRadius * data.minRadius;
        const sqrRadius = data.radius * data.radius;
        UtilsObj.forEachInSelection(candidates, data.targetSelectionData, (candidate) => {
            const hitResults = candidateHitResultsInPriorityOrder.get(candidate);
            if (!hitResults?.length) {
                return;
            }

            const hitPos = UtilsMath.getClosestPointToLineInSphere(data.sourceData.pos, data.dir, hitResults[0].pos, hitResults[0].radius);
            const lineProjection = UtilsMath.getClosestPointOnLine(hitResults[0].pos, data.sourceData.pos, data.dir);

            UtilsGameplay.sendNetworkEvent(this.hzObj, candidate.gameplayObject, actionEvent, {
                ...data,
                changeData: {
                    ...data.changeData,
                    amountCalculationScheme: AmountCalculationScheme.USE_AMOUNT, // use max since we're calculating the final amount here
                    amount: this.calculateSplashFallOff(
                        data.changeData.minAmount,
                        data.changeData.amount,
                        data.changeData.aoeAmountCalculationScheme,
                        lineProjection,
                        hitPos,
                        sqrMinRadius,
                        sqrRadius),
                },
                targetData: candidate.getEventTargetData(),
                sourceData: {
                    ...data.sourceData,
                    pos: hitPos,
                },
            });
        });

        if (DRAW_CONE_DEBUG_VISUALS) {
            drawDebugCone(data.sourceData.pos, data.dir, data.range, data.minRadius, 3, Color.red);
            drawDebugCone(data.sourceData.pos, data.dir, data.range, data.radius, 3, Color.green);
        }
    }

    handleSplashForce(data: ForceDataSplash) {
        if (data.radius <= 0) {
            return;
        }

        ServerBaseObjRegistry.forEachTarget(data.targetScheme, data.sourceData, (value) => {
            const result = value.getFirstBodyPartInRange(data.sourceData.pos, data.radius, ConstsObj.DAMAGE_TARGET_PARTS);
            if (result && result.didHit) {
                this.applySplashForce(value, data.sourceData.pos, data.forceData.forceType, data.forceData.force, data.horizontalOnly, data.sourceData);
            }
        });
    }

    applySplashForce(obj: BaseObj.BaseObj, origin: Vec3, forceType: ForceType, force: number, horizontalOnly: boolean, sourceData: SourceData) {
        const dir = Vec3.sub(obj.getPos(), origin);
        if (horizontalOnly) {
            dir.y = 0;
        }
        dir.normalizeInPlace();
        UtilsGameplay.sendNetworkEvent(this.hzObj, obj.gameplayObject, EventsNetworked.applyForce, {
            targetData: obj.getEventTargetData(),
            forceData: {
                ...FORCE_DATA_DEFAULT,
                forceType: forceType,
                force: force,
                forceDir: dir,
            },
            sourceData: sourceData,
        });
    }

    private getUnobstructedHits(objHitResults: ObjHitResult[], changeData: ChangeDataWithSource, target: BaseObj.BaseObj, rayDistanceOffset: number) {
        const unobstructedHits: ObjHitResult[] = [];

        objHitResults.forEach((hitResultData) => {
            const targetPartPos = target.getTargetPartPos(hitResultData.bodyPart);
            if (!targetPartPos) return;

            const rayDirection = changeData.sourceData.pos.sub(targetPartPos).normalize();
            const rayStart = targetPartPos.add(rayDirection.mul(UNOBSTRUCTED_RAY_START_OFFSET));
            const rayMaxDistance = rayStart.distance(changeData.sourceData.pos);
            const hit = raycastIgnoreAncestorTags(
                GlobalServerObjects.instance?.props.raycast,
                rayStart,
                rayDirection,
                rayMaxDistance + rayDistanceOffset,
                ['weapon', 'hittable'],
                .05,
                LayerType.Objects,
            );

            if (hit) {
                if (DRAW_LINE_DEBUGS_SPLASH_CONE) drawDebugLine(rayStart, hit.hitPoint, Color.red, 5);
                return;
            }

            if (DRAW_LINE_DEBUGS_SPLASH_CONE) drawDebugLine(rayStart, rayStart.add(rayDirection.mul(rayMaxDistance)), Color.green, 5);
            unobstructedHits.push(hitResultData);
        });

        return unobstructedHits.length > 0 ? unobstructedHits : undefined;
    }
}
