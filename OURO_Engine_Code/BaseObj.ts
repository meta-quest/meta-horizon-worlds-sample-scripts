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

import { CompAttack } from 'CompAttack';
import { CompAttributes } from 'CompAttributes';
import { CompHealth } from 'CompHealth';
import { CompMovement } from 'CompMovement';
import { CompStatusEffects } from 'CompStatusEffects';
import * as ConstsActor from 'ConstsActor';
import * as ConstsObj from 'ConstsObj';
import { EntityOrPlayer, ObjHitResult, ObjTargetPart } from 'ConstsObj';
import * as EventData from 'EventData';
import { ReplicatedObjPartData } from 'EventsNetworked';
import { Color, Component, Player, Vec3 } from 'horizon/core';
import { ServerBaseObjRegistry } from 'ServerBaseObjRegistry';
import { setCollidable, setVisible } from 'UtilsGameplay';

export const DEFAULT_BODY_PART_RADIUS = 0.5;

export interface IBaseObjImplementation {
    getTargetPartPos(targetPart: ConstsObj.ObjTargetPart, local: boolean): Vec3 | undefined;

    getTargetPartRadius(targetPart: ConstsObj.ObjTargetPart): number;

    getActorId(): bigint | undefined;

    isInAOERange(origin: Vec3, radius: number, targetPart: ConstsObj.ObjTargetPart): ConstsObj.ObjHitResult | undefined;

    isInConeArea(origin: Vec3, dir: Vec3, radius: number, dist: number, targetPart: ConstsObj.ObjTargetPart): ConstsObj.ObjHitResult | undefined;

    isInBeamArea(origin: Vec3, dir: Vec3, radius: number, dist: number, targetPart: ConstsObj.ObjTargetPart): ConstsObj.ObjHitResult | undefined;

    getWeakPointData(id: number): ConstsActor.ActorWeakPointData | undefined;

    getMaterial(): ConstsObj.ObjMaterial | undefined;

    shouldShowDebug(): boolean;

    setDebugText(text: string): void;

    setDebugLine(start: Vec3, end: Vec3, color: Color): void;

    getTeamId(): number | undefined;

    getReplicatedObjPartsData(): ReplicatedObjPartData[];
}

/**
 *  The BaseObj is our god object, that both game Player representations and NPCs are both rooted from. This class only lives on the server.
 *
 *  Every BaseObj has two distinct things:
 *  @param lifecycleProvider - This is the underlying lifecycle provider and lives as long as the BaseObj does. Since all of these objects live on the server, and players are obviously controlled
 *  and owned by player clients, we need something to root them on the server. For GamePlayers, this is actually the Game object. For BaseActors, since they're spawned on the server and are discrete
 *  entities, we use the spawned entity root.
 *
 *  @param networkedOwner - However, we still want to be able to send things to a specific client. For this use case, use this field since it can be owned and running on another Horizon client
 */
export class BaseObj implements IBaseObjImplementation {
    isEnabled = true;
    components: IObjectComponent[] = [];
    attributes = new CompAttributes(this);
    statusEffects = new CompStatusEffects(this);
    health = new CompHealth(this);
    movement = new CompMovement(this);
    attack = new CompAttack(this);
    implementation?: IBaseObjImplementation;
    debugLogString: string | undefined = undefined;

    constructor(
        readonly horizonApiProvider: Component<any>,
        readonly gameplayObject: EntityOrPlayer,
    ) {
        ServerBaseObjRegistry.registerObj(this);
        this.pushReplicatedObjDataForOtherClients();
    }

    initializeComponents() {
        this.pushReplicatedObjDataForOtherClients();

        this.addComponent(this.attributes);
        this.addComponent(this.statusEffects);
        this.addComponent(this.health);
        this.addComponent(this.movement);
        this.addComponent(this.attack);
    }

    addComponent(component: IObjectComponent) {
        this.components.push(component);
        if (component.initialize) {
            component.initialize();
        }
    }

    setIsEnabled(isEnabled: boolean) {
        this.isEnabled = isEnabled;
        this.components.forEach((value) => {
            if (value.setIsEnabled) {
                value.setIsEnabled(this.isEnabled);
            }
        });
    }

