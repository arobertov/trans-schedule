import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import RefreshIcon from "@mui/icons-material/Refresh";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import SettingsIcon from "@mui/icons-material/Settings";
import { useGetList, useGetOne, useNotify } from "react-admin";
import "@univerjs/design/lib/index.css";
import "@univerjs/ui/lib/index.css";
import "@univerjs/sheets-ui/lib/index.css";
import "@univerjs/docs-ui/lib/index.css";
import "@univerjs/sheets-formula-ui/lib/index.css";
import {
    ICommandService,
    LogLevel,
    Univer,
    UniverInstanceType,
} from "@univerjs/core";
// FUniver is bundled inside @univerjs/core at version 0.15.x
import { FUniver } from "@univerjs/core/facade";
import { defaultTheme } from "@univerjs/design";
import { UniverDocsPlugin } from "@univerjs/docs";
import { UniverDocsUIPlugin } from "@univerjs/docs-ui";
import { UniverFormulaEnginePlugin } from "@univerjs/engine-formula";
import { UniverRenderEnginePlugin } from "@univerjs/engine-render";
import { UniverSheetsPlugin } from "@univerjs/sheets";
import { UniverSheetsFormulaPlugin } from "@univerjs/sheets-formula";
import { UniverSheetsFormulaUIPlugin } from "@univerjs/sheets-formula-ui";
import { UniverSheetsUIPlugin } from "@univerjs/sheets-ui";
import { UniverUIPlugin } from "@univerjs/ui";
import api from "../../../jwt-frontend-auth/src/api/apiClient";
import { BG_LOCALE, BulgarianLanguage } from "../../../locales/univer/index";
import { sortShiftRoutes, calculateShiftAutoValues, DEFAULT_AUTO_VALUES, isValidTimeString } from "../../../helpers/shiftCalculations";

type ShiftScheduleRecord = {
    id?: number | string;
    "@id"?: string;
    name?: string;
    description?: string;
    status?: string | null;
    workbook_snapshot?: {
        workbook: Record<string, any>;
        rowMeta: SheetRowMeta[];
    } | null;
};

type ShiftRoute = {
    route?: string | null;
    pickup_location?: string | null;
    pickup_route_number?: string | null;
    in_schedule?: string | null;
    from_schedule?: string | null;
    dropoff_location?: string | null;
    dropoff_route_number?: string | null;
    route_kilometers?: number | null;
    route_end?: string | null;
    worked_time?: string | null;
    zero_time?: string | null;
    night_work?: string | null;
};

type ShiftDetail = {
    id?: number | string;
    shift_code?: string | null;
    shift_schedule?: unknown;
    at_doctor?: unknown;
    at_duty_officer?: unknown;
    shift_end?: unknown;
    worked_time?: unknown;
    kilometers?: number | null;
    zero_time?: unknown;
    night_work?: unknown;
    routes?: ShiftRoute[];
};

type SheetRowMeta = {
    detailId: number | string;
    rowIndex: number;
    isPrimaryRow: boolean;
    routeIndex: number | null;
    acceptsRouteData: boolean;
};

type SaveDetailSnapshot = {
    id: number | string;
    shift_code: string | null;
    at_doctor: string | null;
    at_duty_officer: string | null;
    shift_end: string | null;
    worked_time: string | null;
    night_work: string | null;
    kilometers: number;
    zero_time: string | null;
    routes: ShiftRoute[];
};

type SaveSnapshot = {
    schedule: {
        name: string;
        description: string;
    };
    details: SaveDetailSnapshot[];
};

const TITLE_ROW = 0;
const DESCRIPTION_ROW = 1;
const NAME_ROW = 2;
const SPACER_ROW = 3;
const HEADER_ROW = 4;
const DATA_ROW_START = 5;
const AUTOSAVE_DEBOUNCE_MS = 1200;
const BORDER_THIN = 1;
const BORDER_DOUBLE = 7;
const BORDER_MEDIUM = 8;
const OUTER_BORDER_RENDER_STYLE = BORDER_MEDIUM;

const createBorderSide = (renderStyle: number, exportStyle = renderStyle) => ({
    s: renderStyle,
    exportS: exportStyle,
    cl: { rgb: "#000000" },
});

const COLUMN_DEFINITIONS = [
    { label: "№", minWidth: 44, maxWidth: 56 },
    { label: "Смяна", minWidth: 78, maxWidth: 110 },
    { label: "При\n лекар", minWidth: 78, maxWidth: 100 },
    { label: "При\n деж.", minWidth: 78, maxWidth: 100 },
    { label: "Маршрут", minWidth: 70, maxWidth: 120 },
    { label: "Място", minWidth: 84, maxWidth: 120 },
    { label: "Път\n№", minWidth: 68, maxWidth: 96 },
    { label: "В\n график", minWidth: 84, maxWidth: 100 },
    { label: "От\n график", minWidth: 84, maxWidth: 100 },
    { label: "Място", minWidth: 84, maxWidth: 120 },
    { label: "Път\n№", minWidth: 68, maxWidth: 96 },
    { label: "Край", minWidth: 78, maxWidth: 96 },
    { label: "Раб.\nвр.", minWidth: 82, maxWidth: 100 },
    { label: "Км.", minWidth: 74, maxWidth: 100 },
    { label: "Нул.\n време", minWidth: 70, maxWidth: 130 },
    { label: "Н.\n труд", minWidth: 70, maxWidth: 130 },
] as const;

const COLUMNS = COLUMN_DEFINITIONS.map((column) => column.label);

const cloneCellStyle = (style: any) => ({
    ...style,
    bd: {
        ...(style?.bd || {}),
    },
});

const applyOuterBorder = (
    cellData: Record<number, Record<number, { v: string; s?: any }>>,
    startRow: number,
    endRow: number,
    startColumn: number,
    endColumn: number,
    borderStyle: number
) => {
    for (let row = startRow; row <= endRow; row++) {
        for (let column = startColumn; column <= endColumn; column++) {
            const cell = cellData[row]?.[column];
            if (!cell) {
                continue;
            }

            const nextStyle = cloneCellStyle(cell.s || {});

            if (row === startRow) {
                nextStyle.bd.t = createBorderSide(borderStyle, BORDER_DOUBLE);
            }

            if (row === endRow) {
                nextStyle.bd.b = createBorderSide(borderStyle, BORDER_DOUBLE);
            }

            if (column === startColumn) {
                nextStyle.bd.l = createBorderSide(borderStyle, BORDER_DOUBLE);
            }

            if (column === endColumn) {
                nextStyle.bd.r = createBorderSide(borderStyle, BORDER_DOUBLE);
            }

            cell.s = nextStyle;
        }
    }
};

const reinforceMergedGroupBorders = (
    cellData: Record<number, Record<number, { v: string; s?: any }>>,
    startRow: number,
    endRow: number,
    mergedColumns: number[]
) => {
    const anchorRow = cellData[startRow];
    if (!anchorRow) {
        return;
    }

    mergedColumns.forEach((column) => {
        const anchorCell = anchorRow[column];
        if (!anchorCell) {
            return;
        }

        const nextStyle = cloneCellStyle(anchorCell.s || {});
        nextStyle.bd.t = createBorderSide(OUTER_BORDER_RENDER_STYLE, BORDER_DOUBLE);
        nextStyle.bd.b = createBorderSide(OUTER_BORDER_RENDER_STYLE, BORDER_DOUBLE);

        if (column === 0) {
            nextStyle.bd.l = createBorderSide(OUTER_BORDER_RENDER_STYLE, BORDER_DOUBLE);
        }

        anchorCell.s = nextStyle;

        const lastCell = cellData[endRow]?.[column];
        if (!lastCell) {
            return;
        }

        const lastStyle = cloneCellStyle(lastCell.s || {});
        lastStyle.bd.b = createBorderSide(OUTER_BORDER_RENDER_STYLE, BORDER_DOUBLE);
        if (column === 0) {
            lastStyle.bd.l = createBorderSide(OUTER_BORDER_RENDER_STYLE, BORDER_DOUBLE);
        }
        lastCell.s = lastStyle;
    });
};

