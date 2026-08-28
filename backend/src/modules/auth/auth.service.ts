import { and, eq, gte, ilike } from "drizzle-orm";

import { db } from "../../db/connection.js";
import { companies } from "../../db/schema/companies.js";
import { departments } from "../../db/schema/departments.js";
import { users } from "../../db/schema/users.js";
import { staffDevices } from "../../db/schema/staff-devices.js";

import { AppError } from "../../utils/app-error.js";
import { hashDeviceToken } from "../../utils/device-token.js";
import { logger } from "../../utils/logger.js";
import { performance } from "node:perf_hooks";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
} from "../../utils/jwt.js";

import {
  comparePassword,
  hashPassword,
  validatePassword,
} from "../../utils/password.js";

import {
  normalizeEmail,
  normalizeEmployeeId,
  normalizeCompanyCode,
} from "../../utils/normalization.js";

import type {
  LoginInput,
  RefreshInput,
  RegisterInput,
  RegisterProgramOwnerInput,
} from "./auth.schema.js";

import {
  getValidRefreshToken,
  revokeAllUserRefreshTokens,
  revokeRefreshToken,
  saveRefreshToken,
} from "./refresh-token.service.js";

export async function registerStaff(input: RegisterInput) {
  const normalizedCompanyCode = normalizeCompanyCode(input.companyCode);
  const normalizedEmail = normalizeEmail(input.email);
  const normalizedEmployeeId = normalizeEmployeeId(input.employeeId);

  const [company] = await db
    .select({
      id: companies.id,
    })
    .from(companies)
    .where(
      and(
        eq(companies.companyCode, normalizedCompanyCode),
        eq(companies.isActive, true)
      )
    )
    .limit(1);

  if (!company) {
    throw new AppError(404, "Company not found");
  }

  const [department] = await db
    .select({
      id: departments.id,
    })
    .from(departments)
    .where(
      and(
        eq(departments.id, input.departmentId),
        eq(departments.companyId, company.id),
        eq(departments.isActive, true)
      )
    )
    .limit(1);

  if (!department) {
    throw new AppError(
      400,
      "Selected department does not belong to this company"
    );
  }

  const [existingUser] = await db
    .select({
      id: users.id,
    })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existingUser) {
    throw new AppError(409, "Email already exists");
  }

  const [existingEmployee] = await db
    .select({
      id: users.id,
    })
    .from(users)
    .where(
      and(
        eq(users.companyId, company.id),
        ilike(users.employeeId, normalizedEmployeeId)
      )
    )
    .limit(1);

  if (existingEmployee) {
    throw new AppError(
      409,
      "Employee ID already exists in this company"
    );
  }

  const passwordHash = await hashPassword(input.password);

  try {
    const [user] = await db
      .insert(users)
      .values({
        companyId: company.id,
        employeeId: normalizedEmployeeId,
        name: input.name.trim(),
        email: normalizedEmail,
        phone: input.phone,
        passwordHash,
        role: "STAFF",
        departmentId: department.id,
        designation: input.designation,
        status: "PENDING",
      })
      .returning({
        id: users.id,
        employeeId: users.employeeId,
        name: users.name,
        email: users.email,
        status: users.status,
      });

    if (input.deviceToken) {
      await db.insert(staffDevices).values({
        userId: user.id,
        tokenHash: hashDeviceToken(input.deviceToken),
        deviceName: "Unknown",
        userAgent: "",
        status: "PENDING",
      });
    }

    const [masterAdmin] = await db
      .select({
        id: users.id,
        name: users.name,
      })
      .from(users)
      .where(
        and(
          eq(users.role, "MASTER_ADMIN"),
          eq(users.companyId, company.id),
          eq(users.status, "APPROVED")
        )
      )
      .limit(1);

    return {
      ...user,
      admin: masterAdmin
        ? { id: masterAdmin.id, name: masterAdmin.name, role: "master_admin" }
        : null,
    };
  } catch (error: any) {
    if (
      error?.code === '23505' ||
      error?.cause?.code === '23505'
    ) {
      const constraint =
        error?.constraint_name ||
        error?.cause?.constraint_name ||
        '';

      if (constraint.includes('users_company_employee_unique')) {
        throw new AppError(
          409,
          "Employee ID already exists in this company"
        );
      }

      if (constraint.includes('users_email_unique')) {
        throw new AppError(409, "Email already exists");
      }

      throw new AppError(409, "Email or Employee ID already exists");
    }

    throw error;
  }
}

