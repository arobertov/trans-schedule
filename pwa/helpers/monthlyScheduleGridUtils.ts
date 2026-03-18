import { toPositionCacheKey, type MonthlyScheduleCacheIdentity } from './monthlyScheduleCache';

const parseTimeToMinutes = (value: any): number | null => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);

    const raw = String(value).trim();
    if (!raw) return null;

    const match = raw.match(/^([+-]?)(\d+):(\d{2})(?::(\d{2}))?$/);
    if (!match) {
        const parsed = new Date(raw);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.getHours() * 60 + parsed.getMinutes();
        }
        return null;
    }

    const sign = match[1] === '-' ? -1 : 1;
    const hours = Number(match[2]);
    const minutes = Number(match[3]);
    const seconds = match[4] ? Number(match[4]) : 0;
    if (!Number.isInteger(hours) || !Number.isInteger(minutes) || !Number.isInteger(seconds) || minutes > 59 || seconds > 59) return null;

    return sign * (hours * 60 + minutes + (seconds >= 30 ? 1 : 0));
};

const formatMinutesToHHMM = (minutes: number): string => {
    if (!Number.isFinite(minutes)) return '00:00';

    const sign = minutes < 0 ? '-' : '';
    const abs = Math.abs(Math.trunc(minutes));
    const hh = Math.floor(abs / 60);
    const mm = abs % 60;
    return `${sign}${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};

const normalizeShiftCode = (value: any) => String(value ?? '').trim().toUpperCase();

const buildShiftMapsFromDetails = (details: any[]) => {
    const workedMap: Record<string, number> = {};
    const nightMap: Record<string, number> = {};

    (details || []).forEach((detail: any) => {
        const key = normalizeShiftCode(detail?.shift_code);
        const workedMinutes = parseTimeToMinutes(detail?.worked_time);
        const nightMinutes = parseTimeToMinutes(detail?.night_work);
        if (key && workedMinutes !== null) {
            workedMap[key] = workedMinutes;
        }
        if (key && nightMinutes !== null) {
            nightMap[key] = nightMinutes;
        }
    });

    return { workedMap, nightMap };
};

const stableStringify = (input: any): string => {
    const normalize = (value: any): any => {
        if (Array.isArray(value)) return value.map(normalize);
        if (value && typeof value === 'object') {
            const keys = Object.keys(value).sort();
            const out: Record<string, any> = {};
            keys.forEach((k) => {
                out[k] = normalize(value[k]);
            });
            return out;
        }
        return value;
    };

    try {
        return JSON.stringify(normalize(input));
    } catch {
        return '';
    }
};

const cloneDeepSafe = <T,>(value: T): T => {
    try {
        if (typeof structuredClone === 'function') {
            return structuredClone(value);
        }
    } catch {}

    try {
        return JSON.parse(JSON.stringify(value));
    } catch {
        return value;
    }
};

const getRecordPositionApiValue = (position: any): string => {
    if (position === null || position === undefined) return '';

    if (typeof position === 'string' || typeof position === 'number') {
        return String(position).trim();
    }

    if (typeof position === 'object') {
        if (position['@id']) return String(position['@id']).trim();
        if (position.id !== undefined && position.id !== null) return String(position.id).trim();
    }

    return '';
};

const getMonthlyIdentityFromRecord = (record: any): MonthlyScheduleCacheIdentity | null => {
    const year = Number(record?.year);
    const month = Number(record?.month);
    const positionKey = toPositionCacheKey(record?.position);

    if (!Number.isFinite(year) || !Number.isFinite(month) || !positionKey) {
        return null;
    }

    return {
        year: Math.trunc(year),
        month: Math.trunc(month),
        positionKey,
    };
};

const toBalanceByEmployeeMap = (rows: any[]): Record<string, number> => {
    const nextMap: Record<string, number> = {};

    (rows || []).forEach((row: any) => {
        const employeeId = String(row?.employee_id ?? '').trim();
        if (!employeeId) return;

        const fromMinutes = row?.period_total_minutes;
        if (typeof fromMinutes === 'number' && Number.isFinite(fromMinutes)) {
            nextMap[employeeId] = Math.trunc(fromMinutes);
            return;
        }

        const fromText = row?.period_total || row?.summary_period_total || '';
        const parsed = parseTimeToMinutes(fromText);
        if (parsed !== null) {
            nextMap[employeeId] = parsed;
        }
    });

    return nextMap;
};

export {
    buildShiftMapsFromDetails,
    cloneDeepSafe,
    formatMinutesToHHMM,
    getMonthlyIdentityFromRecord,
    getRecordPositionApiValue,
    normalizeShiftCode,
    parseTimeToMinutes,
    stableStringify,
    toBalanceByEmployeeMap,
};
