import jwt from "jsonwebtoken";

import { env } from "../config/env.js";

export type UserRole =
  | "PROGRAM_OWNER"
  | "MASTER_ADMIN"
  | "ADMIN"
  | "STAFF";

export interface AuthTokenPayload {
  userId: string;
  companyId: string | null;
  role: UserRole;
  departmentId: string | null;
  workLocationId: string | null;
}

interface RefreshTokenPayload {
  userId: string;
}

export function createAccessToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: "1h",
  });
}

export function createRefreshToken(userId: string): string {
  return jwt.sign(
    {
      userId,
      tokenType: "refresh",
    },
    env.jwtSecret,
    {
      expiresIn: "7d",
    }
  );
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, env.jwtSecret);

  if (
    typeof decoded === "string" ||
    typeof decoded.userId !== "string" ||
    !isNullableString(decoded.companyId) ||
    !isUserRole(decoded.role) ||
    !isNullableString(decoded.departmentId) ||
    !isNullableString(decoded.workLocationId)
  ) {
    throw new Error("Invalid authentication token");
  }

  return {
    userId: decoded.userId,
    companyId: decoded.companyId,
    role: decoded.role,
    departmentId: decoded.departmentId,
    workLocationId: decoded.workLocationId,
  };
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, env.jwtSecret);

  if (
    typeof decoded === "string" ||
    typeof decoded.userId !== "string" ||
    decoded.tokenType !== "refresh"
  ) {
    throw new Error("Invalid refresh token");
  }

  return {
    userId: decoded.userId,
  };
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isUserRole(value: unknown): value is UserRole {
  return (
    value === "PROGRAM_OWNER" ||
    value === "MASTER_ADMIN" ||
    value === "ADMIN" ||
    value === "STAFF"
  );
}