const STYLES = {
    title: {
        fs: 16,
        fw: 1,
        ff: "Sofia Sans",
        ht: 2,
        vt: 2,
    },
    subtitle: {
        fs: 13,
        fw: 1,
        ul: 1,
        ff: "Sofia Sans",
        ht: 2,
        vt: 2,
    },
    name: {
        fs: 18,
        fw: 1,
        ff: "Sofia Sans",
        ht: 2,
        vt: 2,
    },
    header: {
        bg: { rgb: "#f2f2f2" },
        fw: 1,
        fs: 11,
        ff: "Sofia Sans",
        ht: 2,
        vt: 2,
        tb: 2,
        bd: {
            t: { s: BORDER_THIN, cl: { rgb: "#000000" } },
            b: { s: BORDER_THIN, cl: { rgb: "#000000" } },
            l: { s: BORDER_THIN, cl: { rgb: "#000000" } },
            r: { s: BORDER_THIN, cl: { rgb: "#000000" } },
        },
    },
    primaryCell: {
        ff: "Sofia Sans",
        ht: 2,
        vt: 2,
        bd: {
            t: { s: BORDER_THIN, cl: { rgb: "#000000" } },
            b: { s: BORDER_THIN, cl: { rgb: "#000000" } },
            l: { s: BORDER_THIN, cl: { rgb: "#000000" } },
            r: { s: BORDER_THIN, cl: { rgb: "#000000" } },
        },
    },
    primaryMergedCell: {
        ff: "Sofia Sans",
        ht: 2,
        vt: 2,
        fw: 1,
        bd: {
            t: { s: BORDER_THIN, cl: { rgb: "#000000" } },
            b: { s: BORDER_THIN, cl: { rgb: "#000000" } },
            l: { s: BORDER_THIN, cl: { rgb: "#000000" } },
            r: { s: BORDER_THIN, cl: { rgb: "#000000" } },
        },
    },
    secondaryCell: {
        ff: "Sofia Sans",
        ht: 2,
        vt: 2,
        bd: {
            t: { s: BORDER_THIN, cl: { rgb: "#000000" } },
            b: { s: BORDER_THIN, cl: { rgb: "#000000" } },
            l: { s: BORDER_THIN, cl: { rgb: "#000000" } },
            r: { s: BORDER_THIN, cl: { rgb: "#000000" } },
        },
    },
    primaryKilometers: {
        ff: "Sofia Sans",
        fw: 1,
        bg: { rgb: "#eeeeee" },
        ht: 2,
        vt: 2,
        bd: {
            t: { s: BORDER_THIN, cl: { rgb: "#000000" } },
            b: { s: BORDER_THIN, cl: { rgb: "#000000" } },
            l: { s: BORDER_THIN, cl: { rgb: "#000000" } },
            r: { s: BORDER_THIN, cl: { rgb: "#000000" } },
        },
    },
    secondaryKilometers: {
        ff: "Sofia Sans",
        it: 1,
        cl: { rgb: "#666666" },
        ht: 2,
        vt: 2,
        bd: {
            t: { s: BORDER_THIN, cl: { rgb: "#000000" } },
            b: { s: BORDER_THIN, cl: { rgb: "#000000" } },
            l: { s: BORDER_THIN, cl: { rgb: "#000000" } },
            r: { s: BORDER_THIN, cl: { rgb: "#000000" } },
        },
    },
};

const formatTimeValue = (value: unknown): string => {
    if (!value) {
        return "";
    }

    if (typeof value === "number") {
        // If Univer/Excel represents time as a fraction of a day (e.g. 0.15277777 for 03:40)
        let totalMinutes = Math.round(value * 24 * 60);
        // Cover next-day or offset wrap cases
        totalMinutes = ((totalMinutes % 1440) + 1440) % 1440;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }

    if (typeof value === "string") {
        const trimmed = value.trim();
        if (/^\d{2}:\d{2}$/.test(trimmed)) {
            return trimmed;
        }

        const parsedNum = Number(trimmed);
        if (!Number.isNaN(parsedNum) && trimmed !== "") {
            let totalMinutes = Math.round(parsedNum * 24 * 60);
            totalMinutes = ((totalMinutes % 1440) + 1440) % 1440;
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
        }

        const parsed = new Date(trimmed);
        if (!Number.isNaN(parsed.getTime())) {
            const hours = String(parsed.getHours()).padStart(2, "0");
            const minutes = String(parsed.getMinutes()).padStart(2, "0");
            return `${hours}:${minutes}`;
        }

        return trimmed;
    }

    return String(value);
};

const formatKilometers = (value: unknown): string => {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
        return "";
    }

    return value.toLocaleString("bg-BG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const formatHeaderValue = (value: unknown): string => {
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed.length > 0) {
            return trimmed.toLocaleUpperCase("bg-BG");
        }
    }

    return "-";
};

const formatPlainValue = (value: unknown): string => {
    if (value === null || value === undefined) {
        return "";
    }

    if (typeof value === "string") {
        return value.trim();
    }

    return String(value);
};

const normalizeText = (value: unknown): string | null => {
    const formatted = formatPlainValue(value);
    return formatted === "" ? null : formatted;
};

const normalizeTime = (value: unknown): string | null => {
    const formatted = formatTimeValue(value);
    return formatted === "" ? null : formatted;
};

const normalizeNumber = (value: unknown, fallback = 0): number => {
    if (typeof value === "number") {
        return Number.isFinite(value) ? Math.round(value * 100) / 100 : fallback;
    }

    if (typeof value !== "string") {
        return fallback;
    }

    const trimmed = value.trim().replace(",", ".");
    if (!trimmed) {
        return fallback;
    }

    const parsed = Number.parseFloat(trimmed);
    return Number.isNaN(parsed) ? fallback : Math.round(parsed * 100) / 100;
};

const normalizeOptionalNumber = (value: unknown): number | null => {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value === "number") {
        return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
    }

    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim().replace(",", ".");
    if (!trimmed) {
        return null;
    }

    const parsed = Number.parseFloat(trimmed);
    return Number.isNaN(parsed) ? null : Math.round(parsed * 100) / 100;
};

const parseZeroTimeToMinutes = (value: unknown): number | null | undefined => {
    if (value === undefined) {
        return undefined;
    }

    if (value === null || value === "") {
        return null;
    }

    if (typeof value === "number") {
        return Number.isFinite(value) ? Math.trunc(value) : undefined;
    }

    if (typeof value !== "string") {
        return undefined;
    }

    const trimmed = value.trim();
    if (trimmed === "" || trimmed === "0:00" || trimmed === "-0:00") {
        return 0;
    }

    const match = trimmed.match(/^(-?)(\d+):(\d{2})$/);
    if (!match) {
        return undefined;
    }

    const sign = match[1] === "-" ? -1 : 1;
    const hours = Number(match[2]);
    const minutes = Number(match[3]);

    if (!Number.isInteger(hours) || !Number.isInteger(minutes) || minutes > 59) {
        return undefined;
    }

    return sign * (hours * 60 + minutes);
};

const normalizeRoute = (route?: ShiftRoute | null): ShiftRoute => ({
    route: normalizeText(route?.route),
    pickup_location: normalizeText(route?.pickup_location),
    pickup_route_number: normalizeText(route?.pickup_route_number),
    in_schedule: normalizeTime(route?.in_schedule),
    from_schedule: normalizeTime(route?.from_schedule),
    dropoff_location: normalizeText(route?.dropoff_location),
    dropoff_route_number: normalizeText(route?.dropoff_route_number),
    route_kilometers: normalizeOptionalNumber(route?.route_kilometers),
    route_end: normalizeTime(route?.route_end),
    worked_time: normalizeTime(route?.worked_time),
    zero_time: normalizeText(route?.zero_time),
    night_work: normalizeTime(route?.night_work),
});

const hasMeaningfulRouteData = (route?: ShiftRoute | null) => {
    if (!route) {
        return false;
    }

    return Object.values(route).some((value) => value !== null && value !== "");
};

const createEmptyRoute = (): ShiftRoute => ({
    route: null,
    pickup_location: null,
    pickup_route_number: null,
    in_schedule: null,
    from_schedule: null,
    dropoff_location: null,
    dropoff_route_number: null,
    route_kilometers: null,
    route_end: null,
    worked_time: null,
    zero_time: null,
    night_work: null,
});

const buildSaveDetailSnapshot = (detail: ShiftDetail): SaveDetailSnapshot => ({
    id: detail.id as number | string,
    shift_code: normalizeText(detail.shift_code),
    at_doctor: normalizeTime(detail.at_doctor),
    at_duty_officer: normalizeTime(detail.at_duty_officer),
    shift_end: normalizeTime(detail.shift_end),
    worked_time: normalizeTime(detail.worked_time),
    night_work: normalizeTime(detail.night_work),
    kilometers: normalizeNumber(detail.kilometers, 0),
    zero_time: normalizeText(detail.zero_time),
    routes: (Array.isArray(detail.routes) ? detail.routes : [])
        .map((route) => normalizeRoute(route)),
});

const clampWidth = (value: number, minWidth: number, maxWidth: number) => {
    return Math.max(minWidth, Math.min(maxWidth, value));
};

