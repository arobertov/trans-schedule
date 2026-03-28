import React, { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import RefreshIcon from "@mui/icons-material/Refresh";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import { useGetList, useNotify } from "react-admin";
import "@univerjs/design/lib/index.css";
import "@univerjs/ui/lib/index.css";
import "@univerjs/sheets-ui/lib/index.css";
import "@univerjs/docs-ui/lib/index.css";
import "@univerjs/sheets-formula-ui/lib/index.css";
import {
    ICommandService,
    IUniverInstanceService,
    LocaleType,
    LogLevel,
    Univer,
    UniverInstanceType,
} from "@univerjs/core";
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
import UniverDesignEnUS from "@univerjs/design/locale/en-US";
import UniverDocsUIEnUS from "@univerjs/docs-ui/locale/en-US";
import UniverSheetsFormulaUIEnUS from "@univerjs/sheets-formula-ui/locale/en-US";
import UniverSheetsUIEnUS from "@univerjs/sheets-ui/locale/en-US";
import UniverUIEnUS from "@univerjs/ui/locale/en-US";
import api from "../../../jwt-frontend-auth/src/api/apiClient";
import { BulgarianLanguage } from "../../../locales/univer/index";

type ShiftScheduleRecord = {
    id?: number | string;
    "@id"?: string;
    name?: string;
    description?: string;
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
                nextStyle.bd.t = { s: borderStyle, cl: { rgb: "#000000" } };
            }

            if (row === endRow) {
                nextStyle.bd.b = { s: borderStyle, cl: { rgb: "#000000" } };
            }

            if (column === startColumn) {
                nextStyle.bd.l = { s: borderStyle, cl: { rgb: "#000000" } };
            }

            if (column === endColumn) {
                nextStyle.bd.r = { s: borderStyle, cl: { rgb: "#000000" } };
            }

            cell.s = nextStyle;
        }
    }
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

    if (typeof value === "string") {
        const trimmed = value.trim();
        if (/^\d{2}:\d{2}$/.test(trimmed)) {
            return trimmed;
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
        .map((route) => normalizeRoute(route))
        .filter(hasMeaningfulRouteData),
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

const buildWorkbookConfig = (schedule: { name: string; description: string }, shifts: ShiftDetail[]) => {
    const cellData: Record<number, Record<number, { v: string; s?: any }>> = {};
    const mergeData: Array<{ startRow: number; endRow: number; startColumn: number; endColumn: number }> = [];
    const rowMeta: SheetRowMeta[] = [];
    const columnData = estimateColumnWidths(shifts);

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
    applyOuterBorder(cellData, HEADER_ROW, HEADER_ROW, 0, COLUMNS.length - 1, BORDER_DOUBLE);

    let currentSheetRow = DATA_ROW_START;

    shifts.forEach((shift, shiftIndex) => {
        const groupStartRow = currentSheetRow;
        const routes = Array.isArray(shift.routes) ? shift.routes : [];
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
        }

        applyOuterBorder(cellData, groupStartRow, currentSheetRow - 1, 0, COLUMNS.length - 1, BORDER_DOUBLE);
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
            locale: LocaleType.EN_US,
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

    if (style === 8) {
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
                                style: toExcelBorderStyle(style.bd.t.s),
                                color: { argb: toExcelArgb(style.bd.t.cl) || "FF000000" },
                            },
                        }
                        : {}),
                    ...(style.bd.b
                        ? {
                            bottom: {
                                style: toExcelBorderStyle(style.bd.b.s),
                                color: { argb: toExcelArgb(style.bd.b.cl) || "FF000000" },
                            },
                        }
                        : {}),
                    ...(style.bd.l
                        ? {
                            left: {
                                style: toExcelBorderStyle(style.bd.l.s),
                                color: { argb: toExcelArgb(style.bd.l.cl) || "FF000000" },
                            },
                        }
                        : {}),
                    ...(style.bd.r
                        ? {
                            right: {
                                style: toExcelBorderStyle(style.bd.r.s),
                                color: { argb: toExcelArgb(style.bd.r.cl) || "FF000000" },
                            },
                        }
                        : {}),
                },
            }
            : {}),
    };
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
    schedule: { name: string; description: string }
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

    return {
        schedule: {
            name: formatPlainValue(sheet.getCell(NAME_ROW, 0)?.v) || schedule.name,
            description: formatPlainValue(sheet.getCell(DESCRIPTION_ROW, 0)?.v) || schedule.description,
        },
        details: Array.from(detailsMap.values()).map((detail) => ({
            ...detail,
            routes: detail.routes.filter(hasMeaningfulRouteData),
        })),
    };
};