export async function login(input: LoginInput) {
  logger.info("Login attempt received");
  const start = performance.now();

  const [user] = await db
    .select({
      id: users.id,
      employeeId: users.employeeId,
      name: users.name,
      email: users.email,
      role: users.role,
      passwordHash: users.passwordHash,
      status: users.status,
      companyId: users.companyId,
      companyName: companies.companyName,
      companyCode: companies.companyCode,
      departmentId: users.departmentId,
      departmentName: departments.name,
      workLocationId: users.workLocationId,
      mustChangePassword: users.mustChangePassword,
      deviceResetAllowed: users.deviceResetAllowed,
      deviceResetExpiry: users.deviceResetExpiry,
    })
    .from(users)
    .leftJoin(companies, eq(users.companyId, companies.id))
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .where(eq(users.email, input.email))
    .limit(1);

  const t1 = performance.now();
  console.log(`[LOGIN] user-query: ${Math.round(t1 - start)}ms`);

  if (!user) {
    throw new AppError(401, "Invalid email or password");
  }

  const passwordMatches = await comparePassword(
    input.password,
    user.passwordHash
  );

  const t2 = performance.now();
  console.log(`[LOGIN] bcrypt: ${Math.round(t2 - t1)}ms`);

  if (!passwordMatches) {
    throw new AppError(401, "Invalid email or password");
  }

  if (user.status === "DISABLED") {
    throw new AppError(
      403,
      "Your account is currently deactivated. Please contact your administrator.",
      "ACCOUNT_DEACTIVATED"
    );
  }

  if (user.status !== "APPROVED") {
    if (
      user.role === "STAFF" &&
      (user.status === "PENDING" || user.status === "REJECTED") &&
      user.companyId
    ) {
      const [masterAdmin] = await db
        .select({
          id: users.id,
          name: users.name,
        })
        .from(users)
        .where(
          and(
            eq(users.role, "MASTER_ADMIN"),
            eq(users.companyId, user.companyId),
            eq(users.status, "APPROVED")
          )
        )
        .limit(1);

      const approver = masterAdmin
        ? { id: masterAdmin.id, name: masterAdmin.name, role: "master_admin" }
        : null;

      if (user.status === "PENDING") {
        throw new AppError(
          403,
          "Your account is pending approval.",
          "STAFF_APPROVAL_PENDING",
          {
            status: user.status,
            admin: approver,
          }
        );
      }

      if (user.status === "REJECTED") {
        throw new AppError(
          403,
          "Your account has been rejected.",
          "STAFF_ACCOUNT_REJECTED",
          {
            status: user.status,
            admin: approver,
          }
        );
      }
    }

    throw new AppError(403, "Account is not approved");
  }

  const t3 = performance.now();
  let t4 = t3;

  if (user.role === "STAFF") {
    const incomingHash = input.deviceToken
      ? hashDeviceToken(input.deviceToken)
      : null;

    const [activeDevice] = await db
      .select({
        id: staffDevices.id,
        tokenHash: staffDevices.tokenHash,
      })
      .from(staffDevices)
      .where(
        and(
          eq(staffDevices.userId, user.id),
          eq(staffDevices.status, "ACTIVE")
        )
      )
      .limit(1);

    // Allow if the current device is already the active one
    if (activeDevice && incomingHash && activeDevice.tokenHash === incomingHash) {
      // Normal login on registered device, continue
    } else if (incomingHash) {
      const now = new Date();

      const hasValidApproval =
        user.deviceResetAllowed === true &&
        user.deviceResetExpiry !== null &&
        user.deviceResetExpiry !== undefined &&
        new Date(user.deviceResetExpiry) > now;

      if (hasValidApproval) {
        // Valid admin approval window: allow new device, invalidate old device, consume approval
        await db.transaction(async (tx) => {
          if (activeDevice) {
            await tx
              .update(staffDevices)
              .set({
                status: "REVOKED",
                revokedAt: new Date(),
              })
              .where(eq(staffDevices.id, activeDevice.id));
          }

          await tx
            .insert(staffDevices)
            .values({
              userId: user.id,
              tokenHash: incomingHash,
              deviceName: "Unknown",
              userAgent: "",
              status: "ACTIVE",
              approvedAt: new Date(),
            });

          await tx
            .update(users)
            .set({
              deviceResetAllowed: false,
              deviceResetExpiry: null,
              updatedAt: new Date(),
            })
            .where(eq(users.id, user.id));
        });
      } else if (
        user.deviceResetAllowed === true &&
        (!user.deviceResetExpiry || new Date(user.deviceResetExpiry) <= now)
      ) {
        throw new AppError(
          403,
          "Device access approval expired. Please contact administrator.",
          "DEVICE_APPROVAL_EXPIRED"
        );
      } else {
        // No valid approval
        throw new AppError(
          403,
          "Device not registered. Please contact your admin for approval.",
          "STAFF_DEVICE_NOT_REGISTERED"
        );
      }
    } else {
      throw new AppError(
        403,
        "Device not registered. Please contact your admin for approval.",
        "STAFF_DEVICE_NOT_REGISTERED"
      );
    }

    t4 = performance.now();
    console.log(`[LOGIN] device-check: ${Math.round(t4 - t3)}ms`);
  } else {
    console.log(`[LOGIN] device-check: 0ms`);
  }

  const t5 = performance.now();
  const accessToken = createAccessToken({
    userId: user.id,
    companyId: user.companyId,
    role: user.role,
    departmentId: user.departmentId,
    workLocationId: user.workLocationId,
  });

  const refreshToken = createRefreshToken(user.id);

  await saveRefreshToken(
    user.id,
    refreshToken
  );

  const t6 = performance.now();
  console.log(`[LOGIN] refresh-insert: ${Math.round(t6 - t5)}ms`);
  console.log(`[LOGIN] total: ${Math.round(t6 - start)}ms`);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      employeeId: user.employeeId,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      companyName: user.companyName,
      companyCode: user.companyCode,
      departmentId: user.departmentId,
      departmentName: user.departmentName,
      mustChangePassword: user.mustChangePassword,
    },
  };
}

