import { and, eq, ilike } from "drizzle-orm";

import { db } from "../../db/connection.js";
import { companies } from "../../db/schema/companies.js";
import { departments } from "../../db/schema/departments.js";
import { users } from "../../db/schema/users.js";
import { staffDevices } from "../../db/schema/staff-devices.js";

import { AppError } from "../../utils/app-error.js";
import { hashDeviceToken } from "../../utils/device-token.js";
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
  console.log("LOGIN REQUEST:", input.email);

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
    })
    .from(users)
    .leftJoin(companies, eq(users.companyId, companies.id))
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .where(eq(users.email, input.email))
    .limit(1);

  console.log("USER FOUND:", user ? { id: user.id, email: user.email, role: user.role, status: user.status } : null);

  if (!user) {
    throw new AppError(401, "Invalid email or password");
  }

  const passwordMatches = await comparePassword(
    input.password,
    user.passwordHash
  );

  console.log("PASSWORD MATCH:", passwordMatches);

  if (!passwordMatches) {
    throw new AppError(401, "Invalid email or password");
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

    if (!activeDevice || activeDevice.tokenHash !== incomingHash) {
      if (incomingHash) {
        await db
          .insert(staffDevices)
          .values({
            userId: user.id,
            tokenHash: incomingHash,
            deviceName: "Unknown",
            userAgent: "",
            status: "PENDING",
          });
      }

      throw new AppError(
        403,
        "This device is not registered for your Staff account. Please contact your Admin to approve a device change.",
        "STAFF_DEVICE_NOT_REGISTERED"
      );
    }
  }

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

  if (user.status !== "APPROVED") {
    throw new AppError(403, "Account is not approved");
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