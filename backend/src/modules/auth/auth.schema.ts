import { z } from "zod";

export const registerSchema = z.object({
  companyCode: z.string().trim().min(1),
  employeeId: z.string().trim().min(1),
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  phone: z.string().trim().min(7).max(30),
  password: z.string().min(8),
  departmentId: z.string().uuid(),
  designation: z.string().trim().max(100).optional(),
  deviceToken: z.string().trim().min(32).optional(),
});

export const registerProgramOwnerSchema = z.object({
  employeeId: z.string().trim().min(1),
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  phone: z.string().trim().min(7).max(30).optional(),
  password: z.string().min(8),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  deviceToken: z.string().trim().min(32).optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().trim().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type RegisterProgramOwnerInput = z.infer<typeof registerProgramOwnerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export const logoutSchema = z.object({
  refreshToken: z.string().trim().min(1),
});

export type LogoutInput = z.infer<typeof logoutSchema>;