interface ShiftScheduleUniverTableProps {
    record: ShiftScheduleRecord | undefined;
}

export const ShiftScheduleUniverTable = ({ record }: ShiftScheduleUniverTableProps) => {
    const scheduleIri = normalizeResourcePath(record?.["@id"] ?? record?.id, "/shift_schedules");
    const notify = useNotify();
    const containerRef = useRef<HTMLDivElement>(null);
    const univerRef = useRef<Univer | null>(null);
    const workbookRef = useRef<any>(null);
    const mergeDataRef = useRef<Array<{ startRow: number; endRow: number; startColumn: number; endColumn: number }>>([]);
    const rowMetaRef = useRef<SheetRowMeta[]>([]);
    const detailsRef = useRef<ShiftDetail[]>([]);
    const isHydratingRef = useRef(true);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isSavingRef = useRef(false);
    const hasPendingSaveRef = useRef(false);
    const lastSavedSnapshotRef = useRef<string>("");
    const [renderVersion, setRenderVersion] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
    const [scheduleInfo, setScheduleInfo] = useState({
        name: formatPlainValue(record?.name),
        description: formatPlainValue(record?.description),
    });

    const { data = [], isLoading } = useGetList("shift_schedule_details", {
        pagination: { page: 1, perPage: 200 },
        sort: { field: "id", order: "ASC" },
        filter: scheduleIri ? { shift_schedule: scheduleIri } : {},
    });

    useEffect(() => {
        setScheduleInfo({
            name: formatPlainValue(record?.name),
            description: formatPlainValue(record?.description),
        });
    }, [record?.id, record?.name, record?.description]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(Boolean(document.fullscreenElement));
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);

        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
        };
    }, []);

    useEffect(() => {
        const nextDetails = (Array.isArray(data) ? data : []) as ShiftDetail[];
        detailsRef.current = nextDetails;
        lastSavedSnapshotRef.current = serializeSnapshot({
            schedule: scheduleInfo,
            details: nextDetails
                .filter((detail: ShiftDetail) => detail.id !== undefined && detail.id !== null)
                .map((detail: ShiftDetail) => buildSaveDetailSnapshot(detail)),
        });
    }, [data]);

    const performAutoSave = async () => {
        if (!record?.id || !workbookRef.current || !scheduleIri) {
            return;
        }

        const sheet = workbookRef.current.getActiveSheet();
        if (!sheet) {
            return;
        }

        const snapshot = captureSnapshotFromSheet(sheet, rowMetaRef.current, detailsRef.current, scheduleInfo);
        const serialized = serializeSnapshot(snapshot);

        if (serialized === lastSavedSnapshotRef.current) {
            return;
        }

        if (isSavingRef.current) {
            hasPendingSaveRef.current = true;
            return;
        }

        isSavingRef.current = true;
        setSaveStatus("saving");

        try {
            const schedulePatchPath = normalizeResourcePath(record?.["@id"] ?? record?.id, "/shift_schedules");

            if (snapshot.schedule.name !== scheduleInfo.name || snapshot.schedule.description !== scheduleInfo.description) {
                if (!schedulePatchPath) {
                    throw new Error("Липсва валиден идентификатор за графика.");
                }

                await api.patch(schedulePatchPath, {
                    name: snapshot.schedule.name || scheduleInfo.name,
                    description: snapshot.schedule.description || null,
                });
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

                const parsedZeroTime = parseZeroTimeToMinutes(detail.zero_time);

                await api.patch(detailPatchPath, {
                    shift_schedule: scheduleIri,
                    shift_code: detail.shift_code,
                    at_doctor: detail.at_doctor,
                    at_duty_officer: detail.at_duty_officer,
                    shift_end: detail.shift_end,
                    worked_time: detail.worked_time,
                    night_work: detail.night_work,
                    kilometers: detail.kilometers,
                    zero_time: parsedZeroTime !== undefined ? parsedZeroTime : detail.zero_time,
                    routes: detail.routes,
                });
            }

            lastSavedSnapshotRef.current = serialized;
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
    };

    const scheduleAutoSave = () => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
            void performAutoSave();
        }, AUTOSAVE_DEBOUNCE_MS);
    };

    useEffect(() => {
        if (!containerRef.current || !record) {
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

            workbookRef.current = null;
            isHydratingRef.current = true;
        };

        cleanup();

        const univer = new Univer({
            theme: defaultTheme,
            locale: LocaleType.BG_BG,
            locales: BulgarianLanguage,
            //locale: LocaleType.EN_US,
            //locales: {
            //    [LocaleType.EN_US]: {
            //        ...UniverDesignEnUS,
            //        ...UniverDocsUIEnUS,
            //        ...UniverSheetsUIEnUS,
            //        ...UniverSheetsFormulaUIEnUS,
            //        ...UniverUIEnUS,
            //    },
            //},
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

        const injector = (univer as any).__getInjector();
        const commandService = injector.get(ICommandService);
        const univerInstanceService = injector.get(IUniverInstanceService);

        commandService.onCommandExecuted((command: any) => {
            if (isHydratingRef.current) {
                return;
            }

            const params = command?.params;
            const range = params?.range;
            if (!range || !params?.unitId || !params?.subUnitId) {
                return;
            }

            const workbook = univerInstanceService.getUnit(params.unitId);
            const sheet = workbook?.getSheetBySheetId(params.subUnitId);
            if (!sheet) {
                return;
            }

            scheduleAutoSave();
        });

        const { workbook, mergeData, rowMeta } = buildWorkbookConfig(scheduleInfo, detailsRef.current);

        univerRef.current = univer;
        mergeDataRef.current = mergeData;
        rowMetaRef.current = rowMeta;
        workbookRef.current = univer.createUnit(UniverInstanceType.UNIVER_SHEET, workbook);

        window.setTimeout(() => {
            isHydratingRef.current = false;
        }, 100);

        return cleanup;
    }, [record, renderVersion, isLoading]);

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
            worksheet.mergeCells(merge.startRow + 1, merge.startColumn + 1, merge.endRow + 1, merge.endColumn + 1);
        });

        const baseName = sanitizeFileName(scheduleInfo.name || record?.name || "grafik-na-smenite");
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${baseName}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(url);
    };

    const toggleFullscreen = async () => {
        if (!containerRef.current) {
            return;
        }

        if (document.fullscreenElement) {
            await document.exitFullscreen();
        } else {
            await containerRef.current.requestFullscreen();
        }

        window.setTimeout(() => {
            window.dispatchEvent(new Event("resize"));
        }, 120);
    };

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
                <Button variant="contained" startIcon={<DownloadIcon />} onClick={handleExport}>
                    Експорт към Excel
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
                    startIcon={isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                    onClick={() => {
                        void toggleFullscreen();
                    }}
                >
                    {isFullscreen ? "Изход от цял екран" : "Цял екран"}
                </Button>
                <Typography variant="body2" color="text.secondary">
                    {saveStatus === "saving" && "Автоматично запазване..."}
                    {saveStatus === "saved" && "Промените са записани в API."}
                    {saveStatus === "error" && "Има грешка при автоматичното запазване."}
                    {saveStatus === "idle" && "Промените в таблицата се записват автоматично в API след кратко изчакване."}
                </Typography>
            </Stack>

            <Alert severity={saveStatus === "error" ? "error" : "info"} sx={{ mb: 2 }}>
                Таблицата поддържа автоматично записване към API при редакция на клетките. При много маршрути структурата на редовете се запазва; редактират се стойностите в съществуващите клетки.
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
        </Box>
    );
};
