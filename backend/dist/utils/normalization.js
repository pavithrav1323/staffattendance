/**
 * Normalization utilities for user data
 */
/**
 * Normalize email: trim and lowercase
 */
export function normalizeEmail(email) {
    return email.trim().toLowerCase();
}
/**
 * Normalize employee ID: trim and uppercase
 * This ensures consistent comparison regardless of input case
 */
export function normalizeEmployeeId(employeeId) {
    return employeeId.trim().toUpperCase();
}
/**
 * Normalize company code: trim and uppercase
 */
export function normalizeCompanyCode(companyCode) {
    return companyCode.trim().toUpperCase();
}
//# sourceMappingURL=normalization.js.map