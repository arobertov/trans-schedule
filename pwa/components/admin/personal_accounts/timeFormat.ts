export const formatMinutesToHHMM = (minutes: unknown): string => {
    const parsed = Number(minutes ?? 0);
    if (!Number.isFinite(parsed)) return '00:00';

    const value = Math.trunc(parsed);
    const sign = value < 0 ? '-' : '';
    const abs = Math.abs(value);
    const hh = Math.floor(abs / 60);
    const mm = abs % 60;

    return `${sign}${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};

export const formatDecimalBg = (value: unknown): string => {
    const parsed = Number(value ?? 0);
    if (!Number.isFinite(parsed)) return '0,00';
    return parsed.toFixed(2).replace('.', ',');
};

export const parseDecimal = (value: unknown): number => {
    if (typeof value === 'number' && Number.isFinite(value)) return Number(value.toFixed(2));

    const normalized = String(value ?? '').trim().replace(',', '.');
    if (!normalized) return 0;

    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) return 0;

    return Number(parsed.toFixed(2));
};
