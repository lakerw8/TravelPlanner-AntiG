const DATE_ONLY_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;
const MS_PER_DAY = 86_400_000;

export function extractIsoDatePart(value?: string | null): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    const match = DATE_ONLY_PREFIX.exec(trimmed);
    if (!match) return null;
    return `${match[1]}-${match[2]}-${match[3]}`;
}

export function parseDateOnlyToUtcDate(value?: string | null): Date | null {
    const datePart = extractIsoDatePart(value);
    if (!datePart) return null;

    const [yearStr, monthStr, dayStr] = datePart.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);

    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
        return null;
    }

    const date = new Date(Date.UTC(year, month - 1, day));
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
        return null;
    }

    return date;
}

export function toUtcDayNumber(value?: string | null): number | null {
    const date = parseDateOnlyToUtcDate(value);
    if (!date) return null;
    return Math.floor(date.getTime() / MS_PER_DAY);
}

export function diffDaysBetweenDateOnly(startValue?: string | null, endValue?: string | null): number | null {
    const startDay = toUtcDayNumber(startValue);
    const endDay = toUtcDayNumber(endValue);
    if (startDay === null || endDay === null) return null;
    return endDay - startDay;
}

export function addDaysToDateOnly(value: string, days: number): string | null {
    const baseDate = parseDateOnlyToUtcDate(value);
    if (!baseDate || !Number.isFinite(days)) return null;
    const nextDate = new Date(baseDate.getTime() + Math.trunc(days) * MS_PER_DAY);
    return nextDate.toISOString().slice(0, 10);
}

export function formatDateOnly(
    value: string | null | undefined,
    locale?: string | string[],
    options?: Intl.DateTimeFormatOptions,
): string {
    const date = parseDateOnlyToUtcDate(value);
    if (!date) return "";
    return new Intl.DateTimeFormat(locale, { timeZone: "UTC", ...options }).format(date);
}
