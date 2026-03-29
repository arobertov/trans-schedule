/**
 * Constants, style templates, and types for UniverScheduleGrid.
 */

// --------------- Style templates (Univer cell styling) ---------------

export const SCHEDULE_TEMPLATE = {
    header: {
        bg: { rgb: '#f0f0f0' },
        ht: 2, 
        vt: 2, 
        tb: 3,
        ff: 'Sofia Sans',
        bd: { 
            t: { style: 1, color: { rgb: '#ccc' } }, 
            b: { style: 1, color: { rgb: '#ccc' } }, 
            l: { style: 1, color: { rgb: '#ccc' } }, 
            r: { style: 1, color: { rgb: '#ccc' } } 
        },
        fw: 1, 
    },
    summaryHeader: {
        bg: { rgb: '#f0f0f0' },
        ht: 2,
        vt: 2,
        tb: 3,
        fs: 10,
        ff: 'Sofia Sans',
        fw: 1,
        bd: {
            t: { style: 1, color: { rgb: '#ccc' } },
            b: { style: 1, color: { rgb: '#ccc' } },
            l: { style: 1, color: { rgb: '#ccc' } },
            r: { style: 1, color: { rgb: '#ccc' } }
        }
    },
    employeeName: {
        vt: 2,
        fw: 1,
        ff: 'Sofia Sans',
        bd: {
            b: { style: 1, color: { rgb: '#e0e0e0' } },
            r: { style: 1, color: { rgb: '#e0e0e0' } }
        }
    },
    description: {
         vt: 2,
         fs: 10,
         ff: 'Sofia Sans',
         bd: {
             b: { style: 1, color: { rgb: '#e0e0e0' } },
             r: { style: 1, color: { rgb: '#e0e0e0' } }
         },
         cl: { rgb: '#0a0a0a' }
    },
    matrixCell: {
        ht: 2,
        vt: 2,
        fs: 9,
        ff: 'Sofia Sans',
        bd: {
            b: { style: 1, color: { rgb: '#f0f0f0' } },
            r: { style: 1, color: { rgb: '#f0f0f0' } },
            l: { style: 1, color: { rgb: '#f0f0f0' } }
        },
        cl: { rgb: '#888' }
    },
    normalCell: {
        ht: 2,
        vt: 2,
        ff: 'Sofia Sans',
        bd: {
            b: { style: 1, color: { rgb: '#f0f0f0' } },
            r: { style: 1, color: { rgb: '#f0f0f0' } }
        }
    },
    weekendCell: {
        ht: 2,
        vt: 2,
        bg: { rgb: '#a7a7a7' },
        ff: 'Sofia Sans',
        bd: {
            b: { style: 1, color: { rgb: '#f0f0f0' } },
            r: { style: 1, color: { rgb: '#f0f0f0' } }
        }
    },
    leftTableHeader: {
        bg: { rgb: '#EEECE1' },
        ht: 2, 
        vt: 2, 
        ff: 'Sofia Sans',
        bd: { 
            t: { style: 1, color: { rgb: '#000' } }, 
            b: { style: 1, color: { rgb: '#000' } }, 
            l: { style: 1, color: { rgb: '#000' } }, 
            r: { style: 1, color: { rgb: '#000' } } 
        },
        fw: 1,
        tb: 3,
    },
    countCellPink: {
        bg: { rgb: '#ffdbcc' },
        ht: 2, vt: 2, ff: 'Sofia Sans',
        bd: { b: { style: 1, color: { rgb: '#000' } }, r: { style: 1, color: { rgb: '#000' } } }
    },
    countCellGreen: {
        bg: { rgb: '#09ec09' },
        ht: 2, vt: 2, ff: 'Sofia Sans',
        bd: { b: { style: 1, color: { rgb: '#000' } }, r: { style: 1, color: { rgb: '#000' } } }
    },
    countCellRed: {
        bg: { rgb: '#aa0a0a' },
        ht: 2, vt: 2, ff: 'Sofia Sans',
        bd: { b: { style: 1, color: { rgb: '#000' } }, r: { style: 1, color: { rgb: '#000' } } }
    },
    matrixInputCell: {
         ht: 2, vt: 2, ff: 'Sofia Sans',
         bd: { b: { style: 1, color: { rgb: '#000' } }, r: { style: 1, color: { rgb: '#000' } } }
    },
    periodInputSingle: {
        bg: { rgb: '#E8F5E9' },
        ht: 2, vt: 2, ff: 'Sofia Sans',
        bd: { b: { style: 1, color: { rgb: '#000' } }, r: { style: 1, color: { rgb: '#000' } } }
    },
    periodInputDuplicate: {
        bg: { rgb: '#FFEBEE' },
        ht: 2, vt: 2, ff: 'Sofia Sans',
        bd: { b: { style: 1, color: { rgb: '#000' } }, r: { style: 1, color: { rgb: '#000' } } }
    },
    title: {
        fs: 18,
        fw: 1,
        ff: 'Sofia Sans',
        ht: 2,
        vt: 2,
    },
    subTitle: {
        fs: 11,
        ff: 'Sofia Sans',
        ht: 3,
        vt: 2,
        cl: { rgb: '#000' }
    },
    legend: {
        fs: 10,
        ff: 'Sofia Sans',
        ht: 1,
        vt: 2,
        cl: { rgb: '#666' }
    },
    footerLabel: {
         fs: 11,
         ff: 'Sofia Sans',
         vt: 2,
         ht: 1,
         pt: 20 
    }
};

