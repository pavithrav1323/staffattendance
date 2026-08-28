export function getDateInTimeZone(
  timeZone: string
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find(
    (part) => part.type === "year"
  )?.value;

  const month = parts.find(
    (part) => part.type === "month"
  )?.value;

  const day = parts.find(
    (part) => part.type === "day"
  )?.value;

  return `${year}-${month}-${day}`;
}

export function parseTimeInZone(
  dateString: string,
  timeString: string,
  timeZone: string
): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  const [hour, minute] = timeString.split(":").map(Number);

  let t = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

  for (let i = 0; i < 5; i++) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(t);

    const y = Number(parts.find((p) => p.type === "year")?.value);
    const mo = Number(parts.find((p) => p.type === "month")?.value);
    const d = Number(parts.find((p) => p.type === "day")?.value);
    const h = Number(parts.find((p) => p.type === "hour")?.value);
    const mi = Number(parts.find((p) => p.type === "minute")?.value);
    const s = Number(parts.find((p) => p.type === "second")?.value);

    const actual = new Date(Date.UTC(y, mo - 1, d, h, mi, s));
    const desired = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
    const diff = actual.getTime() - desired.getTime();

    if (Math.abs(diff) < 60000) {
      return t;
    }

    t = new Date(t.getTime() - diff);
  }

  return t;
}

export function formatTimeOnly(
  date: Date | null | undefined,
  timeZone?: string
): string {
  if (!date) return "--";
  const options: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  };
  if (timeZone) {
    options.timeZone = timeZone;
  }
  return new Intl.DateTimeFormat("en-US", options).format(date);
}

export function validateMonthFormat(
  month: string
): boolean {
  const regex = /^\d{4}-\d{2}$/;
  if (!regex.test(month)) {
    return false;
  }

  const [year, monthNum] = month.split("-").map(Number);
  if (monthNum < 1 || monthNum > 12) {
    return false;
  }

  return true;
}

export function getMonthBoundaries(
  month: string
): { start: string; end: string } {
  const [year, monthNum] = month.split("-").map(Number);
  const start = `${year}-${String(monthNum).padStart(2, "0")}-01`;

  const lastDay = new Date(year, monthNum, 0).getDate();
  const end = `${year}-${String(monthNum).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  return { start, end };
}

export function validateDateFormat(date: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(date)) {
    return false;
  }

  const [year, monthNum, dayNum] = date.split("-").map(Number);
  if (monthNum < 1 || monthNum > 12) {
    return false;
  }

  if (dayNum < 1 || dayNum > 31) {
    return false;
  }

  return true;
}

export function validateYearFormat(year: string): boolean {
  const regex = /^\d{4}$/;
  if (!regex.test(year)) {
    return false;
  }

  const yearNum = Number(year);
  if (yearNum < 1900 || yearNum > 2100) {
    return false;
  }

  return true;
}

export function getWeekBoundaries(dateString: string): { start: string; end: string } {
  const date = new Date(dateString);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const start = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
  const end = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, "0")}-${String(sunday.getDate()).padStart(2, "0")}`;

  return { start, end };
}

export function getYearBoundaries(year: string): { start: string; end: string } {
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;

  return { start, end };
}