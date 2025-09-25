import {validId} from "./ConstsIds";
import {TextureImageAssetEx} from "./AssetEx";

export const ALL_CURRENCY_IDS = [
    'GOLD',
] as const;
export type CurrencyId = typeof ALL_CURRENCY_IDS[number];

export function validCurrencyId(value: string): CurrencyId {
    return validId('ALL_CURRENCY_IDS', ALL_CURRENCY_IDS, value);
}

export type CurrencyMetadata = {
    id: CurrencyId,
    displayName: string,
    iconImg: TextureImageAssetEx,
    formatOptions: {
        stringFormat: string,
        fixedPrecision: number,
    }
}

const CURRENCY_STRING_FORMAT_TOKEN = '{amount}';

type CurrencyCatalogue = { [id in CurrencyId]: CurrencyMetadata }

export const CURRENCY_CATALOGUE: CurrencyCatalogue = {
    'GOLD': {
        id: 'GOLD',
        displayName: 'Gold',
        iconImg: TextureImageAssetEx.new('0'),
        formatOptions: {
            stringFormat: `${CURRENCY_STRING_FORMAT_TOKEN}g`,
            fixedPrecision: 0,
        }
    }
}

// Formats the currency string within CurrencyMetadata.formatOptions.
// Truncates extra amounts so that we never imply a player has more money than they actually do.
export function formatCurrencyString(id: CurrencyId, amount: number): string {
    const metadata = CURRENCY_CATALOGUE[id];

    // number.toFixed() rounds by default. To avoid this, we truncate past
    // the desired precision using Math.trunc() (which only truncates decimals).
    const pow = 10 ** metadata.formatOptions.fixedPrecision;
    const truncatedAmount = Math.trunc(amount * pow) / pow;
    const fixedPrecisionAmount = truncatedAmount.toFixed(metadata.formatOptions.fixedPrecision);

    return metadata.formatOptions.stringFormat.replace(CURRENCY_STRING_FORMAT_TOKEN, fixedPrecisionAmount);
}