const estimateColumnWidths = (shifts: ShiftDetail[]) => {
    const contentLengths = COLUMN_DEFINITIONS.map((column) =>
        column.label.split("\n").reduce((maxLength, part) => Math.max(maxLength, part.length), 0)
    );

    shifts.forEach((shift, shiftIndex) => {
        const routes = Array.isArray(shift.routes) ? shift.routes : [];
        const routeRows = routes.length > 0 ? routes : [null];

        const primaryValues = [
            String(shiftIndex + 1),
            formatPlainValue(shift.shift_code),
            formatTimeValue(shift.at_doctor),
            formatTimeValue(shift.at_duty_officer),
            routeRows[0] ? formatPlainValue(routeRows[0]?.route) : "",
            routeRows[0] ? formatPlainValue(routeRows[0]?.pickup_location) : "",
            routeRows[0] ? formatPlainValue(routeRows[0]?.pickup_route_number) : "",
            routeRows[0] ? formatTimeValue(routeRows[0]?.in_schedule) : "",
            routeRows[0] ? formatTimeValue(routeRows[0]?.from_schedule) : "",
            routeRows[0] ? formatPlainValue(routeRows[0]?.dropoff_location) : "",
            routeRows[0] ? formatPlainValue(routeRows[0]?.dropoff_route_number) : "",
            formatTimeValue(shift.shift_end),
            formatTimeValue(shift.worked_time),
            formatKilometers(shift.kilometers),
            formatPlainValue(shift.zero_time),
            formatTimeValue(shift.night_work),
        ];

        primaryValues.forEach((value, index) => {
            contentLengths[index] = Math.max(contentLengths[index], value.length);
        });

        routes.forEach((route) => {
            const routeValues = [
                "",
                "",
                "",
                "",
                formatPlainValue(route?.route),
                formatPlainValue(route?.pickup_location),
                formatPlainValue(route?.pickup_route_number),
                formatTimeValue(route?.in_schedule),
                formatTimeValue(route?.from_schedule),
                formatPlainValue(route?.dropoff_location),
                formatPlainValue(route?.dropoff_route_number),
                formatTimeValue(route?.route_end),
                formatTimeValue(route?.worked_time),
                formatKilometers(route?.route_kilometers),
                formatPlainValue(route?.zero_time),
                formatTimeValue(route?.night_work),
            ];

            routeValues.forEach((value, index) => {
                contentLengths[index] = Math.max(contentLengths[index], value.length);
            });
        });
    });

    return COLUMN_DEFINITIONS.reduce<Record<number, { w: number }>>((acc, column, index) => {
        const width = clampWidth(contentLengths[index] * 9 + 18, column.minWidth, column.maxWidth);
        acc[index] = { w: width };
        return acc;
    }, {});
};

const getShiftCodeParts = (code: string | null | undefined) => {
    if (!code) return { typeRank: 4, num: 9999, raw: "" };
    const norm = code.trim().toUpperCase();

    let typeRank = 4;

    // Match suffix character - e.g. "-С", "-Д", "-Н" (Cyrillic & Latin)
    const suffixMatch = norm.replace(/\s+/g, "").match(/-([СДНCSDN])/i) || norm.match(/([СДНCSDN])\s*(?:\?|\(\d\)|\/)*$/i);
    if (suffixMatch) {
        const char = suffixMatch[1];
        if (char === "С" || char === "C" || char === "S") {
            typeRank = 1;
        } else if (char === "Д" || char === "D") {
            typeRank = 2;
        } else if (char === "Н" || char === "N" || char === "H") {
            typeRank = 3;
        }
    } else {
        if (norm.includes("С") || norm.includes("S")) {
            typeRank = 1;
        } else if (norm.includes("Д") || norm.includes("D")) {
            typeRank = 2;
        } else if (norm.includes("Н") || norm.includes("N")) {
            typeRank = 3;
        }
    }

    const numMatch = norm.match(/\d+/);
    const num = numMatch ? parseInt(numMatch[0], 10) : 0;

    return { typeRank, num, raw: norm };
};

const compareShifts = (a: ShiftDetail, b: ShiftDetail) => {
    const keyA = getShiftCodeParts(a.shift_code);
    const keyB = getShiftCodeParts(b.shift_code);

    if (keyA.typeRank !== keyB.typeRank) {
        return keyA.typeRank - keyB.typeRank;
    }
    if (keyA.num !== keyB.num) {
        return keyA.num - keyB.num;
    }
    return keyA.raw.localeCompare(keyB.raw, "bg-BG");
};

const getShiftTypeCode = (code: string | null | undefined): "С" | "Д" | "Н" => {
    const normalized = code?.trim().toUpperCase() || "";

    if (normalized.endsWith("-С") || normalized.endsWith("-C") || normalized.endsWith("-S")) {
        return "С";
    }

    if (normalized.endsWith("-Н") || normalized.endsWith("-N") || normalized.endsWith("-H")) {
        return "Н";
    }

    return "Д";
};

const buildNextShiftCode = (details: ShiftDetail[], preferredType: "С" | "Д" | "Н") => {
    const nextNumber = details.reduce((maxNumber, detail) => {
        const { num } = getShiftCodeParts(detail.shift_code);
        return Math.max(maxNumber, num);
    }, 0) + 1;

    return `СМ${nextNumber}-${preferredType}`;
};

const buildWorkbookConfig = (schedule: { name: string; description: string }, shifts: ShiftDetail[]) => {
    const sortedShifts = [...shifts].sort(compareShifts);
    const cellData: Record<number, Record<number, { v: string; s?: any }>> = {};
    const mergeData: Array<{ startRow: number; endRow: number; startColumn: number; endColumn: number }> = [];
    const rowMeta: SheetRowMeta[] = [];
    const columnData = estimateColumnWidths(sortedShifts);

    cellData[TITLE_ROW] = {
        0: { v: "ГРАФИК НА СМЕНИТЕ", s: STYLES.title },
    };
    mergeData.push({ startRow: TITLE_ROW, endRow: TITLE_ROW, startColumn: 0, endColumn: COLUMNS.length - 1 });

    cellData[DESCRIPTION_ROW] = {
        0: { v: formatHeaderValue(schedule.description), s: STYLES.subtitle },
    };
    mergeData.push({ startRow: DESCRIPTION_ROW, endRow: DESCRIPTION_ROW, startColumn: 0, endColumn: COLUMNS.length - 1 });

    cellData[NAME_ROW] = {
        0: { v: formatHeaderValue(schedule.name), s: STYLES.name },
    };
    mergeData.push({ startRow: NAME_ROW, endRow: NAME_ROW, startColumn: 0, endColumn: COLUMNS.length - 1 });

    cellData[SPACER_ROW] = {};
    cellData[HEADER_ROW] = {};
    COLUMNS.forEach((label, columnIndex) => {
        cellData[HEADER_ROW][columnIndex] = { v: label, s: STYLES.header };
    });
    applyOuterBorder(cellData, HEADER_ROW, HEADER_ROW, 0, COLUMNS.length - 1, OUTER_BORDER_RENDER_STYLE);

    let currentSheetRow = DATA_ROW_START;

    sortedShifts.forEach((shift, shiftIndex) => {
        const groupStartRow = currentSheetRow;
        const routes = sortShiftRoutes(Array.isArray(shift.routes) ? shift.routes : []);
        const hasMultipleRoutes = routes.length > 1;
        const renderRowCount = hasMultipleRoutes ? routes.length + 1 : 1;

        for (let groupRow = 0; groupRow < renderRowCount; groupRow++) {
            const isPrimaryRow = groupRow === 0;
            const routeIndex = hasMultipleRoutes ? (groupRow === 0 ? null : groupRow - 1) : 0;
            const acceptsRouteData = !hasMultipleRoutes || routeIndex !== null;
            const currentRoute = routeIndex !== null ? routes[routeIndex] : null;
            const baseStyle = isPrimaryRow ? STYLES.primaryCell : STYLES.secondaryCell;

            cellData[currentSheetRow] = {
                0: { v: isPrimaryRow ? String(shiftIndex + 1) : "", s: isPrimaryRow ? STYLES.primaryMergedCell : STYLES.secondaryCell },
                1: { v: isPrimaryRow ? formatPlainValue(shift.shift_code) : "", s: isPrimaryRow ? STYLES.primaryMergedCell : STYLES.secondaryCell },
                2: { v: isPrimaryRow ? formatTimeValue(shift.at_doctor) : "", s: baseStyle },
                3: { v: isPrimaryRow ? formatTimeValue(shift.at_duty_officer) : "", s: baseStyle },
                4: { v: acceptsRouteData ? formatPlainValue(currentRoute?.route) : "", s: baseStyle },
                5: { v: acceptsRouteData ? formatPlainValue(currentRoute?.pickup_location) : "", s: baseStyle },
                6: { v: acceptsRouteData ? formatPlainValue(currentRoute?.pickup_route_number) : "", s: baseStyle },
                7: { v: acceptsRouteData ? formatTimeValue(currentRoute?.in_schedule) : "", s: baseStyle },
                8: { v: acceptsRouteData ? formatTimeValue(currentRoute?.from_schedule) : "", s: baseStyle },
                9: { v: acceptsRouteData ? formatPlainValue(currentRoute?.dropoff_location) : "", s: baseStyle },
                10: { v: acceptsRouteData ? formatPlainValue(currentRoute?.dropoff_route_number) : "", s: baseStyle },
                11: { v: isPrimaryRow ? formatTimeValue(shift.shift_end) : formatTimeValue(currentRoute?.route_end), s: baseStyle },
                12: { v: isPrimaryRow ? formatTimeValue(shift.worked_time) : formatTimeValue(currentRoute?.worked_time), s: baseStyle },
                13: { v: isPrimaryRow ? formatKilometers(shift.kilometers) : formatKilometers(currentRoute?.route_kilometers), s: isPrimaryRow ? STYLES.primaryKilometers : STYLES.secondaryKilometers },
                14: { v: isPrimaryRow ? formatPlainValue(shift.zero_time) : formatPlainValue(currentRoute?.zero_time), s: baseStyle },
                15: { v: isPrimaryRow ? formatTimeValue(shift.night_work) : formatTimeValue(currentRoute?.night_work), s: baseStyle },
            };

            rowMeta.push({
                detailId: shift.id as number | string,
                rowIndex: currentSheetRow,
                isPrimaryRow,
                routeIndex,
                acceptsRouteData,
            });

            currentSheetRow += 1;
        }

        if (renderRowCount > 1) {
            const startRow = currentSheetRow - renderRowCount;
            const endRow = currentSheetRow - 1;
            mergeData.push({ startRow, endRow, startColumn: 0, endColumn: 0 });
            mergeData.push({ startRow, endRow, startColumn: 1, endColumn: 1 });
            reinforceMergedGroupBorders(cellData, startRow, endRow, [0, 1]);
        }

        applyOuterBorder(cellData, groupStartRow, currentSheetRow - 1, 0, COLUMNS.length - 1, OUTER_BORDER_RENDER_STYLE);
    });

    return {
        workbook: {
            id: "shift-schedule-wb",
            appVersion: "3.0.0",
            sheets: {
                "shift-schedule-sheet": {
                    id: "shift-schedule-sheet",
                    name: "График на смените",
                    cellData,
                    mergeData,
                    rowCount: Math.max(currentSheetRow, HEADER_ROW + 1),
                    columnCount: COLUMNS.length,
                    freeze: { xSplit: 4, ySplit: DATA_ROW_START },
                    rowData: {
                        [TITLE_ROW]: { h: 32 },
                        [DESCRIPTION_ROW]: { h: 28 },
                        [NAME_ROW]: { h: 34 },
                        [HEADER_ROW]: { h: 42 },
                    },
                    columnData,
                },
            },
            locale: BG_LOCALE,
            styles: {},
        },
        mergeData,
        rowMeta,
    };
};

