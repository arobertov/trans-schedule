import { LocaleType } from '@univerjs/core';
import SheetsUIBgBG from './bg-BG/sheets-ui';
import UIBgBG from './bg-BG/ui';
import DesignBgBG from './bg-BG/design';

/**
 * Структурираме преводите по модули за Univer.
 */
export const BulgarianLanguage = {
    [LocaleType.BG_BG]: {
        ui: UIBgBG,
        sheetsUI: SheetsUIBgBG,
        design: DesignBgBG.design,
    },
};