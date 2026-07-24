export interface ShiftDefaults {
    doctorOffset: number;       // default: -60 minutes
    dutyOfficerOffset: number;  // default: +30 minutes
    endOffset: number;          // default: +15 minutes
    nightStart: string;         // default: "22:00"
    nightEnd: string;           // default: "06:00"
}

export const DEFAULT_AUTO_VALUES: ShiftDefaults = {
    doctorOffset: -60,
    dutyOfficerOffset: 30,
    endOffset: 15,
    nightStart: "22:00",
    nightEnd: "06:00",
};

export const isValidTimeString = (timeStr: string | null | undefined): boolean => {
    if (!timeStr) {
        return false;
    }

    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) {
        return false;
    }

    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);

    return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
};

/**
 * Utility to parse "HH:MM" string to minutes since midnight
 */
export const hhmmToMinutes = (timeStr: string): number => {
    if (!isValidTimeString(timeStr)) return 0;
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return 0;
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
};

/**
 * Utility to format minutes (potentially outside [0, 1440]) back to "HH:MM"
 */
export const minutesToHhmm = (minutes: number): string => {
    let normalized = minutes;
    while (normalized < 0) {
        normalized += 1440;
    }
    normalized = normalized % 1440;
    const h = Math.floor(normalized / 60);
    const m = normalized % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

/**
 * Rounds a minute value to a 5-minute grid using domain rule:
 * - remainder 0..2 -> down to 0
 * - remainder 3..7 -> to 5
 * - remainder 8..9 -> up to next 10
 */
export const roundMinutesToOperationalFive = (minutes: number): number => {
    const remainder = ((minutes % 10) + 10) % 10;

    if (remainder <= 2) {
        return minutes - remainder;
    }

    if (remainder <= 7) {
        return minutes + (5 - remainder);
    }

    return minutes + (10 - remainder);
};

/**
 * Utility to handle midnight wrap-around over a chronologically sequence of segments
 */
export const getContiguousMinutes = (timeStr: string, referenceMinutes?: number): number => {
    const rawMins = hhmmToMinutes(timeStr);
    if (referenceMinutes === undefined) {
        return rawMins;
    }
    let adjusted = rawMins;
    while (adjusted < referenceMinutes) {
        adjusted += 1440;
    }
    while (adjusted - referenceMinutes > 720) {
        adjusted -= 1440;
    }
    return adjusted;
};

/**
 * Sorts shift routes ascendingly by 'in_schedule' hour, 
 * with the exception that boarding after 01:00 is placed last.
 */
export const sortShiftRoutes = <T extends { in_schedule?: string | null }>(routes: T[]): T[] => {
    if (!Array.isArray(routes)) return [];

    // Check if the route collection contains elements from an overnight/night shift.
    // A night shift is characterized by having some rides in the afternoon/evening (>= 19:00)
    // and some rides in the morning of the next day (< 10:00).
    const hasLateDay = routes.some(r => {
        const time = r.in_schedule || "";
        const h = parseInt(time.split(":")[0], 10);
        return !isNaN(h) && h >= 19;
    });

    return [...routes].sort((a, b) => {
        const timeA = a.in_schedule || "";
        const timeB = b.in_schedule || "";
        if (!timeA && !timeB) return 0;
        if (!timeA) return 1;
        if (!timeB) return -1;

        const getSortValue = (timeStr: string) => {
            const parts = timeStr.split(":");
            const h = parseInt(parts[0], 10) || 0;
            const m = parseInt(parts[1], 10) || 0;
            const val = h + m / 60;

            if (hasLateDay) {
                // For a night/overnight shift:
                // Evening rides: 14:00 to 23:59 on the first day -> sort naturally [14.0, 23.99]
                // Midnight rides: 00:00 to 00:59 next day -> sort after evening (+24)
                // Exception rides after 01:00 am: 01:00 to 13:59 next day -> sort absolutely last (+48)
                if (val >= 1.0 && val < 14.0) {
                    return val + 48; // placed at the absolute end
                } else if (val < 1.0) {
                    return val + 24; // midnight to 00:59 next day
                }
                return val;
            } else {
                // For a standard morning/day shift:
                // Morning begins at 04:00.
                if (val < 4.0) {
                    return val + 24; // times after midnight are tomorrow
                }
                return val;
            }
        };

        return getSortValue(timeA) - getSortValue(timeB);
    });
};

/**
 * Determines the shift type based on the shift code suffix
 * The last letter in the shift code determines the type:
 * - Н (or N, H) = night shift (нощна)
 * - Д (or D) = day shift (дневна)
 * - С (or S, C) = morning shift (сутрешна)
 */
export const determineShiftType = (shiftCode: string | null | undefined): "night" | "morning" | "day" => {
    if (!shiftCode) {
        return "day";
    }

    const normalized = shiftCode.trim().toUpperCase();
    
    // Extract the last character (or last meaningful character after ignoring ?, digits, etc.)
    const lastChar = normalized.replace(/\s+/g, "").slice(-1);
    
    if (lastChar === "Н" || lastChar === "N" || lastChar === "H") {
        return "night";
    }
    
    if (lastChar === "С" || lastChar === "S" || lastChar === "C") {
        return "morning";
    }
    
    if (lastChar === "Д" || lastChar === "D") {
        return "day";
    }
    
    return "day";
};

/**
 * Format minutes to signed duration string "-H:MM" or "H:MM"
 * Handles negative values correctly
 */
export const minutesToSignedHhmm = (minutes: number): string => {
    if (minutes === 0 || minutes === -0) {
        return "00:00";
    }

    const sign = minutes < 0 ? "-" : "";
    const absMinutes = Math.abs(minutes);
    const h = Math.floor(absMinutes / 60);
    const m = absMinutes % 60;

    return `${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

/**
 * Calculates zero time (нулево време) based on shift type
 * For night shifts (ending before 02:00): 00:00 - shift_end (negative value if end is 00:00 - 02:00)
 * For morning shifts: 00:00 to at_doctor (time from midnight to shift start)
 */
export const calculateZeroTime = (
    shiftType: "night" | "morning" | "day",
    shiftEndMins: number,
    atDoctorMins: number
): string => {
    if (shiftType === "night") {
        // For night shifts: check if shift_end is before 02:00 (120 minutes)
        const endModulo = shiftEndMins % 1440;
        // 1. Ако е след 02:00 (120 мин), не изчисляваме нищо
        if (endModulo >= 120 && endModulo < 1200) {
            return "00:00";
        }

        // 2. Ако е между 00:00 и 02:00, връщаме отрицателно време
        if (endModulo < 120) {
            return minutesToSignedHhmm(-endModulo);
        }

        // 3. Ако е между 22:00 (1320 мин) и 23:59, изчисляваме до полунощ
        if (endModulo >= 1200) {
            const diffToMidnight = 1440 - endModulo;
            return minutesToSignedHhmm(diffToMidnight);
        }

        return "00:00";
    }

    if (shiftType === "morning") {
        // For morning shifts: zero time = time from midnight to at_doctor
        return minutesToSignedHhmm(atDoctorMins);
    }

    return "00:00";
};

/**
 * Automatically computes shift schedule column values: At Doctor, At Duty Officer, Shift End, Worked Time, Night Labor, and Zero Time
 */
export const calculateShiftAutoValues = (
    routes: any[],
    settings: ShiftDefaults = DEFAULT_AUTO_VALUES,
    shiftCode?: string | null
): {
    at_doctor: string;
    at_duty_officer: string;
    shift_end: string;
    worked_time: string;
    night_work: string;
    zero_time: string;
} => {
    if (!routes || routes.length === 0) {
        return {
            at_doctor: "00:00",
            at_duty_officer: "00:00",
            shift_end: "00:00",
            worked_time: "00:00",
            night_work: "00:00",
            zero_time: "00:00",
        };
    }

    const sorted = sortShiftRoutes(routes);
    const firstRoute = sorted.find((route) => isValidTimeString(route?.in_schedule));
    const lastRoute = [...sorted].reverse().find((route) => isValidTimeString(route?.from_schedule));

    if (!firstRoute || !lastRoute) {
        return {
            at_doctor: "00:00",
            at_duty_officer: "00:00",
            shift_end: "00:00",
            worked_time: "00:00",
            night_work: "00:00",
            zero_time: "00:00",
        };
    }

    const startMins = hhmmToMinutes(firstRoute.in_schedule || "00:00");
    const doctorMins = roundMinutesToOperationalFive(startMins + (settings.doctorOffset ?? -60));
    const dutyMins = roundMinutesToOperationalFive(doctorMins + (settings.dutyOfficerOffset ?? 30));

    const lastFromMins = getContiguousMinutes(lastRoute.from_schedule || "00:00", startMins);
    const endMins = roundMinutesToOperationalFive(lastFromMins + (settings.endOffset ?? 15));

    const workedMins = Math.max(0, endMins - doctorMins);

    // Calculate night work minutes
    let nightMins = 0;
    const nStart = hhmmToMinutes(settings.nightStart || "22:00");
    const nEnd = hhmmToMinutes(settings.nightEnd || "06:00");

    for (let m = doctorMins; m < endMins; m++) {
        const modMin = m % 1440;
        let isNight = false;
        if (nStart > nEnd) {
            isNight = modMin >= nStart || modMin < nEnd;
        } else {
            isNight = modMin >= nStart && modMin < nEnd;
        }
        if (isNight) {
            nightMins++;
        }
    }

    // Calculate zero time based on shift type (determined from shift code)
    const shiftType = determineShiftType(shiftCode);
    const zeroTime = calculateZeroTime(shiftType, endMins, doctorMins);

    return {
        at_doctor: minutesToHhmm(doctorMins),
        at_duty_officer: minutesToHhmm(dutyMins),
        shift_end: minutesToHhmm(endMins),
        worked_time: minutesToHhmm(workedMins),
        night_work: minutesToHhmm(nightMins),
        zero_time: zeroTime,
    };
};
