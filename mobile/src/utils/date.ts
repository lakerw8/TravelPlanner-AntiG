export function formatDateRange(startDate: string, endDate: string): string {
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export function formatDayChip(value: string): { weekday: string; day: string } {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { weekday: "Day", day: "--" };
  }

  return {
    weekday: date.toLocaleDateString(undefined, { weekday: "short" }),
    day: String(date.getDate())
  };
}

export function toLocalInputDate(isoValue?: string): string {
  if (!isoValue) return "";
  const parsed = new Date(isoValue);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

export function toIsoTimestamp(dateValue: string, timeValue: string): string {
  const safeTime = timeValue || "09:00";
  const normalizedTime = safeTime.length === 5 ? `${safeTime}:00` : safeTime;
  const base = `${dateValue}T${normalizedTime}`;
  return new Date(base).toISOString();
}
