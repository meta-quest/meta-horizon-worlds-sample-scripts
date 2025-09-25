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
import * as ConstsAttributes from 'ConstsAttributes';
import { AttributeId, AttributeMod } from 'ConstsAttributes';
import * as EventData from 'EventData';

export class CompAttributes implements BaseObj.IObjectComponent {
    parent: BaseObj.BaseObj;

    initialAttributes = new Map<ConstsAttributes.AttributeId, ConstsAttributes.Attribute>();
    attributes = new Map<ConstsAttributes.AttributeId, ConstsAttributes.Attribute>();

    constructor(parent: BaseObj.BaseObj) {
        this.parent = parent;
    }

    initialize() {

    }

    reset() {
        this.attributes.clear();
        this.initialAttributes.forEach((value, key) => {
            this.attributes.set(key, value);
        });

        this.updateSystems();
    }

    setInitialAttributes(attributes: Map<ConstsAttributes.AttributeId, ConstsAttributes.Attribute>, clearExisting: boolean = true) {
        if (clearExisting) {
            this.initialAttributes.clear();
        }
        attributes.forEach((value, key) => {
            this.initialAttributes.set(key, {...value});
        });

        this.reset();
    }

    updateSystems(targetMods?: AttributeMod[]) {
        if (targetMods) {
            // NOTE: The data in targetMods is not actually used when updating the attribute.
            // This simply tells the attribute system to re-poll Status Effects for attributes of id `targetMods[].id`.
            // Whether an attribute was added or removed will be picked up in the re-poll and is not indicative of the data sent with targetMods.
            targetMods.forEach((mod) => {
                updateSystemsForAttribute(this, mod.id);
            });
            return;
        }

        this.attributes.forEach((value, key) => {
            updateSystemsForAttribute(this, key);
        });
    }

    hasAttribute(id: ConstsAttributes.AttributeId) {
        return this.attributes.has(id);
    }

    calculateAttributeValue(id: ConstsAttributes.AttributeId, multiplierId?: ConstsAttributes.AttributeId) {
        const attribute = this.attributes.get(id);
        if (!attribute) {
            console.warn('Missing Attribute: ' + AttributeId[id]);
            return 0;
        }

        // apply status effect mods
        let value = attribute.value;
        if (this.parent.statusEffects.hasAttributeMods(id, ConstsAttributes.AttributeModScheme.SET_TAKE_MAX)) {
            value = this.parent.statusEffects.getAttributeMods(id, ConstsAttributes.AttributeModScheme.SET_TAKE_MAX);
        } else {
            value += this.parent.statusEffects.getAttributeMods(id, ConstsAttributes.AttributeModScheme.BASE_ADD);
            let multiplier = 1.0 + this.parent.statusEffects.getAttributeMods(id, ConstsAttributes.AttributeModScheme.MULTIPLY);
            value *= multiplier;
            value += this.parent.statusEffects.getAttributeMods(id, ConstsAttributes.AttributeModScheme.ADD);
        }

        if (multiplierId != undefined) {
            const multiplier = this.calculateAttributeValue(multiplierId);
            value *= multiplier;
        }

        if (attribute.min != undefined) {
            value = Math.max(attribute.min, value);
        }
        if (attribute.max != undefined) {
            value = Math.min(attribute.max, value);
        }

        return value;
    }

    multiplyAmount(amount: number,
                   max: number,
                   scheme: EventData.ChangeScheme,
                   multiplierSource: BaseObj.BaseObj | undefined,
                   percentMultiplierAttribute: ConstsAttributes.AttributeId,
                   shouldRound: boolean = true) {
        let calculatedAmount = amount;

        switch (scheme) {
            case EventData.ChangeScheme.PERCENT:
                calculatedAmount *= max;
                break;
        }

        if (multiplierSource && multiplierSource.attributes.hasAttribute(percentMultiplierAttribute)) {
            const multiplierPercent = multiplierSource.attributes.calculateAttributeValue(percentMultiplierAttribute);
            calculatedAmount *= multiplierPercent;
        }

        return shouldRound ? Math.round(calculatedAmount) : calculatedAmount;
    }
}

//**------------------------------------- ATTRIBUTE HELPERS -------------------------------------*/

export type AttributeUpdateFunc = (comp: CompAttributes, id: AttributeId) => void;
export const ATTRIBUTE_UPDATE_MAPPING = new Map<AttributeId, AttributeUpdateFunc>();

export function registerAttributeUpdateFunc(id: AttributeId, func: AttributeUpdateFunc) {
    if (ATTRIBUTE_UPDATE_MAPPING.has(id)) {
        console.warn('Duplicate attribute update mapping registered: ' + id.toString());
    }
    ATTRIBUTE_UPDATE_MAPPING.set(id, func);
}

export function updateSystemsForAttribute(comp: CompAttributes, id: AttributeId) {
    const func = ATTRIBUTE_UPDATE_MAPPING.get(id);
    if (func) {
        func(comp, id);
    }
}

