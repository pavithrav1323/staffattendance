import bcrypt from "bcrypt";
import { z } from "zod";

const SALT_ROUNDS = 12;

export const PASSWORD_POLICY_MESSAGE =
  "Password must be at least 8 characters and include uppercase, lowercase, number, and special character";

export function validatePassword(password: string): boolean {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&*!])[A-Za-z\d@#$%^&*!]{8,}$/.test(password);
}

/**
 * Single source of truth for privileged account password validation
 * (PROGRAM_OWNER, MASTER_ADMIN, ADMIN).
 */
export const strongPasswordSchema = z
  .string()
  .refine(validatePassword, { message: PASSWORD_POLICY_MESSAGE });

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function comparePassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}