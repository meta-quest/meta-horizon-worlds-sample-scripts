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
import * as ConstsAbility from 'ConstsAbility';
import { validAbilityId } from 'ConstsIdsAbility';
import { EntityOrPlayer } from 'ConstsObj';
import * as EventsNetworked from 'EventsNetworked';
import { Player, PropTypes, World } from 'horizon/core';
import { playSFXForEveryone, playVFXForEveryone, setVFXParameters } from 'UtilsFX';
import * as UtilsGameplay from 'UtilsGameplay';

export const VFX_ID_COLOR = 'color';
export const VFX_ID_RADIUS = 'radius_m';

export abstract class BaseAbilityObj<T = typeof BaseAbilityObj> extends BasePlayerObjHzComponent<typeof BaseAbilityObj & T> {
    static propsDefinition = {
        ...BasePlayerObjHzComponent.propsDefinition,
        ownerObj: {type: PropTypes.Entity},
        abilityId: {type: PropTypes.String, default: ''},

        attackStartVFX: {type: PropTypes.Entity},
        attackStartSFX: {type: PropTypes.Entity},

        attackStopVFX: {type: PropTypes.Entity},
        attackStopSFX: {type: PropTypes.Entity},
    };

    abilityData: ConstsAbility.AbilityData = ConstsAbility.ABILITY_DATA_DEFAULT;
    tickTimer = 0;
    isActive = false;
    didStart = false;

    preStart() {
        super.preStart();

        //** Local Attack */
        UtilsGameplay.connectLocalEvent(this, this.entity, EventsNetworked.startAttack, (data) => this.startAttack());
        UtilsGameplay.connectLocalEvent(this, this.entity, EventsNetworked.stopAttack, (data) => this.stopAttack());
        UtilsGameplay.connectLocalEvent(this, this.entity, EventsNetworked.startHit, (data) => this.startHit());
        UtilsGameplay.connectLocalEvent(this, this.entity, EventsNetworked.stopHit, (data) => this.stopHit());

        //** Newtorked Attack */
        UtilsGameplay.connectNetworkEvent(this, this.entity, EventsNetworked.startAttack, (data) => this.startAttack());
        UtilsGameplay.connectNetworkEvent(this, this.entity, EventsNetworked.stopAttack, (data) => this.stopAttack());
        UtilsGameplay.connectNetworkEvent(this, this.entity, EventsNetworked.startHit, (data) => this.startHit());
        UtilsGameplay.connectNetworkEvent(this, this.entity, EventsNetworked.stopHit, (data) => this.stopHit());

        this.connectLocalBroadcastEvent(World.onUpdate, (data) => this.update(data.deltaTime));

        const data = ConstsAbility.ABILITY_DATA_REGISTRY.get(this.abilityId());
        if (data) {
            this.abilityData = data;
        }

        setVFXParameters(this.props.attackStartVFX, [
            [VFX_ID_COLOR, this.abilityData.color],
            [VFX_ID_RADIUS, this.abilityData.radius]
        ]);

        setVFXParameters(this.props.attackStopVFX, [
            [VFX_ID_COLOR, this.abilityData.color],
            [VFX_ID_RADIUS, this.abilityData.radius]
        ]);

        this.setOwner(this.entity.owner.get());


        this.async.setTimeout(() => this.start(), 100);
    }

    start() {
        if (this.didStart) {
            return;
        }

        this.didStart = true;

        super.start();
    }

    override setOwner(player: Player) {
        super.setOwner(player);

        UtilsGameplay.setOwner(this.owner, this.props.attackStartVFX);
        UtilsGameplay.setOwner(this.owner, this.props.attackStartSFX);

        UtilsGameplay.setOwner(this.owner, this.props.attackStopVFX);
        UtilsGameplay.setOwner(this.owner, this.props.attackStopSFX);
    }

    startAttack() {
        UtilsGameplay.setVisibilityAndCollidable(this.entity, true);
        playVFXForEveryone(this.props.attackStartVFX);
        playSFXForEveryone(this.props.attackStartSFX);

        if (this.abilityData.abilityObjectData && this.abilityData.abilityObjectData.onStartAttack) {
            this.abilityData.abilityObjectData.onStartAttack(this);
        }
    }

    stopAttack() {
        playVFXForEveryone(this.props.attackStopVFX);
        playSFXForEveryone(this.props.attackStopSFX);
        UtilsGameplay.setVisibilityAndCollidable(this.entity, false);

        if (this.abilityData.abilityObjectData && this.abilityData.abilityObjectData.onStopAttack) {
            this.abilityData.abilityObjectData.onStopAttack(this);
        }
    }

    startHit() {
        this.tickTimer = 0;
        this.isActive = true;
        if (this.abilityData.abilityObjectData && this.abilityData.abilityObjectData.onStartHit) {
            this.abilityData.abilityObjectData.onStartHit(this);
        }
    }

    stopHit() {
        this.isActive = false;
        if (this.abilityData.abilityObjectData && this.abilityData.abilityObjectData.onStopHit) {
            this.abilityData.abilityObjectData.onStopHit(this);
        }
    }

    update(deltaTime: number) {
        if (!this.isActive) {
            return;
        }

        this.tickTimer += deltaTime;
        if (this.tickTimer >= this.abilityData.tickRate) {
            this.tickTimer = 0;
            this.onTick();
        }
    }

    onTick() {
        if (this.abilityData.abilityObjectData && this.abilityData.abilityObjectData.onTick) {
            this.abilityData.abilityObjectData.onTick(this);
        }
    }

    getOwnerData(): EntityOrPlayer | undefined {
        if (this.ownerIsPlayer) {
            return this.owner;
        } else if (UtilsGameplay.exists(this.props.ownerObj)) {
            return this.props.ownerObj;
        }
        return undefined;
    }

    protected abilityId() {
        return validAbilityId(this.props.abilityId);
    }
}