    setVisibilityAndCollidability(isVisibleAndCollidable: boolean) {
        if (this.gameplayObject instanceof Player) return;
        setVisible(this.gameplayObject, isVisibleAndCollidable);
        setCollidable(this.gameplayObject, isVisibleAndCollidable);
    }

    update(deltaTime: number) {
        this.components.forEach((value) => {
            if (value.update) {
                value.update(deltaTime);
            }
        });
    }

    updateCapabilities() {
        this.attack.setWeaponsEnabled(this.attack.canUseWeapon());
    }

    onDestroy() {
        this.components.forEach((value) => value.onDestroy?.());
        ServerBaseObjRegistry.unregister(this);
        this.pushReplicatedObjDataForOtherClients();
    }

    getEventTargetData(): EntityOrPlayer {
        return this.gameplayObject;
    }

    isTarget(targetData: EntityOrPlayer | undefined) {
        return this.getEventTargetData() == targetData;
    }

    canBeTargeted() {
        return this.health.isAlive;
    }

    getDisplayName() {
        return this.gameplayObject.name.get();
    }

    getPos() {
        return this.gameplayObject.position.get();
    }

    getRotation() {
        return this.gameplayObject.rotation.get();
    }

    getForward() {
        return this.gameplayObject.forward.get();
    }

    getActorId(): bigint | undefined {
        return this.implementation?.getActorId();
    }

    getMaterial() {
        return this.implementation?.getMaterial();
    }

    getTargetPartPos(targetPart: ConstsObj.ObjTargetPart, local: boolean = false): Vec3 | undefined {
        return this.implementation?.getTargetPartPos(targetPart, local);
    }

    getTargetPartRadius(targetPart: ConstsObj.ObjTargetPart): number {
        return this.implementation?.getTargetPartRadius(targetPart) ?? DEFAULT_BODY_PART_RADIUS;
    }

    getWeakPointData(id: number) {
        return this.implementation?.getWeakPointData(id);
    }

    isInAOERange(origin: Vec3, radius: number, targetPart: ConstsObj.ObjTargetPart = ConstsObj.ObjTargetPart.TORSO): ConstsObj.ObjHitResult | undefined {
        return this.implementation?.isInAOERange(origin, radius, targetPart);
    }

    isInBeamArea(origin: Vec3, dir: Vec3, radius: number, dist: number, targetPart: ConstsObj.ObjTargetPart = ConstsObj.ObjTargetPart.TORSO): ConstsObj.ObjHitResult | undefined {
        return this.implementation?.isInBeamArea(origin, dir, radius, dist, targetPart);
    }

    isInConeArea(origin: Vec3, dir: Vec3, radius: number, dist: number, targetPart: ConstsObj.ObjTargetPart = ConstsObj.ObjTargetPart.TORSO): ConstsObj.ObjHitResult | undefined {
        return this.implementation?.isInConeArea(origin, dir, radius, dist, targetPart);
    }

    setDebugLine(start: Vec3, end: Vec3, color: Color = Color.white) {
        this.implementation?.setDebugLine(start, end, color);
    }

    setDebugText(text: string) {
        this.implementation?.setDebugText(text);
    }

    shouldShowDebug() {
        if (this.implementation) {
            return this.implementation.shouldShowDebug();
        }
        return false;
    }

    forEachTarget(targetScheme: EventData.TargetScheme, sourceData: EventData.SourceData, action: (value: BaseObj) => void) {
        return ServerBaseObjRegistry.forEachTarget(targetScheme, sourceData, action);
    }

    getFirstBodyPartInRange(origin: Vec3, radius: number, bodyParts: ConstsObj.ObjTargetPart[], minRadius: number = 0): ConstsObj.ObjHitResult | undefined {
        for (let i = 0; i < bodyParts.length; ++i) {
            const result = this.isInAOERange(origin, ConstsObj.doesBodyPartUseMinRadius(bodyParts[i]) ? minRadius : radius, bodyParts[i]);
            if (result && result.didHit) {
                return result;
            }
        }
    }

