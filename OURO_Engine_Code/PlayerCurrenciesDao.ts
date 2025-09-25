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

import { ALL_CURRENCY_IDS, CurrencyId, CurrencyMetadata, CURRENCY_CATALOGUE } from 'ConstsCurrencies';
import { PersistentStorage, PlayerPVarDao, PVAR_PLAYER_CURRENCIES } from 'ConstsPVar';
import { onCurrencyAmountChanged } from 'Events';
import { Component, Player } from 'horizon/core';

type Currency = {
    amount: number,
}

type CurrencyMap = { [id in CurrencyId]?: Currency };

type CurrencyData = {
    version: number,
    currencies: CurrencyMap,
}

export class PlayerCurrenciesDao extends PlayerPVarDao<CurrencyData> {
    constructor(
        player: Player,
        persistentStorage: PersistentStorage,
        horizonApiProvider: Component<any>,
    ) {
        super(PVAR_PLAYER_CURRENCIES, player, persistentStorage, horizonApiProvider);
    }

    protected default(): CurrencyData {
        const currencies: CurrencyMap = {};

        let id: CurrencyId;
        for (id in CURRENCY_CATALOGUE) {
            const metadata: CurrencyMetadata = CURRENCY_CATALOGUE[id];
            currencies[metadata.id] = {
                amount: 0,
            };
        }

        return {
            version: 0,
            currencies: currencies,
        };
    }

    canAfford(id: CurrencyId, amount: number): boolean {
        const currency = this.data.currencies[id];

        if (currency == undefined) {
            return false;
        }

        return currency.amount >= amount;
    }

    spend(idToCosts: Map<CurrencyId, number>) {
        const before = this.copyCurrentCurrencyMap();

        let success = true;
        let dataToSendEvents: [CurrencyId, Currency, number][] = [];
        idToCosts.forEach((cost, id) => {
            const currency = this.data.currencies[id];
            if (currency == undefined || currency.amount < cost) {
                success = false;
                return;
            }
            currency.amount -= cost;
            dataToSendEvents.push([id, currency, currency.amount + cost]);
        });

        return this.updateOrRollback(success, before, dataToSendEvents);
    }

    accrue(id: CurrencyId, amount: number) {
        const currency = this.data.currencies[id];

        if (currency == undefined) {
            return false;
        }

        if (amount <= 0) {
            return true;
        }

        const previousAmount = currency.amount;
        currency.amount += amount;
        this.sendOnCurrencyAmountChangedEvent(id, currency, previousAmount);
        return true;
    }

    getAmount(id: CurrencyId): number {
        const currency = this.data.currencies[id];

        if (currency == undefined) {
            return 0;
        }

        return currency.amount;
    }

    setAmounts(idToAmounts: Map<CurrencyId, number>) {
        const before = this.copyCurrentCurrencyMap();

        let success = true;
        let dataToSendEvents: [CurrencyId, Currency, number][] = [];
        idToAmounts.forEach((amount, id) => {
            const currency = this.data.currencies[id];
            // How does this even happen?
            if (currency == undefined) {
                success = false;
                return;
            }
            dataToSendEvents.push([id, currency, currency.amount]);
            currency.amount = amount;
        });

        return this.updateOrRollback(success, before, dataToSendEvents);
    }

    private copyCurrentCurrencyMap() {
        const before: CurrencyMap = {};
        ALL_CURRENCY_IDS.forEach(currencyId => {
            const currency = this.data.currencies[currencyId];
            if (currency != undefined) {
                before[currencyId] = {amount: currency.amount};
            }
        });
        return before;
    }

    private updateOrRollback(success: boolean, before: CurrencyMap, dataToSendEvents: [CurrencyId, Currency, number][]) {
        if (!success) {
            this.data.currencies = before;
            return false;
        }

        dataToSendEvents.forEach((data) => {
            const [id, currency, previousAmount] = data;
            this.sendOnCurrencyAmountChangedEvent(id, currency, previousAmount);
        });
        return true;
    }

    private sendOnCurrencyAmountChangedEvent(id: CurrencyId, currency: Currency, previousAmount: number) {
        this.horizonApiProvider.sendLocalBroadcastEvent(onCurrencyAmountChanged, {
            player: this.player,
            currencyId: id,
            previousAmount: previousAmount,
            currentAmount: currency.amount,
        });
    }
}