type AuthUser = NonNullable<AuthRequest["user"]>;

export async function getMyProfile(authUser: AuthUser) {
  const [user] = await db
    .select({
      id: users.id,
      employeeId: users.employeeId,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      status: users.status,
      designation: users.designation,
      companyId: users.companyId,
      companyName: companies.companyName,
      companyCode: companies.companyCode,
      departmentId: users.departmentId,
      departmentName: departments.name,
      mustChangePassword: users.mustChangePassword,
    })
    .from(users)
    .leftJoin(companies, eq(users.companyId, companies.id))
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .where(eq(users.id, authUser.userId))
    .limit(1);

  if (!user) {
    throw new AppError(404, "User not found");
  }

  return user;
}

export async function refreshAccessToken(
  input: RefreshInput
) {
  let payload;

  try {
    payload = verifyRefreshToken(input.refreshToken);
  } catch {
    throw new AppError(401, "Invalid refresh token");
  }

  const storedToken = await getValidRefreshToken(
    input.refreshToken
  );

  if (storedToken.userId !== payload.userId) {
    throw new AppError(401, "Invalid refresh token");
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

  if (!user) {
    throw new AppError(401, "User not found");
  }

  if (user.status === "DISABLED") {
    throw new AppError(
      403,
      "Your account has been deactivated. Please contact your administrator.",
      "ACCOUNT_DEACTIVATED"
    );
  }

  if (user.status !== "APPROVED") {
    throw new AppError(403, "Account is not active", "ACCOUNT_NOT_ACTIVE");
  }

  const accessToken = createAccessToken({
    userId: user.id,
    companyId: user.companyId,
    role: user.role,
    departmentId: user.departmentId,
    workLocationId: user.workLocationId,
  });

  return {
    accessToken,
  };
}

export async function logout(refreshToken: string) {
  await revokeRefreshToken(refreshToken);
}

export async function changePassword(
  authUser: AuthUser,
  newPassword: string
) {
  if (!validatePassword(newPassword)) {
    throw new AppError(
      400,
      "Password must be at least 8 characters and include uppercase, lowercase, number, and special character"
    );
  }

  const [user] = await db
    .select({
      id: users.id,
      status: users.status,
      role: users.role,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.id, authUser.userId))
    .limit(1);

  if (!user) {
    throw new AppError(404, "User not found");
  }

  if (user.role !== "STAFF") {
    throw new AppError(403, "Only Staff users can use this endpoint");
  }

  if (user.status !== "APPROVED") {
    throw new AppError(403, "Account is not approved");
  }

  const passwordHash = await hashPassword(newPassword);

  await db
    .update(users)
    .set({
      passwordHash,
      mustChangePassword: false,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  await revokeAllUserRefreshTokens(user.id);

  return { success: true };
}

export async function registerProgramOwner(
  input: RegisterProgramOwnerInput
) {
  const normalizedEmail = normalizeEmail(input.email);
  const normalizedEmployeeId = normalizeEmployeeId(input.employeeId);

  // Check if email already exists
  const [existingUserByEmail] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existingUserByEmail) {
    throw new AppError(409, "Email already registered");
  }

  // Check if employeeId already exists globally (for PROGRAM_OWNER)
  const [existingUserByEmployeeId] = await db
    .select({ id: users.id })
    .from(users)
    .where(ilike(users.employeeId, normalizedEmployeeId))
    .limit(1);

  if (existingUserByEmployeeId) {
    throw new AppError(409, "Employee ID already exists");
  }

  const passwordHash = await hashPassword(input.password);

  try {
    // Create PROGRAM_OWNER user
    const [user] = await db
      .insert(users)
      .values({
        companyId: null,
        departmentId: null,
        workLocationId: null,
        employeeId: normalizedEmployeeId,
        name: input.name.trim(),
        email: normalizedEmail,
        phone: input.phone,
        passwordHash,
        role: "PROGRAM_OWNER",
        status: "APPROVED",
      })
      .returning({
        id: users.id,
        employeeId: users.employeeId,
        name: users.name,
        email: users.email,
        role: users.role,
        companyId: users.companyId,
      });

    return user;
  } catch (error: any) {
    if (
      error?.code === '23505' ||
      error?.cause?.code === '23505'
    ) {
      const constraint =
        error?.constraint_name ||
        error?.cause?.constraint_name ||
        '';

      if (constraint.includes('users_email_unique')) {
        throw new AppError(409, "Email already registered");
      }

      throw new AppError(409, "Email or Employee ID already exists");
    }

    throw error;
  }
}

export async function getPublicDepartments(
  companyCode: string
) {
  const [company] = await db
    .select({
      id: companies.id,
    })
    .from(companies)
    .where(
      and(
        eq(companies.companyCode, companyCode),
        eq(companies.isActive, true)
      )
    )
    .limit(1);

  if (!company) {
    throw new AppError(404, "Company not found");
  }

  return db
    .select({
      id: departments.id,
      name: departments.name,
      code: departments.code,
    })
    .from(departments)
    .where(
      and(
        eq(departments.companyId, company.id),
        eq(departments.isActive, true)
      )
    );
}

export async function getPublicCompanies() {
  return db
    .select({
      id: companies.id,
      companyCode: companies.companyCode,
      companyName: companies.companyName,
    })
    .from(companies)
    .where(eq(companies.isActive, true));
}