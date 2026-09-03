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

export const updateAttendanceTimeSchema = z.object({
  clockIn: z
    .string()
    .regex(
      /^([01]\d|2[0-3]):([0-5]\d)$/,
      "Invalid clockIn time format. Expected HH:MM"
    )
    .optional(),
  clockOut: z
    .string()
    .regex(
      /^([01]\d|2[0-3]):([0-5]\d)$/,
      "Invalid clockOut time format. Expected HH:MM"
    )
    .or(z.literal(""))
    .or(z.null())
    .optional(),
  timezone: z.string().optional(),
});

export type UpdateAttendanceTimeInput =
  z.infer<typeof updateAttendanceTimeSchema>;

export const deleteStaffDataSchema = z.object({
  companyId: z.string().uuid(),
  departmentId: z.string().uuid().optional(),
  employeeId: z.string().trim().min(1).optional(),
  dateStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Expected YYYY-MM-DD")
    .optional(),
  dateEnd: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Expected YYYY-MM-DD")
    .optional(),
});

export type DeleteStaffDataInput =
  z.infer<typeof deleteStaffDataSchema>;

export const deleteAttendanceRecordsSchema = z.object({
  companyId: z.string().uuid(),
  departmentId: z.string().uuid().optional(),
  employeeId: z.string().trim().min(1).optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Expected YYYY-MM-DD")
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Expected YYYY-MM-DD")
    .optional(),
});

export type DeleteAttendanceRecordsInput =
  z.infer<typeof deleteAttendanceRecordsSchema>;

export const deleteStaffIdsSchema = z.object({
  staffIds: z.array(z.string().uuid()).min(1, "At least one staff ID is required"),
});

export type DeleteStaffIdsInput =
  z.infer<typeof deleteStaffIdsSchema>;

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(150),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  designation: z.string().trim().max(100).optional().or(z.literal("")),
});

export type UpdateUserInput =
  z.infer<typeof updateUserSchema>;