    getBodyPartsInRange(origin: Vec3, radius: number, targetParts: ConstsObj.ObjTargetPart[], minRadius: number = 0) {
        const hitResults: ObjHitResult[] = [];
        targetParts.forEach((part) => {
            const result = this.isInAOERange(origin, radius, part);
            if (!result?.didHit) return;

            hitResults.push(result);
        });

        return hitResults;
    }

    getBodyPartsInCone(origin: Vec3, dir: Vec3, radius: number, range: number, targetParts: ConstsObj.ObjTargetPart[], minRadius: number = 0) {
        const hitResults: ObjHitResult[] = [];
        targetParts.forEach((part) => {
            // TODO: see IF we should add minRadius calculation back in here..
            const result = this.isInConeArea(origin, dir, radius, range, part);
            if (!result?.didHit) return;

            hitResults.push(result);
        });

        return hitResults;
    }

    getFirstBodyPartInBeam(origin: Vec3, dir: Vec3, radius: number, range: number, bodyParts: ConstsObj.ObjTargetPart[], minRadius: number = 0): ConstsObj.ObjHitResult | undefined {
        for (let i = 0; i < bodyParts.length; ++i) {
            const result = this.isInBeamArea(origin, dir, ConstsObj.doesBodyPartUseMinRadius(bodyParts[i]) ? minRadius : radius, range, bodyParts[i]);
            if (result && result.didHit) {
                return result;
            }
        }
    }

    getReplicatedObjPartsData(): ReplicatedObjPartData[] {
        return this.implementation?.getReplicatedObjPartsData() ?? [{targetPart: ObjTargetPart.UNDEFINED, entity: null}];
    }

    private pushReplicatedObjDataForOtherClients() {
        ServerBaseObjRegistry.forEachPlayerObj((playerObj) => {
            if (playerObj == this) {
                return;
            }

            playerObj.sendUpdateReplicatedObjs();
        });
    }

    sendUpdateReplicatedObjs() {
        // overridden in children
    }

    public pushReplicatedObjDataForAllClients() {
        ServerBaseObjRegistry.forEachPlayerObj((playerObj) => playerObj.sendUpdateReplicatedObjs());
    }

    getTeamId(): number | undefined {
        return this.implementation?.getTeamId();
    }

    isValidTarget(targetScheme: EventData.TargetScheme, sourceData: EventData.SourceData) {
        const sourceObj = ServerBaseObjRegistry.getObjFrom(sourceData);

        const isOwner = sourceObj?.gameplayObject == this.gameplayObject;
        const isPlayer = this.gameplayObject instanceof Player;

        const teamId = this.getTeamId();
        let isTeamMate = !!sourceObj && teamId != undefined && sourceObj.getTeamId() == teamId;

        switch (targetScheme) {
            case EventData.TargetScheme.ALL:
                return !isOwner;
            case EventData.TargetScheme.ALL_INCLUDING_OWNER:
                return true;
            case EventData.TargetScheme.OWNER_ONLY:
                return isOwner;
            case EventData.TargetScheme.PLAYERS_ONLY:
                return isPlayer && !isOwner;
            case EventData.TargetScheme.PLAYERS_ONLY_INCLUDING_OWNER:
                return isPlayer;
            case EventData.TargetScheme.ENTITIES_ONLY:
                return !isPlayer && !isOwner;
            case EventData.TargetScheme.ENTITIES_ONLY_INCLUDING_OWNER:
                return !isPlayer;
            case EventData.TargetScheme.TEAM_ONLY:
                return isTeamMate && !isOwner;
            case EventData.TargetScheme.ENEMY_TEAM_ONLY:
                return !isTeamMate && !isOwner;
            default:
                console.error('isValidTarget - scheme: ' + EventData.TargetScheme[targetScheme] + ', missing scheme');
                return false;
        }
    }
}

export interface IObjectComponent {
    parent: IBaseObjImplementation;

    initialize?(): void;

    reset?(): void;

    setIsEnabled?(isEnabled: boolean): void;

    update?(deltaTime: number): void;

    onDestroy?(): void;
}
