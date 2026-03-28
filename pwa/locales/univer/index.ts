import { mergeLocales } from '@univerjs/core';
import UniverDesignEnUS from '@univerjs/design/locale/en-US';
import UniverDocsUIEnUS from '@univerjs/docs-ui/locale/en-US';
import UniverSheetsFormulaUIEnUS from '@univerjs/sheets-formula-ui/locale/en-US';
import UniverSheetsUIEnUS from '@univerjs/sheets-ui/locale/en-US';
import UniverUIEnUS from '@univerjs/ui/locale/en-US';
import SheetsUIBgBG from './bg-BG/sheets-ui';
import UIBgBG from './bg-BG/ui';
import DesignBgBG from './bg-BG/design';

/**
 * Build a BG locale with EN fallback to avoid raw i18n keys when a BG key is missing.
 */
const bgMergedLocale = mergeLocales(
    UniverDesignEnUS,
    UniverDocsUIEnUS,
    UniverSheetsUIEnUS,
    UniverSheetsFormulaUIEnUS,
    UniverUIEnUS,
    DesignBgBG,
    SheetsUIBgBG,
    UIBgBG
);

export const BG_LOCALE = 'bgBG';

export const BulgarianLanguage = {
    [BG_LOCALE]: bgMergedLocale,
};

export default BulgarianLanguage;