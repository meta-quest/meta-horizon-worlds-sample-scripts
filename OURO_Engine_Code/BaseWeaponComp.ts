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

import { BasePlayerObjHzComponent } from 'BaseHzComponent';
import { BaseWeapon, ProjectileFiringPayload } from 'BaseWeapon';
import { EntityOrPlayer } from 'ConstsObj';
import * as EventData from 'EventData';
import { ChangeData } from 'EventData';
import * as GameActionHelpers from 'GameActionHelpers';
import { Entity, Player, PropTypes, Vec3 } from 'horizon/core';
import { getFirstComponentInSelfOrChildren, isServerPlayer } from 'UtilsGameplay';

export interface IWeaponComp {
    parentWeapon: BaseWeapon;

    onWeaponDataChanged(): void;

    onWeaponModifiersChanged(): void;

    setIsEnabled(enabled: boolean): void;

    update(deltaTime: number): void;

    onGrab?(isRightHand: boolean): void;

    onRelease(): void;

    onFirePressed(target?: EntityOrPlayer): void;

    onFireReleased(): void;

    onReload(): void;

    onHolsterAll(): void;

    onAmmoChanged(currentAmmo: number): void;

    onTargetAcquired(targetId: EntityOrPlayer): void;

    onFiredSuccess(projectileSettings: ProjectileFiringPayload): void;

    setIsStunned(isStunned: boolean): void;

    onStartAttack(): void;

    onStopAttack(): void;

    onStartHit(): void;

    onStopHit(): void;

    onVisibilityChanged?(isVisible: boolean): void;
}

export abstract class BaseWeaponComp<T = typeof BaseWeaponComp> extends BasePlayerObjHzComponent<typeof BaseWeaponComp & T> implements IWeaponComp {
    static propsDefinition = {
        ...BasePlayerObjHzComponent.propsDefinition,
        parent: {type: PropTypes.Entity}
    };

    parentWeapon!: BaseWeapon;
    isEnabled = true;

    override preStart() {
        super.preStart();

        this.setOwner(this.entity.owner.get());
    }

    override start() {
        super.start();

        const parentWeaponScript = getFirstComponentInSelfOrChildren<BaseWeapon>(this.props.parent);
        if (!parentWeaponScript) {
            console.error(`BaseWeaponComp: ${this.entity.name.get()}[${this.entity.id}] expected to have a prop parent, but is unset`);
            return;
        }

        this.setParentWeapon(parentWeaponScript);
    }

    setParentWeapon(weapon: BaseWeapon) {
        this.parentWeapon = weapon;
        this.parentWeapon.addComponent(this);
        this.onWeaponDataChanged();
    }

    onWeaponDataChanged() {
        // for children to implement
    }

    onWeaponModifiersChanged() {
        // for children to implement
    }

    setIsEnabled(enabled: boolean) {
        this.isEnabled = enabled;
    }

    applyAction(target: Player | Entity, changeData: ChangeData, worldPos: Vec3, targetRelativePos?: Vec3) {
        GameActionHelpers.applyAction(this, target, changeData, this.parentWeapon.getWeaponSourceData(), worldPos, targetRelativePos);
    }

    applySplashAction(changeData: ChangeData, origin: Vec3, minRadius: number, radius: number, targetSelectionData: EventData.TargetingSelectionData = EventData.TARGETING_SELECTION_DATA_DEFAULT) {
        GameActionHelpers.applySplashAction(this, changeData, this.parentWeapon.getWeaponSourceData(), origin, minRadius, radius, targetSelectionData);
    }

    applyBeamAction(changeData: ChangeData, origin: Vec3, dir: Vec3, minRadius: number, radius: number, range: number, targetSelectionData: EventData.TargetingSelectionData = EventData.TARGETING_SELECTION_DATA_DEFAULT) {
        GameActionHelpers.applyBeamAction(this, changeData, this.parentWeapon.getWeaponSourceData(), origin, dir, minRadius, radius, range, targetSelectionData);
    }

    applyConeAction(changeData: ChangeData, origin: Vec3, dir: Vec3, minRadius: number, radius: number, range: number, targetSelectionData: EventData.TargetingSelectionData = EventData.TARGETING_SELECTION_DATA_DEFAULT) {
        GameActionHelpers.applyConeAction(this, changeData, this.parentWeapon.getWeaponSourceData(), origin, dir, minRadius, radius, range, targetSelectionData);
    }

    applyForce(target: Player | Entity, forceType: EventData.ForceType, force: number, forceDir: Vec3) {
        GameActionHelpers.applyForce(this, target, this.parentWeapon.getWeaponSourceData(), forceType, force, forceDir);
    }

    handleSplashForce(targetScheme: EventData.TargetScheme, origin: Vec3, forceType: EventData.ForceType, force: number, radius: number, horizontalOnly: boolean) {
        GameActionHelpers.handleSplashForce(this, this.parentWeapon.getWeaponSourceData(), targetScheme, origin, forceType, force, radius, horizontalOnly);
    }

    update(deltaTime: number) {

    }

    onGrab?(isRightHand: boolean) {

    }

    onRelease() {

    }

    onFirePressed(target?: EntityOrPlayer) {

    }

    onFireReleased() {

    }

    onReload() {
    }

    onHolsterAll() {
    }

    onAmmoChanged(currentAmmo: number) {

    }

    onTargetAcquired(targetEntityId: EntityOrPlayer) {

    }

    onFiredSuccess(projectileSettings: ProjectileFiringPayload) {

    }

    setIsStunned(isStunned: boolean) {

    }

    onStartAttack() {

    }

    onStopAttack() {

    }

    onStartHit() {

    }

    onStopHit() {

    }

    onDestroy() {

    }

    /**HACK: this is only for dummies in our game, but if a subcomponent of an entity is hit, and it's owned by the server it's going to be the dummy so return its root.*/
    protected getCorrectTargetIfHitDummy(owner: Player, targetObj: Entity): Entity {
        if (!isServerPlayer(owner, this.world)) {
            return targetObj;
        }

        const dummyRoot = targetObj.parent.get();
        return dummyRoot ? dummyRoot : targetObj;
    }
}
