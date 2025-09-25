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
import { AttributeId } from 'ConstsAttributes';
import { WeaponId } from 'ConstsIdsWeapon';
import * as ConstsWeapon from 'ConstsWeapon';
import * as EventsNetworked from 'EventsNetworked';
import { Entity } from 'horizon/core';

export class CompAttack implements BaseObj.IObjectComponent {
    weaponEntities: Entity[] = [];

    constructor(public parent: BaseObj.BaseObj) {
    }

    addWeapon(weapon: Entity) {
        this.weaponEntities.push(weapon);
        this.parent.horizonApiProvider.sendNetworkEvent(weapon, EventsNetworked.setIsEnabled, {isEnabled: this.canUseWeapon()});
        this.parent.horizonApiProvider.sendNetworkEvent(weapon, EventsNetworked.setWeaponModifiers, this.calculateWeaponModifiers());
    }

    removeAllWeapons() {
        this.weaponEntities.length = 0;
    }

    onWeaponGrab(weapon: Entity, weaponId: WeaponId) {
        this.parent.horizonApiProvider.sendNetworkEvent(weapon, EventsNetworked.setIsEnabled, {isEnabled: this.canUseWeapon()});
        this.parent.horizonApiProvider.sendNetworkEvent(weapon, EventsNetworked.setWeaponModifiers, this.calculateWeaponModifiers());
    }

    setWeaponsEnabled(enabled: boolean) {
        for (let i = 0; i < this.weaponEntities.length; ++i) {
            this.parent.horizonApiProvider.sendNetworkEvent(this.weaponEntities[i], EventsNetworked.setIsEnabled, {isEnabled: this.canUseWeapon()});
        }
    }

    canUseWeapon() {
        return this.parent.health.isAlive;
    }

    calculateWeaponModifiers(): ConstsWeapon.WeaponModifiers {
        return {
            ...ConstsWeapon.WEAPON_MODIFIERS_DEFAULT,
            hasInfiniteAmmo: this.parent.attributes.calculateAttributeValue(AttributeId.WEAPON_INFINITE_AMMO) != 0,
            attackSpeedMultiplier: this.parent.attributes.calculateAttributeValue(AttributeId.ATTACK_SPEED_MULTIPLIER),
            forceEnableAutoFire: this.parent.attributes.calculateAttributeValue(AttributeId.FORCE_ENABLE_AUTO_FIRE) != 0,
            ammoRegenRateMultiplier: this.parent.attributes.calculateAttributeValue(AttributeId.WEAPON_AMMO_REGEN_RATE_MULTIPLIER),
            weaponReloadTimeReductionPercent: this.parent.attributes.calculateAttributeValue(AttributeId.WEAPON_RELOAD_TIME_REDUCTION_PERCENT),
            extraMaxAmmo: this.parent.attributes.calculateAttributeValue(AttributeId.WEAPON_EXTRA_MAX_AMMO),
            projectileSpeedMetersPerSecMultiplier: this.parent.attributes.calculateAttributeValue(AttributeId.WEAPON_PROJECTILE_SPEED_METERS_PER_SEC_MULTIPLIER),
            projectileRangeMultiplier: this.parent.attributes.calculateAttributeValue(AttributeId.WEAPON_PROJECTILE_RANGE_METERS_MULTIPLIER),
            splashRadiusMultiplier: this.parent.attributes.calculateAttributeValue(AttributeId.WEAPON_SPLASH_RADIUS_MULTIPLIER),
        };
    }

    updateWeaponModifiers() {
        this.weaponEntities.forEach((weaponEntity) => {
            this.parent.horizonApiProvider.sendNetworkEvent(weaponEntity, EventsNetworked.setWeaponModifiers, this.calculateWeaponModifiers());
        });
    }
}
