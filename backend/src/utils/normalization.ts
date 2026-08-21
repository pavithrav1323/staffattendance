/**
 * Normalization utilities for user data
 */

/**
 * Normalize email: trim and lowercase
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Normalize employee ID: trim and uppercase
 * This ensures consistent comparison regardless of input case
 */
export function normalizeEmployeeId(employeeId: string): string {
  return employeeId.trim().toUpperCase();
}

/**
 * Normalize company code: trim and uppercase
 */
export function normalizeCompanyCode(companyCode: string): string {
  return companyCode.trim().toUpperCase();
}