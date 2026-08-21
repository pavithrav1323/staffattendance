export function getDateInTimeZone(timeZone) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    return `${year}-${month}-${day}`;
}
export function validateMonthFormat(month) {
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
export function getMonthBoundaries(month) {
    const [year, monthNum] = month.split("-").map(Number);
    const start = `${year}-${String(monthNum).padStart(2, "0")}-01`;
    const lastDay = new Date(year, monthNum, 0).getDate();
    const end = `${year}-${String(monthNum).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    return { start, end };
}
export function validateDateFormat(date) {
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
export function validateYearFormat(year) {
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
export function getWeekBoundaries(dateString) {
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
export function getYearBoundaries(year) {
    const start = `${year}-01-01`;
    const end = `${year}-12-31`;
    return { start, end };
}
//# sourceMappingURL=date.js.map