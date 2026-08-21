import { z } from "zod";

export const createAdminSchema = z.object({
  employeeId: z.string().trim().min(1),
  name: z.string().trim().min(2).max(150),
  email: z.string().trim().email(),
  phone: z.string().trim().min(7).max(30).optional(),
  password: z.string().min(8),
  departmentId: z.string().uuid(),
  designation: z.string().trim().max(100).optional(),
});
export type CreateAdminInput =
  z.infer<typeof createAdminSchema>;

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().min(1).max(30),
});

export type CreateDepartmentInput =
  z.infer<typeof createDepartmentSchema>;