//**------------------------------------- HEALTH -------------------------------------*/
registerAttributeUpdateFunc(
    AttributeId.IS_INVULNERABLE,
    (comp: CompAttributes, id: AttributeId) => {
        comp.parent.pushReplicatedObjDataForAllClients();
    }
);

registerAttributeUpdateFunc(
    AttributeId.MAX_HP,
    (comp: CompAttributes, id: AttributeId) => {
        comp.parent.health.setMaxHp(comp.calculateAttributeValue(id), false);
    }
);

//**------------------------------------- UNDER SHIELD -------------------------------------*/
registerAttributeUpdateFunc(
    AttributeId.MAX_UNDER_SHIELD_HP,
    (comp: CompAttributes, id: AttributeId) => {
        comp.parent.health.setUnderShieldMaxHp(comp.calculateAttributeValue(id), false);
    }
);

//**------------------------------------- MOVEMENT -------------------------------------*/
registerAttributeUpdateFunc(
    AttributeId.MOVEMENT_SPEED,
    (comp: CompAttributes, id: AttributeId) => {
        comp.parent.movement.setBaseSpeed(comp.calculateAttributeValue(id));
    }
);

registerAttributeUpdateFunc(
    AttributeId.MOVEMENT_SPEED_MULTIPLIER,
    (comp: CompAttributes, id: AttributeId) => {
        comp.parent.movement.setSpeedMultiplier(comp.calculateAttributeValue(id));
    }
);

registerAttributeUpdateFunc(
    AttributeId.MOVEMENT_GRAVITY,
    (comp: CompAttributes, id: AttributeId) => {
        comp.parent.movement.setGravity(comp.calculateAttributeValue(id));
    }
);

registerAttributeUpdateFunc(
    AttributeId.MOVEMENT_GRAVITY_MULTIPLIER,
    (comp: CompAttributes, id: AttributeId) => {
        comp.parent.movement.setGravityMultiplier(comp.calculateAttributeValue(id));
    }
);

registerAttributeUpdateFunc(
    AttributeId.MOVEMENT_MAX_JUMP_COUNT,
    (comp: CompAttributes, id: AttributeId) => {
        comp.parent.movement.setMaxJumpCount(comp.calculateAttributeValue(id));
    }
);

registerAttributeUpdateFunc(
    AttributeId.MOVEMENT_JUMP_FORCE,
    (comp: CompAttributes, id: AttributeId) => {
        comp.parent.movement.setJumpForce(comp.calculateAttributeValue(id));
    }
);

registerAttributeUpdateFunc(
    AttributeId.MOVEMENT_JUMP_FORCE_MULTIPLIER,
    (comp: CompAttributes, id: AttributeId) => {
        comp.parent.movement.setJumpForceMultiplier(comp.calculateAttributeValue(id));
    }
);

//**------------------------------------- ATTACKING -------------------------------------*/
registerAttributeUpdateFunc(
    AttributeId.ATTACK_SPEED_MULTIPLIER,
    (comp: CompAttributes, id: AttributeId) => {
        comp.parent.attack.updateWeaponModifiers();
    }
);

registerAttributeUpdateFunc(
    AttributeId.FORCE_ENABLE_AUTO_FIRE,
    (comp: CompAttributes, id: AttributeId) => {
        comp.parent.attack.updateWeaponModifiers();
    }
);

//**------------------------------------- WEAPONS -------------------------------------*/
registerAttributeUpdateFunc(
    AttributeId.WEAPON_INFINITE_AMMO,
    (comp: CompAttributes, id: AttributeId) => {
        comp.parent.attack.updateWeaponModifiers();
    }
);

registerAttributeUpdateFunc(
    AttributeId.WEAPON_AMMO_REGEN_RATE_MULTIPLIER,
    (comp: CompAttributes, id: AttributeId) => {
        comp.parent.attack.updateWeaponModifiers();
    }
);

registerAttributeUpdateFunc(
    AttributeId.WEAPON_RELOAD_TIME_REDUCTION_PERCENT,
    (comp: CompAttributes, id: AttributeId) => {
        comp.parent.attack.updateWeaponModifiers();
    }
);
registerAttributeUpdateFunc(
    AttributeId.WEAPON_EXTRA_MAX_AMMO,
    (comp: CompAttributes, id: AttributeId) => {
        comp.parent.attack.updateWeaponModifiers();
    }
);
registerAttributeUpdateFunc(
    AttributeId.WEAPON_PROJECTILE_SPEED_METERS_PER_SEC_MULTIPLIER,
    (comp: CompAttributes, id: AttributeId) => {
        comp.parent.attack.updateWeaponModifiers();
    }
);
registerAttributeUpdateFunc(
    AttributeId.WEAPON_PROJECTILE_RANGE_METERS_MULTIPLIER,
    (comp: CompAttributes, id: AttributeId) => {
        comp.parent.attack.updateWeaponModifiers();
    }
);
registerAttributeUpdateFunc(
    AttributeId.WEAPON_SPLASH_RADIUS_MULTIPLIER,
    (comp: CompAttributes, id: AttributeId) => {
        comp.parent.attack.updateWeaponModifiers();
    }
);
