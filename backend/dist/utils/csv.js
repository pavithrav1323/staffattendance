export function escapeCSVValue(value) {
    if (value === null || value === undefined) {
        return "";
    }
    const stringValue = String(value);
    // If the value contains commas, quotes, or newlines, wrap in quotes and escape quotes
    if (stringValue.includes(",") ||
        stringValue.includes('"') ||
        stringValue.includes("\n") ||
        stringValue.includes("\r")) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
}
export function generateCSVRow(values) {
    return values.map(escapeCSVValue).join(",");
}
//# sourceMappingURL=csv.js.map