const sanitizeFileName = (value: string) => {
    return value.trim().replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ");
};

const toExcelArgb = (value?: { rgb?: string } | string | null) => {
    const rgb = typeof value === "string" ? value : value?.rgb;
    if (!rgb) {
        return undefined;
    }

    const normalized = rgb.replace("#", "").toUpperCase();
    return normalized.length === 6 ? `FF${normalized}` : normalized;
};

const toExcelBorderStyle = (style?: number) => {
    if (style === BORDER_DOUBLE) {
        return "double";
    }

    if (style === BORDER_MEDIUM) {
        return "medium";
    }

    if (style === 2) {
        return "hair";
    }

    if (style === BORDER_THIN) {
        return "thin";
    }

    if (style === 13) {
        return "thick";
    }

    return undefined;
};

const toExcelCellStyle = (style: any, value: string) => {
    const fontColor = toExcelArgb(style?.cl);
    const fillColor = toExcelArgb(style?.bg);

    return {
        font: {
            name: style?.ff || "Sofia Sans",
            size: style?.fs,
            bold: style?.fw === 1,
            italic: style?.it === 1,
            underline: style?.ul === 1,
            ...(fontColor ? { color: { argb: fontColor } } : {}),
        },
        alignment: {
            horizontal: style?.ht === 2 ? "center" : style?.ht === 3 ? "right" : "left",
            vertical: style?.vt === 2 ? "middle" : "top",
            wrapText: style?.tb === 2 || value.includes("\n"),
        },
        ...(fillColor
            ? {
                fill: {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: fillColor },
                },
            }
            : {}),
        ...(style?.bd
            ? {
                border: {
                    ...(style.bd.t
                        ? {
                            top: {
                                style: toExcelBorderStyle(style.bd.t.exportS ?? style.bd.t.s),
                                color: { argb: toExcelArgb(style.bd.t.cl) || "FF000000" },
                            },
                        }
                        : {}),
                    ...(style.bd.b
                        ? {
                            bottom: {
                                style: toExcelBorderStyle(style.bd.b.exportS ?? style.bd.b.s),
                                color: { argb: toExcelArgb(style.bd.b.cl) || "FF000000" },
                            },
                        }
                        : {}),
                    ...(style.bd.l
                        ? {
                            left: {
                                style: toExcelBorderStyle(style.bd.l.exportS ?? style.bd.l.s),
                                color: { argb: toExcelArgb(style.bd.l.cl) || "FF000000" },
                            },
                        }
                        : {}),
                    ...(style.bd.r
                        ? {
                            right: {
                                style: toExcelBorderStyle(style.bd.r.exportS ?? style.bd.r.s),
                                color: { argb: toExcelArgb(style.bd.r.cl) || "FF000000" },
                            },
                        }
                        : {}),
                },
            }
            : {}),
    };
};

const normalizeScheduleStatus = (value?: unknown): "проект" | "активен" => {
    return value === "активен" ? "активен" : "проект";
};

const normalizeResourcePath = (value: unknown, resourcePath: string): string | null => {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value === "number") {
        return `${resourcePath}/${value}`;
    }

    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }

    const withoutOrigin = (() => {
        if (/^https?:\/\//i.test(trimmed)) {
            try {
                return new URL(trimmed).pathname;
            } catch {
                return trimmed;
            }
        }

        return trimmed;
    })();

    if (withoutOrigin.startsWith(resourcePath + "/")) {
        return withoutOrigin;
    }

    if (withoutOrigin.startsWith(`.${resourcePath}/`)) {
        return withoutOrigin.slice(1);
    }

    if (withoutOrigin.startsWith("/")) {
        return withoutOrigin;
    }

    if (withoutOrigin.startsWith(resourcePath.slice(1) + "/")) {
        return `/${withoutOrigin}`;
    }

    return `${resourcePath}/${withoutOrigin}`;
};

const serializeSnapshot = (snapshot: SaveSnapshot) => JSON.stringify(snapshot);