// --------------- Grid / layout constants ---------------

export const GRID_ROW_OFFSET = 5;
export const PJM_POSITION_NAME = 'машинист пжм';
export const MATRIX_COLORS_STORAGE_KEY = 'monthlySchedule.matrixValidationColors';
export const AUTO_SAVE_DEBOUNCE_MS = 900;
export const PREVIOUS_MONTH_CACHE_TTL_MS = 60 * 1000;
export const MONTHLY_SCHEDULE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const MONTHLY_SCHEDULE_CACHE_RADIUS = 2;
export const PREVIOUS_MONTH_BALANCE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const SHIFT_SCHEDULE_MAP_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const SCHEDULE_PERF_DEBUG =
    process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_SCHEDULE_PERF_DEBUG === '1';
export const NIGHT_WORK_CORRECTION_FACTOR = 0.143;
export const MATRIX_COLOR_DEFAULTS = {
    single: '#E8F5E9',
    duplicate: '#FFEBEE',
    weekend: '#A7A7A7',
};

// --------------- Summary columns ---------------

export const SUMMARY_HEADERS = [
    'ИНДИВИДУАЛНА НОРМА',
    'НОЩЕН ТРУД',
    'КОРЕКЦИЯ 1.143',
    '+/- ТЕКУЩ МЕСЕЦ',
    '+/- МИНАЛ МЕСЕЦ',
    'ОТРАБОТЕНО ВРЕМЕ',
    'ОБЩО ЗА ПЕРИОДА',
];

export const SUMMARY_FIELD_KEYS = [
    'individual_norm',
    'night_work_total',
    'night_correction_1143',
    'current_month_balance',
    'previous_month_balance',
    'worked_total',
    'period_total',
];

export const SUMMARY_HEADER_DISPLAY: Record<string, string> = {
    'ИНДИВИДУАЛНА НОРМА': 'ИНДИВИД.\n НОРМА',
    'НОЩЕН ТРУД': 'НОЩЕН\n ТРУД',
    'КОРЕКЦИЯ 1.143': 'КОРЕКЦИЯ\n 1.143',
    '+/- ТЕКУЩ МЕСЕЦ': '+/- ТЕКУЩ\n МЕСЕЦ',
    '+/- МИНАЛ МЕСЕЦ': '+/- МИНАЛ\n МЕСЕЦ',
    'ОТРАБОТЕНО ВРЕМЕ': 'ОТРАБОТЕНО\n ВРЕМЕ',
    'ОБЩО ЗА ПЕРИОДА': 'ОБЩО ЗА\n ПЕРИОДА',
};

export const EXEMPTION_CODES = new Set(['О', 'Б', 'М', 'С', 'А', 'У', 'O', 'B', 'M', 'C', 'A', 'U']);

// --------------- Types ---------------

export type GridRange = {
    startRow: number;
    endRow: number;
    startColumn: number;
    endColumn: number;
};

export type DevPerfSnapshot = {
    initInteractiveMs: number;
    monthlyLoadSource: string;
    monthlyLoadMs: number;
    weekdayShiftSource: string;
    weekdayShiftMs: number;
    holidayShiftSource: string;
    holidayShiftMs: number;
    previousMonthSource: string;
    previousMonthMs: number;
    recalculationMs: number;
};