const captureSnapshotFromSheet = (
    sheet: any,
    rowMeta: SheetRowMeta[],
    sourceDetails: ShiftDetail[],
    schedule: { name: string; description: string },
    autoSettings: any,
    fbSheet?: any
): SaveSnapshot => {
    const detailsMap = new Map<number | string, SaveDetailSnapshot>();

    sourceDetails.forEach((detail) => {
        if (detail.id === undefined || detail.id === null) {
            return;
        }

        detailsMap.set(detail.id, buildSaveDetailSnapshot(detail));
    });

    rowMeta.forEach((meta) => {
        const detail = detailsMap.get(meta.detailId);
        if (!detail) {
            return;
        }

        const getCellValue = (column: number) => sheet.getCell(meta.rowIndex, column)?.v;

        if (meta.isPrimaryRow) {
            detail.shift_code = normalizeText(getCellValue(1));
            detail.at_doctor = normalizeTime(getCellValue(2));
            detail.at_duty_officer = normalizeTime(getCellValue(3));
            detail.shift_end = normalizeTime(getCellValue(11));
            detail.worked_time = normalizeTime(getCellValue(12));
            detail.kilometers = normalizeNumber(getCellValue(13), 0);
            detail.zero_time = normalizeText(getCellValue(14));
            detail.night_work = normalizeTime(getCellValue(15));
        }

        if (meta.acceptsRouteData && meta.routeIndex !== null) {
            const nextRoute = normalizeRoute(detail.routes[meta.routeIndex]);
            nextRoute.route = normalizeText(getCellValue(4));
            nextRoute.pickup_location = normalizeText(getCellValue(5));
            nextRoute.pickup_route_number = normalizeText(getCellValue(6));
            nextRoute.in_schedule = normalizeTime(getCellValue(7));
            nextRoute.from_schedule = normalizeTime(getCellValue(8));
            nextRoute.dropoff_location = normalizeText(getCellValue(9));
            nextRoute.dropoff_route_number = normalizeText(getCellValue(10));

            if (!meta.isPrimaryRow) {
                nextRoute.route_end = normalizeTime(getCellValue(11));
                nextRoute.worked_time = normalizeTime(getCellValue(12));
                nextRoute.route_kilometers = normalizeOptionalNumber(getCellValue(13));
                nextRoute.zero_time = normalizeText(getCellValue(14));
                nextRoute.night_work = normalizeTime(getCellValue(15));
            }

            detail.routes[meta.routeIndex] = nextRoute;
        }
    });

    // Only include details that still have at least one row tracked in rowMeta
    const activeDetailIds = new Set(rowMeta.map((m) => m.detailId));

    const finalDetails = Array.from(detailsMap.values())
        .filter((detail) => activeDetailIds.has(detail.id))
        .map((detail) => {
            const normalizedRoutes = detail.routes.map((route) => normalizeRoute(route));
            const meaningfulRoutes = sortShiftRoutes(normalizedRoutes.filter(hasMeaningfulRouteData));
            const blankRoutes = normalizedRoutes.filter((route) => !hasMeaningfulRouteData(route));
            detail.routes = [...meaningfulRoutes, ...blankRoutes];

            // Recalculate auto values if there are routes
            if (meaningfulRoutes.length > 0) {
                const firstScheduledRoute = meaningfulRoutes.find((route) => isValidTimeString(route.in_schedule));
                const lastScheduledRoute = [...meaningfulRoutes].reverse().find((route) => isValidTimeString(route.from_schedule));

                if (!firstScheduledRoute || !lastScheduledRoute) {
                    return detail;
                }

                const autoVals = calculateShiftAutoValues(meaningfulRoutes, autoSettings, detail.shift_code);
                const primaryMeta = rowMeta.find((m) => m.detailId === detail.id && m.isPrimaryRow);

                if (primaryMeta) {
                    const checkAndSetCell = (col: number, calculatedValue: string) => {
                        const cell = sheet.getCell(primaryMeta.rowIndex, col);
                        const currentVal = cell?.v;
                        const hasExistingValue = currentVal !== null && currentVal !== undefined && String(currentVal).trim() !== "";
                        const formattedCurrent = hasExistingValue ? formatTimeValue(currentVal) : "";

                        if (hasExistingValue) {
                            return formattedCurrent;
                        }

                        if (fbSheet) {
                            fbSheet.getRange(primaryMeta.rowIndex, col, 1, 1)?.setValue(calculatedValue);
                        }

                        return calculatedValue;
                    };

                    detail.at_doctor = checkAndSetCell(2, autoVals.at_doctor);
                    detail.at_duty_officer = checkAndSetCell(3, autoVals.at_duty_officer);
                    detail.shift_end = checkAndSetCell(11, autoVals.shift_end);
                    detail.worked_time = checkAndSetCell(12, autoVals.worked_time);
                    detail.zero_time = checkAndSetCell(14, autoVals.zero_time);
                    detail.night_work = checkAndSetCell(15, autoVals.night_work);
                }
            }

            return detail;
        });

    return {
        schedule: {
            name: formatPlainValue(sheet.getCell(NAME_ROW, 0)?.v) || schedule.name,
            description: formatPlainValue(sheet.getCell(DESCRIPTION_ROW, 0)?.v) || schedule.description,
        },
        details: finalDetails,
    };
};

interface ShiftScheduleUniverTableProps {
    record: ShiftScheduleRecord | undefined;
}

export const ShiftScheduleUniverTable = ({ record }: ShiftScheduleUniverTableProps) => {
    const initialScheduleIri = normalizeResourcePath(record?.["@id"] ?? record?.id, "/shift_schedules");
    const notify = useNotify();
    const wrapperRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const univerRef = useRef<Univer | null>(null);
    const univerAPIRef = useRef<any>(null);
    const workbookRef = useRef<any>(null);
    const mergeDataRef = useRef<Array<{ startRow: number; endRow: number; startColumn: number; endColumn: number }>>([]);
    const rowMetaRef = useRef<SheetRowMeta[]>([]);
    const detailsRef = useRef<ShiftDetail[]>([]);
    const isHydratingRef = useRef(true);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isSavingRef = useRef(false);
    const isUpdatingCellsRef = useRef(false);
    const hasPendingSaveRef = useRef(false);
    const lastSavedSnapshotRef = useRef<string>("");
    const lastSavedWorkbookRef = useRef<string>("");
    const [renderVersion, setRenderVersion] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
    const [selectedDetailId, setSelectedDetailId] = useState<number | string | null>(null);
    const [hydratedRecord, setHydratedRecord] = useState<ShiftScheduleRecord | undefined>(record);
    const [scheduleStatus, setScheduleStatus] = useState<"проект" | "активен">(() => normalizeScheduleStatus(record?.status));
    const [isStatusChanging, setIsStatusChanging] = useState(false);

    const [autoSettingsOpen, setAutoSettingsOpen] = useState(false);
    const [autoSettings, setAutoSettings] = useState(() => {
        let settings = { ...DEFAULT_AUTO_VALUES };
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("shift_schedule_auto_settings");
            if (saved) {
                try {
                    settings = { ...settings, ...JSON.parse(saved) };
                } catch (e) {}
            }
        }
        return settings;
    });

    const handleSaveAutoSettings = (nextSettings: typeof DEFAULT_AUTO_VALUES) => {
        setAutoSettings(nextSettings);
        localStorage.setItem("shift_schedule_auto_settings", JSON.stringify(nextSettings));
    };

    const { data: fetchedScheduleRecord } = useGetOne<ShiftScheduleRecord>(
        "shift_schedules",
        { id: initialScheduleIri ?? record?.id ?? "" },
        { enabled: Boolean(initialScheduleIri ?? record?.id) }
    );

    const activeRecord = fetchedScheduleRecord ?? hydratedRecord ?? record;
    const scheduleIri = normalizeResourcePath(activeRecord?.["@id"] ?? activeRecord?.id, "/shift_schedules") ?? initialScheduleIri;
    const [scheduleInfo, setScheduleInfo] = useState({
        name: formatPlainValue(activeRecord?.name),
        description: formatPlainValue(activeRecord?.description),
    });

    const { data = [], isLoading } = useGetList("shift_schedule_details", {
        pagination: { page: 1, perPage: 200 },
        sort: { field: "id", order: "ASC" },
        filter: scheduleIri ? { shift_schedule: scheduleIri } : {},
    });

    useEffect(() => {
        setHydratedRecord(fetchedScheduleRecord ?? record);
    }, [fetchedScheduleRecord, record]);

    useEffect(() => {
        setScheduleInfo({
            name: formatPlainValue(activeRecord?.name),
            description: formatPlainValue(activeRecord?.description),
        });
    }, [activeRecord?.id, activeRecord?.name, activeRecord?.description]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setIsFullscreen(false);
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    useEffect(() => {
        setScheduleStatus(normalizeScheduleStatus(activeRecord?.status));
    }, [activeRecord?.id, activeRecord?.status]);

    useEffect(() => {
        const sortedDetails = [...((Array.isArray(data) ? data : []) as ShiftDetail[])].sort(compareShifts);
        sortedDetails.forEach((detail) => {
            if (Array.isArray(detail.routes)) {
                detail.routes = sortShiftRoutes(detail.routes);
            }
        });
        detailsRef.current = sortedDetails;
        lastSavedSnapshotRef.current = serializeSnapshot({
            schedule: scheduleInfo,
            details: sortedDetails
                .filter((detail: ShiftDetail) => detail.id !== undefined && detail.id !== null)
                .map((detail: ShiftDetail) => buildSaveDetailSnapshot(detail)),
        });
    }, [data, scheduleInfo]);

    const performAutoSave = useCallback(async () => {
        if (!activeRecord?.id || !workbookRef.current || !scheduleIri) {
            return;
        }

        const sheet = workbookRef.current.getActiveSheet();
        if (!sheet) {
            return;
        }

        const fbSheet = univerAPIRef.current?.getActiveWorkbook()?.getActiveSheet();
        isUpdatingCellsRef.current = true;
        let snapshot;
        try {
            snapshot = captureSnapshotFromSheet(sheet, rowMetaRef.current, detailsRef.current, scheduleInfo, autoSettings, fbSheet);
        } finally {
            isUpdatingCellsRef.current = false;
        }
        const serialized = serializeSnapshot(snapshot);

        const fbWorkbookDataForCheck = univerAPIRef.current?.getActiveWorkbook()?.save?.();
        const serializedWorkbook = fbWorkbookDataForCheck ? JSON.stringify(fbWorkbookDataForCheck) : "";
        const workbookChanged = serializedWorkbook !== lastSavedWorkbookRef.current;

        if (serialized === lastSavedSnapshotRef.current && !workbookChanged) {
            return;
        }

        if (isSavingRef.current) {
            hasPendingSaveRef.current = true;
            return;
        }

        isSavingRef.current = true;
        setSaveStatus("saving");

        try {
            const schedulePatchPath = scheduleIri;
            let nextWorkbookSnapshot: ShiftScheduleRecord["workbook_snapshot"] | undefined;

            // Always save the full workbook snapshot (formatting, column widths, styles) + rowMeta
            if (schedulePatchPath) {
                const fbWorkbookData = fbWorkbookDataForCheck;
                const schedulePayload: Record<string, any> = {};

                if (fbWorkbookData && workbookChanged) {
                    nextWorkbookSnapshot = {
                        workbook: fbWorkbookData,
                        rowMeta: rowMetaRef.current,
                    };
                    schedulePayload.workbook_snapshot = nextWorkbookSnapshot;
                }
                if (snapshot.schedule.name !== scheduleInfo.name) {
                    schedulePayload.name = snapshot.schedule.name || scheduleInfo.name;
                }
                if (snapshot.schedule.description !== scheduleInfo.description) {
                    schedulePayload.description = snapshot.schedule.description || null;
                }
                if (Object.keys(schedulePayload).length > 0) {
                    await api.patch(schedulePatchPath, schedulePayload);
                    setHydratedRecord((current: ShiftScheduleRecord | undefined) => ({
                        ...(current ?? activeRecord ?? {}),
                        id: current?.id ?? activeRecord?.id,
                        "@id": current?.["@id"] ?? activeRecord?.["@id"] ?? schedulePatchPath,
                        name: schedulePayload.name ?? snapshot.schedule.name,
                        description: Object.prototype.hasOwnProperty.call(schedulePayload, "description")
                            ? schedulePayload.description
                            : snapshot.schedule.description,
                        workbook_snapshot: nextWorkbookSnapshot ?? current?.workbook_snapshot ?? activeRecord?.workbook_snapshot ?? null,
                    }));
                }
            }

            const previousSnapshot = JSON.parse(lastSavedSnapshotRef.current || "{\"details\":[]}") as Partial<SaveSnapshot>;
            const previousById = new Map<number | string, SaveDetailSnapshot>();
            (previousSnapshot.details || []).forEach((detail) => {
                previousById.set(detail.id, detail);
            });

            const changedDetails = snapshot.details.filter((detail) => {
                const previous = previousById.get(detail.id);
                return JSON.stringify(detail) !== JSON.stringify(previous);
            });

            for (const detail of changedDetails) {
                const detailPatchPath = normalizeResourcePath(detail.id, "/shift_schedule_details");
                if (!detailPatchPath) {
                    continue;
                }

                // shift_code must always be a non-null string; fall back to the stored value
                const shiftCode = detail.shift_code ?? detailsRef.current.find((d: ShiftDetail) => d.id === detail.id)?.shift_code ?? "";
                if (!shiftCode) {
                    // Skip this detail — the row data is not yet valid (e.g., row index mismatch after delete)
                    continue;
                }

                // Required time fields must not be null — fall back to stored API values to avoid 400
                const stored = detailsRef.current.find((d: ShiftDetail) => d.id === detail.id);
                const atDoctor = detail.at_doctor ?? stored?.at_doctor ?? "00:00";
                const atDutyOfficer = detail.at_duty_officer ?? stored?.at_duty_officer ?? "00:00";
                const shiftEnd = detail.shift_end ?? stored?.shift_end ?? "00:00";
                const workedTime = detail.worked_time ?? stored?.worked_time ?? "00:00";

                const parsedZeroTime = parseZeroTimeToMinutes(detail.zero_time);

                await api.patch(detailPatchPath, {
                    shift_schedule: scheduleIri,
                    shift_code: shiftCode,
                    at_doctor: atDoctor,
                    at_duty_officer: atDutyOfficer,
                    shift_end: shiftEnd,
                    worked_time: workedTime,
                    night_work: detail.night_work,
                    kilometers: detail.kilometers,
                    zero_time: parsedZeroTime !== undefined ? parsedZeroTime : detail.zero_time,
                    routes: detail.routes,
                });
            }

            lastSavedSnapshotRef.current = serialized;
            lastSavedWorkbookRef.current = serializedWorkbook;
            const nextLocalDetails = snapshot.details.map((detail) => ({
                id: detail.id,
                shift_schedule: scheduleIri,
                shift_code: detail.shift_code,
                at_doctor: detail.at_doctor,
                at_duty_officer: detail.at_duty_officer,
                shift_end: detail.shift_end,
                worked_time: detail.worked_time,
                night_work: detail.night_work,
                kilometers: detail.kilometers,
                zero_time: detail.zero_time,
                routes: detail.routes,
            }));
            detailsRef.current = nextLocalDetails;
            if (snapshot.schedule.name !== scheduleInfo.name || snapshot.schedule.description !== scheduleInfo.description) {
                setScheduleInfo(snapshot.schedule);
            }
            setSaveStatus("saved");
        } catch (error: any) {
            console.error("Автоматичното запазване на графика се провали.", error);
            setSaveStatus("error");
            notify(
                error?.response?.data?.detail
                || error?.response?.data?.["hydra:description"]
                || error?.body?.detail
                || error?.body?.["hydra:description"]
                || error?.message
                || "Грешка при автоматично запазване на графика",
                { type: "error" }
            );
        } finally {
            isSavingRef.current = false;

            if (hasPendingSaveRef.current) {
                hasPendingSaveRef.current = false;
                void performAutoSave();
            }
        }
    }, [activeRecord, notify, scheduleIri, scheduleInfo, autoSettings]);

    const scheduleAutoSave = useCallback(() => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
            void performAutoSave();
        }, AUTOSAVE_DEBOUNCE_MS);
    }, [performAutoSave]);

    useEffect(() => {
        if (!containerRef.current || !activeRecord) {
            return;
        }

        const cleanup = () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = null;
            }

            if (univerRef.current) {
                univerRef.current.dispose();
                univerRef.current = null;
            }

            univerAPIRef.current = null;
            workbookRef.current = null;
            isHydratingRef.current = true;
        };

        cleanup();

        const univer = new Univer({
            theme: defaultTheme,
            locale: BG_LOCALE,
            locales: BulgarianLanguage,
            logLevel: LogLevel.ERROR,
        });

        univer.registerPlugin(UniverRenderEnginePlugin);
        univer.registerPlugin(UniverFormulaEnginePlugin);
        univer.registerPlugin(UniverUIPlugin, {
            container: containerRef.current,
            header: true,
            footer: false,
        });
        univer.registerPlugin(UniverDocsPlugin, { hasScroll: false });
        univer.registerPlugin(UniverDocsUIPlugin);
        univer.registerPlugin(UniverSheetsPlugin);
        univer.registerPlugin(UniverSheetsUIPlugin);
        univer.registerPlugin(UniverSheetsFormulaPlugin);
        univer.registerPlugin(UniverSheetsFormulaUIPlugin);

        // FUniver Facade API — supports insertRowBefore, deleteRows, save() etc.
        const univerAPI = FUniver.newAPI(univer);
        univerAPIRef.current = univerAPI;

        const injector = (univer as any).__getInjector();
        const commandService = injector.get(ICommandService);

        commandService.onCommandExecuted((command: any) => {
            if (isHydratingRef.current || isUpdatingCellsRef.current) {
                return;
            }

            const params = command?.params;

            // Handle cell editing recursively block
            if (typeof command.id === "string" && (command.id.includes("set-range-values") || command.id.includes("set-cell-value"))) {
                scheduleAutoSave();
                return;
            }

            // Keep rowMeta in sync when rows are removed (native Univer UI or via Facade API)
            if (command.id === "sheet.mutation.remove-rows") {
                const range = params?.range;
                if (range) {
                    const { startRow, endRow } = range as { startRow: number; endRow: number };
                    const count = endRow - startRow + 1;
                    rowMetaRef.current = rowMetaRef.current
                        .filter((m: SheetRowMeta) => m.rowIndex < startRow || m.rowIndex > endRow)
                        .map((m: SheetRowMeta) => m.rowIndex > endRow ? { ...m, rowIndex: m.rowIndex - count } : m);
                }
                scheduleAutoSave();
                return;
            }

            // Keep rowMeta in sync when rows are inserted (native Univer UI or via Facade API)
            if (command.id === "sheet.mutation.insert-row") {
                const range = params?.range;
                if (range) {
                    const { startRow, endRow } = range as { startRow: number; endRow: number };
                    const count = endRow - startRow + 1;
                    rowMetaRef.current = rowMetaRef.current
                        .map((m: SheetRowMeta) => m.rowIndex >= startRow ? { ...m, rowIndex: m.rowIndex + count } : m);
                }
                scheduleAutoSave();
                return;
            }

            // Track the selected row to enable "Delete shift" button
            if (typeof command.id === "string" && command.id.includes("set-selections")) {
                const selections = params?.selections;
                if (Array.isArray(selections) && selections.length > 0) {
                    const row = selections[0]?.range?.startRow;
                    if (typeof row === "number") {
                        const meta = rowMetaRef.current.find((m: SheetRowMeta) => m.rowIndex === row);
                        setSelectedDetailId(meta?.detailId ?? null);
                    } else {
                        setSelectedDetailId(null);
                    }
                }
                return;
            }
        });

        // Rebuild workbook configuration dynamically from live sorted details to ensure sorting works perfectly.
        const builtFromLiveData = buildWorkbookConfig({
            name: formatPlainValue(activeRecord?.name),
            description: formatPlainValue(activeRecord?.description),
        }, detailsRef.current);

        const workbookConfig = builtFromLiveData.workbook;
        const rowMeta = builtFromLiveData.rowMeta;
        const mergeData = builtFromLiveData.mergeData;

        univerRef.current = univer;
        mergeDataRef.current = mergeData;
        rowMetaRef.current = rowMeta;
        workbookRef.current = univer.createUnit(UniverInstanceType.UNIVER_SHEET, workbookConfig);

        window.setTimeout(() => {
            isHydratingRef.current = false;
        }, 100);

        return cleanup;
    }, [activeRecord, isLoading, renderVersion, scheduleAutoSave]);

    const handleExport = async () => {
        if (!workbookRef.current) {
            return;
        }

        const sheet = workbookRef.current.getActiveSheet();
        if (!sheet) {
            return;
        }

        const ExcelJS = await import("exceljs");
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("График", {
            views: [{ state: "frozen", xSplit: 4, ySplit: DATA_ROW_START }],
        });

        const rowCount = sheet.getRowCount();
        const columnCount = sheet.getColumnCount();
        const snapshot = sheet.getSnapshot?.() as {
            rowData?: Record<number, { h?: number }>;
            columnData?: Record<number, { w?: number }>;
        } | undefined;

        for (let row = 0; row < rowCount; row++) {
            const excelRow = worksheet.getRow(row + 1);
            const rowHeight = snapshot?.rowData?.[row]?.h;
            if (rowHeight) {
                excelRow.height = rowHeight;
            }

            for (let column = 0; column < columnCount; column++) {
                const currentCell = sheet.getCell(row, column);
                const value = currentCell?.v === undefined || currentCell?.v === null ? "" : String(currentCell.v);
                const excelCell = excelRow.getCell(column + 1);
                excelCell.value = value;

                const style = currentCell?.s;
                if (style) {
                    const excelStyle = toExcelCellStyle(style, value);
                    excelCell.font = excelStyle.font;
                    excelCell.alignment = excelStyle.alignment;
                    if (excelStyle.fill) {
                        excelCell.fill = excelStyle.fill as any;
                    }
                    if (excelStyle.border) {
                        excelCell.border = excelStyle.border as any;
                    }
                }
            }
        }

        const activeColumnData = snapshot?.columnData;
        COLUMNS.forEach((_, index) => {
            const widthPx = activeColumnData?.[index]?.w ?? COLUMN_DEFINITIONS[index].minWidth;
            worksheet.getColumn(index + 1).width = Math.max(8, Math.round(widthPx / 7));
        });

        mergeDataRef.current.forEach((merge: { startRow: number; endRow: number; startColumn: number; endColumn: number }) => {
            try {
                worksheet.mergeCells(merge.startRow + 1, merge.startColumn + 1, merge.endRow + 1, merge.endColumn + 1);
            } catch {
                // skip duplicate merges
            }
        });

        const baseName = sanitizeFileName(scheduleInfo.name || activeRecord?.name || "grafik-na-smenite");
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${baseName}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(url);
    };

    const addShift = async () => {
        if (!scheduleIri || selectedDetailId === null) {
            notify("Изберете смяна, под която да се добави нова.", { type: "warning" });
            return;
        }

        try {
            setSaveStatus("saving");
            const anchorIndex = detailsRef.current.findIndex((detail: ShiftDetail) => detail.id === selectedDetailId);
            if (anchorIndex === -1) {
                throw new Error("Избраната смяна не беше намерена в текущата таблица.");
            }

            const anchorDetail = detailsRef.current[anchorIndex];
            const defaultShiftCode = buildNextShiftCode(detailsRef.current, getShiftTypeCode(anchorDetail?.shift_code));

            const response = await api.post("/shift_schedule_details", {
                shift_schedule: scheduleIri,
                shift_code: defaultShiftCode,
                at_doctor: "00:00",
                at_duty_officer: "00:00",
                shift_end: "00:00",
                worked_time: "00:00",
                night_work: null,
                kilometers: 0,
                zero_time: null,
                routes: [],
            });

            const newDetail = response.data as ShiftDetail;
            if (!newDetail.id) {
                throw new Error("API не върна ID за новата смяна.");
            }

            const nextDetails = [...detailsRef.current];
            nextDetails.splice(anchorIndex + 1, 0, newDetail);
            detailsRef.current = nextDetails;
            setSelectedDetailId(newDetail.id);
            setRenderVersion((current: number) => current + 1);
            window.setTimeout(() => {
                scheduleAutoSave();
            }, 250);
            notify("Смяната е добавена под избраната позиция.", { type: "success" });
        } catch (error: any) {
            setSaveStatus("error");
            notify(
                error?.response?.data?.detail || error?.message || "Грешка при добавяне на смяна",
                { type: "error" }
            );
        }
    };

    const addRouteRow = async () => {
        if (selectedDetailId === null) {
            notify("Изберете смяна, към която да се добави качване.", { type: "warning" });
            return;
        }

        try {
            setSaveStatus("saving");
            const detailIndex = detailsRef.current.findIndex((detail: ShiftDetail) => detail.id === selectedDetailId);
            if (detailIndex === -1) {
                throw new Error("Избраната смяна не беше намерена в текущата таблица.");
            }

            const selectedDetail = detailsRef.current[detailIndex];
            const detailPatchPath = normalizeResourcePath(selectedDetail.id, "/shift_schedule_details");
            if (!detailPatchPath) {
                throw new Error("Липсва валиден идентификатор на смяната.");
            }

            const nextRoutes = [...(Array.isArray(selectedDetail.routes) ? selectedDetail.routes : []).map((route: any) => normalizeRoute(route)), createEmptyRoute()];

            await api.patch(detailPatchPath, {
                routes: nextRoutes,
            });

            const nextDetails = [...detailsRef.current];
            nextDetails[detailIndex] = {
                ...selectedDetail,
                routes: nextRoutes,
            };
            detailsRef.current = nextDetails;
            setRenderVersion((current: number) => current + 1);
            window.setTimeout(() => {
                scheduleAutoSave();
            }, 250);
            notify("Добавен е нов ред за качване към избраната смяна.", { type: "success" });
        } catch (error: any) {
            setSaveStatus("error");
            notify(
                error?.response?.data?.detail || error?.message || "Грешка при добавяне на качване",
                { type: "error" }
            );
        }
    };

    const removeShift = async (detailId: number | string) => {
        if (!univerAPIRef.current) {
            return;
        }
        const detail = detailsRef.current.find((d: ShiftDetail) => d.id === detailId);
        const shiftCode = detail?.shift_code || String(detailId);
        if (!window.confirm(`Изтриване на смяна "${shiftCode}"?`)) {
            return;
        }
        try {
            setSaveStatus("saving");
            const detailPath = normalizeResourcePath(detailId, "/shift_schedule_details");
            if (!detailPath) {
                throw new Error("Липсва валиден идентификатор на смяната.");
            }
            await api.delete(detailPath);

            // Sort descending so row index adjustments stay valid
            const detailRows = rowMetaRef.current
                .filter((m: SheetRowMeta) => m.detailId === detailId)
                .sort((a: SheetRowMeta, b: SheetRowMeta) => b.rowIndex - a.rowIndex);

            const fbSheet = univerAPIRef.current.getActiveWorkbook()?.getActiveSheet();
            for (const meta of detailRows) {
                fbSheet?.deleteRow(meta.rowIndex);
                // rowMetaRef is updated synchronously by the command listener (sheet.mutation.remove-rows)
            }

            detailsRef.current = detailsRef.current.filter((d: ShiftDetail) => d.id !== detailId);
            setSelectedDetailId(null);
            scheduleAutoSave();
            notify("Смяна изтрита успешно", { type: "success" });
        } catch (error: any) {
            setSaveStatus("error");
            notify(
                error?.response?.data?.detail || error?.message || "Грешка при изтриване на смяна",
                { type: "error" }
            );
        }
    };

    const toggleFullscreen = () => {
        setIsFullscreen((prev: boolean) => {
            window.setTimeout(() => {
                window.dispatchEvent(new Event("resize"));
            }, 120);
            return !prev;
        });
    };

    const handleStatusChange = useCallback(async (nextStatus: "проект" | "активен") => {
        if (!scheduleIri || !activeRecord?.id) {
            return;
        }

        setIsStatusChanging(true);
        try {
            await api.patch(scheduleIri, { status: nextStatus });
            setScheduleStatus(nextStatus);
            setHydratedRecord((current: ShiftScheduleRecord | undefined) => ({
                ...(current ?? activeRecord ?? {}),
                id: current?.id ?? activeRecord?.id,
                "@id": current?.["@id"] ?? activeRecord?.["@id"] ?? scheduleIri,
                status: nextStatus,
            }));
            notify(nextStatus === "активен" ? "Графикът е маркиран като активен." : "Графикът е върнат към проект.", { type: "success" });
            setSaveStatus("saved");
        } catch (error: any) {
            console.error("Промяната на статуса се провали.", error);
            notify(
                error?.response?.data?.detail
                || error?.response?.data?.["hydra:description"]
                || error?.body?.detail
                || error?.body?.["hydra:description"]
                || error?.message
                || "Грешка при смяна на статуса",
                { type: "error" }
            );
        } finally {
            setIsStatusChanging(false);
        }
    }, [activeRecord, notify, scheduleIri]);

    if (isLoading) {
        return (
            <Box component={Paper} variant="outlined" sx={{ p: 3, mt: 2, display: "flex", alignItems: "center", gap: 2 }}>
                <CircularProgress size={24} />
                <Typography>Зареждане на смените...</Typography>
            </Box>
        );
    }

    if (data.length === 0) {
        return (
            <Box component={Paper} variant="outlined" sx={{ p: 3, mt: 2 }}>
                <Typography>Няма добавени смени в този график.</Typography>
            </Box>
        );
    }

    return (
        <Box
            ref={wrapperRef}
            sx={{
                mt: isFullscreen ? 0 : 2,
                position: isFullscreen ? "fixed" : "relative",
                inset: isFullscreen ? 0 : "auto",
                zIndex: isFullscreen ? 1400 : "auto",
                bgcolor: isFullscreen ? "background.paper" : "transparent",
                p: isFullscreen ? 2 : 0,
            }}
        >
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }} sx={{ mb: 2 }}>
                <FormControl size="small" sx={{ maxWidth: 160 }}>
                    <InputLabel id="schedule-status-label">Статус</InputLabel>
                    <Select
                        labelId="schedule-status-label"
                        value={scheduleStatus}
                        label="Статус"
                        onChange={(event: any) => {
                            const nextStatus = event.target.value as "проект" | "активен";
                            void handleStatusChange(nextStatus);
                        }}
                        disabled={isStatusChanging}
                    >
                        <MenuItem value="проект">Проект</MenuItem>
                        <MenuItem value="активен">Активен</MenuItem>
                    </Select>
                </FormControl>
                <Button variant="contained" startIcon={<DownloadIcon />} onClick={handleExport}>
                    Експорт към Excel
                </Button>
                <Button
                    variant="outlined"
                    color="success"
                    startIcon={<AddIcon />}
                    disabled={selectedDetailId === null}
                    onClick={() => { void addShift(); }}
                >
                    Добави смяна отдолу
                </Button>
                <Button
                    variant="outlined"
                    color="success"
                    startIcon={<AddIcon />}
                    disabled={selectedDetailId === null}
                    onClick={() => { void addRouteRow(); }}
                >
                    Добави качване
                </Button>
                <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    disabled={selectedDetailId === null}
                    onClick={() => { if (selectedDetailId !== null) void removeShift(selectedDetailId); }}
                >
                    Изтрий смяна
                </Button>
                <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={() => {
                        setSaveStatus("idle");
                        setRenderVersion((current: number) => current + 1);
                    }}
                >
                    Възстанови таблицата
                </Button>
                <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<SettingsIcon />}
                    onClick={() => setAutoSettingsOpen(true)}
                >
                    Параметри по подразбиране
                </Button>
                <Button
                    variant="outlined"
                    startIcon={isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                    onClick={toggleFullscreen}
                >
                    {isFullscreen ? "Изход от цял екран" : "Цял екран"}
                </Button>
                <Typography variant="body2" color="text.secondary">
                    {saveStatus === "saving" && "Автоматично запазване..."}
                    {saveStatus === "saved" && "Промените са записани."}
                    {saveStatus === "error" && "Има грешка при автоматичното запазване."}
                    {saveStatus === "idle" && "Форматирането, стойностите и структурата се записват автоматично."}
                </Typography>
            </Stack>

            <Alert severity={saveStatus === "error" ? "error" : "info"} sx={{ mb: 2 }}>
                Всички промени — стойности, форматиране, ширини на колони и допълнителни качвания — се записват автоматично. Изберете ред от смяната, за да добавите нова смяна отдолу, качване към нея или да я изтриете.
            </Alert>

            <Box
                ref={containerRef}
                component={Paper}
                variant="outlined"
                sx={{
                    width: "100%",
                    height: isFullscreen ? "calc(100vh - 140px)" : "78vh",
                    overflow: "hidden",
                    "& .univer-container": {
                        height: "100%",
                    },
                }}
            />

            <Dialog
                open={autoSettingsOpen}
                onClose={() => setAutoSettingsOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Настройки на автоматично попълване по подразбиране</DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 2 }}>
                        <TextField
                            label="При лекар (офсет спрямо първо качване, минути)"
                            type="number"
                            value={autoSettings.doctorOffset}
                            onChange={(e: any) => handleSaveAutoSettings({ ...autoSettings, doctorOffset: parseInt(e.target.value, 10) || 0 })}
                            helperText="По подразбиране: -60 минути (1 час преди първото качване 'В график')"
                            fullWidth
                        />
                        <TextField
                            label="При дежурен (офсет спрямо лекар, минути)"
                            type="number"
                            value={autoSettings.dutyOfficerOffset}
                            onChange={(e: any) => handleSaveAutoSettings({ ...autoSettings, dutyOfficerOffset: parseInt(e.target.value, 10) || 0 })}
                            helperText="По подразбиране: +30 минути (30 минути след 'При лекар')"
                            fullWidth
                        />
                        <TextField
                            label="Край (офсет спрямо последно слизане, минути)"
                            type="number"
                            value={autoSettings.endOffset}
                            onChange={(e: any) => handleSaveAutoSettings({ ...autoSettings, endOffset: parseInt(e.target.value, 10) || 0 })}
                            helperText="По подразбиране: +15 минути (добавят се към последното 'От график')"
                            fullWidth
                        />
                        <Stack direction="row" spacing={2}>
                            <TextField
                                label="Нощен труд - Начало"
                                type="text"
                                placeholder="22:00"
                                value={autoSettings.nightStart}
                                onChange={(e: any) => handleSaveAutoSettings({ ...autoSettings, nightStart: e.target.value })}
                                helperText="Напр. 22:00"
                                fullWidth
                            />
                            <TextField
                                label="Нощен труд - Край"
                                type="text"
                                placeholder="06:00"
                                value={autoSettings.nightEnd}
                                onChange={(e: any) => handleSaveAutoSettings({ ...autoSettings, nightEnd: e.target.value })}
                                helperText="Напр. 06:00"
                                fullWidth
                            />
                        </Stack>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => handleSaveAutoSettings(DEFAULT_AUTO_VALUES)} color="warning">По подразбиране</Button>
                    <Button onClick={() => setAutoSettingsOpen(false)} variant="contained" color="primary">Готово</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
