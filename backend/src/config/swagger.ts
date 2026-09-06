import swaggerJSDoc from "swagger-jsdoc";

const productionServer =
  process.env.API_BASE_URL || "https://staffattendance-api.onrender.com";

const jsonBody = (schema: Record<string, unknown>) => ({
  required: true,
  content: {
    "application/json": { schema },
  },
});

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

const responses = {
  200: { description: "Success" },
  400: { description: "Validation error" },
  401: { description: "Unauthorized" },
  403: { description: "Forbidden" },
  404: { description: "Not found" },
  409: { description: "Conflict" },
  500: { description: "Server error" },
};

const operation = (
  tag: string,
  summary: string,
  options: {
    auth?: boolean;
    parameters?: Record<string, unknown>[];
    requestBody?: Record<string, unknown>;
    responseContent?: Record<string, unknown>;
    successCode?: 200 | 201;
  } = {}
) => {
  const operationResponses: Record<string, unknown> = {
    ...responses,
  };
  if (options.successCode === 201) {
    delete operationResponses["200"];
    operationResponses["201"] = { description: "Created" };
  }
  if (options.responseContent) {
    operationResponses[String(options.successCode || 200)] = {
      description: options.successCode === 201 ? "Created" : "Success",
      content: options.responseContent,
    };
  }

  return {
    tags: [tag],
    summary,
    ...(options.auth === false ? {} : { security: [{ BearerAuth: [] }] }),
    ...(options.parameters ? { parameters: options.parameters } : {}),
    ...(options.requestBody ? { requestBody: options.requestBody } : {}),
    responses: operationResponses,
  };
};

const pathParameter = (name: string) => ({
  name,
  in: "path",
  required: true,
  schema: { type: "string" },
});

const queryParameter = (
  name: string,
  type: "string" | "integer" = "string",
  required = false
) => ({
  name,
  in: "query",
  required,
  schema: { type },
});

const paths: Record<string, Record<string, unknown>> = {
  "/": {
    get: operation("System", "Check API status", { auth: false }),
  },
  "/api/health": {
    get: operation("System", "Check API health", { auth: false }),
  },
  "/api/auth/register": {
    post: operation("Auth", "Register staff", {
      auth: false,
      successCode: 201,
      requestBody: jsonBody(ref("RegisterStaff")),
    }),
  },
  "/api/auth/departments": {
    get: operation("Departments", "List public departments", {
      auth: false,
      parameters: [queryParameter("companyCode", "string", true)],
    }),
  },
  "/api/auth/companies": {
    get: operation("Companies", "List public companies", { auth: false }),
  },
  "/api/auth/me": {
    get: operation("Auth", "Get the authenticated user's profile"),
  },
  "/api/auth/login": {
    post: operation("Auth", "Authenticate a user", {
      auth: false,
      requestBody: jsonBody(ref("Login")),
    }),
  },
  "/api/auth/refresh": {
    post: operation("Auth", "Refresh an access token", {
      auth: false,
      requestBody: jsonBody(ref("RefreshToken")),
    }),
  },
  "/api/auth/logout": {
    post: operation("Auth", "Log out and revoke a refresh token", {
      auth: false,
      requestBody: jsonBody(ref("RefreshToken")),
    }),
  },
  "/api/auth/program-owner/register": {
    post: operation("Auth", "Register a program owner", {
      auth: false,
      successCode: 201,
      requestBody: jsonBody(ref("RegisterProgramOwner")),
    }),
  },
  "/api/auth/change-password": {
    post: operation("Auth", "Change the authenticated user's password", {
      requestBody: jsonBody({
        type: "object",
        required: ["newPassword"],
        properties: { newPassword: { type: "string" } },
      }),
    }),
  },
  "/api/attendance/clock-in": {
    post: operation("Attendance", "Clock in", {
      requestBody: jsonBody(ref("ClockIn")),
      successCode: 201,
    }),
  },
  "/api/attendance/clock-out": {
    post: operation("Attendance", "Clock out", {
      requestBody: jsonBody(ref("ClockOut")),
    }),
  },
  "/api/attendance/current-session": {
    get: operation("Attendance", "Get the current attendance session"),
  },
  "/api/attendance/history": {
    get: operation("Attendance", "List attendance history", {
      parameters: [
        queryParameter("reportType"), queryParameter("date"), queryParameter("month"),
        queryParameter("year"), queryParameter("startDate"), queryParameter("endDate"),
        queryParameter("page", "integer"), queryParameter("limit", "integer"),
      ],
    }),
  },
  "/api/attendance/history/export": {
    get: operation("Attendance", "Export attendance history as CSV", {
      parameters: [
        queryParameter("reportType"), queryParameter("date"), queryParameter("month"),
        queryParameter("year"), queryParameter("startDate"), queryParameter("endDate"),
        queryParameter("timezone"),
      ],
      responseContent: { "text/csv": { schema: { type: "string" } } },
    }),
  },
  "/api/attendance/summary": {
    get: operation("Attendance", "Get attendance summary"),
  },
  "/api/admin/staff": {
    get: operation("Staff", "List staff for the authenticated company"),
  },
  "/api/admin/attendance": {
    get: operation("Attendance", "List company attendance", {
      parameters: [
        queryParameter("reportType"), queryParameter("date"), queryParameter("month"),
        queryParameter("year"), queryParameter("startDate"), queryParameter("endDate"),
        queryParameter("employeeId"), queryParameter("page", "integer"), queryParameter("limit", "integer"),
      ],
    }),
  },
  "/api/admin/attendance/export": {
    get: operation("Attendance", "Export company attendance as CSV", {
      parameters: [
        queryParameter("reportType"), queryParameter("date"), queryParameter("month"),
        queryParameter("year"), queryParameter("startDate"), queryParameter("endDate"),
        queryParameter("employeeId"), queryParameter("timezone"),
      ],
      responseContent: { "text/csv": { schema: { type: "string" } } },
    }),
  },
  "/api/admin/deleted-staff": {
    get: operation("Staff", "List deleted staff"),
  },
  "/api/admin/deleted-staff/{employeeId}/attendance": {
    get: operation("Attendance", "List deleted staff attendance", { parameters: [pathParameter("employeeId")] }),
    delete: operation("Attendance", "Permanently delete deleted staff attendance", { parameters: [pathParameter("employeeId")] }),
  },
  "/api/admin/pending-staff": {
    get: operation("Staff", "List pending staff", { }),
  },
  "/api/admin/staff/{id}/approve": {
    patch: operation("Staff", "Approve staff", { parameters: [pathParameter("id")] }),
  },
  "/api/admin/staff/{id}/reject": {
    patch: operation("Staff", "Reject staff", { parameters: [pathParameter("id")] }),
  },
  "/api/admin/staff/{id}/activate": {
    patch: operation("Staff", "Activate staff", { parameters: [pathParameter("id")] }),
  },
  "/api/admin/staff/{id}/deactivate": {
    patch: operation("Staff", "Deactivate staff", { parameters: [pathParameter("id")] }),
  },
  "/api/admin/staff/{id}": {
    delete: operation("Staff", "Delete a staff account", { parameters: [pathParameter("id")] }),
  },
  "/api/admin/staff/{id}/reset-password": {
    patch: operation("Staff", "Reset a staff password", {
      parameters: [pathParameter("id")],
      requestBody: jsonBody({ type: "object", required: ["temporaryPassword"], properties: { temporaryPassword: { type: "string" } } }),
    }),
  },
  "/api/admin/staff/{id}/reset-device": {
    patch: operation("Staff", "Reset staff device access", { parameters: [pathParameter("id")] }),
  },
  "/api/admin/attendance/records": {
    delete: operation("Attendance", "Permanently delete selected attendance records", {
      requestBody: jsonBody({ type: "object", required: ["attendanceIds"], properties: { attendanceIds: { type: "array", items: { type: "string" } } } }),
    }),
  },
  "/api/admin/attendance/summary": {
    get: operation("Attendance", "Get company attendance summary"),
  },
  "/api/admin/dashboard": {
    get: operation("Admin", "Get admin dashboard statistics"),
  },
  "/api/master-admin/departments": {
    get: operation("Departments", "List departments"),
    post: operation("Departments", "Create a department", { successCode: 201, requestBody: jsonBody(ref("Department")) }),
  },
  "/api/master-admin/admins": {
    get: operation("Admin", "List administrators"),
    post: operation("Admin", "Create an administrator", { successCode: 201, requestBody: jsonBody(ref("CreateAdmin")) }),
  },
  "/api/master-admin/departments/{id}": {
    delete: operation("Departments", "Delete a department", { parameters: [pathParameter("id")] }),
  },
  "/api/master-admin/admins/{id}": {
    patch: operation("Admin", "Update an administrator", { parameters: [pathParameter("id")], requestBody: jsonBody(ref("UpdateUser")) }),
    delete: operation("Admin", "Delete an administrator", { parameters: [pathParameter("id")] }),
  },
  "/api/master-admin/admins/{id}/activate": {
    patch: operation("Admin", "Activate an administrator", { parameters: [pathParameter("id")] }),
  },
  "/api/master-admin/admins/{id}/deactivate": {
    patch: operation("Admin", "Deactivate an administrator", { parameters: [pathParameter("id")] }),
  },
  "/api/master-admin/attendance": {
    get: operation("Attendance", "List Master Admin attendance", {
      parameters: [
        queryParameter("reportType"), queryParameter("date"), queryParameter("month"),
        queryParameter("year"), queryParameter("startDate"), queryParameter("endDate"),
        queryParameter("departmentId"), queryParameter("employeeId"), queryParameter("page", "integer"), queryParameter("limit", "integer"),
      ],
    }),
  },
  "/api/master-admin/attendance/{attendanceId}/time": {
    put: operation("Attendance", "Correct attendance clock times", {
      parameters: [pathParameter("attendanceId")],
      requestBody: jsonBody(ref("UpdateAttendanceTime")),
    }),
  },
  "/api/master-admin/staff-data": {
    delete: operation("Master Admin", "Delete staff data", { requestBody: jsonBody(ref("StaffDataFilter")) }),
  },
  "/api/master-admin/staff-data/preview": {
    get: operation("Master Admin", "Preview staff data deletion", {
      parameters: [queryParameter("companyId"), queryParameter("departmentId"), queryParameter("employeeId"), queryParameter("dateStart"), queryParameter("dateEnd")],
    }),
  },
  "/api/master-admin/attendance-records/preview": {
    get: operation("Attendance", "Preview attendance deletion", {
      parameters: [queryParameter("companyId"), queryParameter("departmentId"), queryParameter("employeeId"), queryParameter("startDate"), queryParameter("endDate")],
    }),
  },
  "/api/master-admin/attendance-records": {
    delete: operation("Attendance", "Delete attendance records", { requestBody: jsonBody(ref("AttendanceFilter")) }),
  },
  "/api/master-admin/attendance/export": {
    get: operation("Attendance", "Export Master Admin attendance as CSV", {
      parameters: [
        queryParameter("reportType"), queryParameter("date"), queryParameter("month"), queryParameter("year"),
        queryParameter("startDate"), queryParameter("endDate"), queryParameter("departmentId"), queryParameter("employeeId"), queryParameter("timezone"),
      ],
      responseContent: { "text/csv": { schema: { type: "string" } } },
    }),
  },
  "/api/master-admin/attendance/summary": {
    get: operation("Attendance", "Get Master Admin attendance summary"),
  },
  "/api/master-admin/staff/pending": {
    get: operation("Staff", "List pending staff"),
  },
  "/api/master-admin/staff/approved": {
    get: operation("Staff", "List approved staff"),
  },
  "/api/master-admin/staff/{id}/approve": {
    patch: operation("Staff", "Approve staff", { parameters: [pathParameter("id")] }),
  },
  "/api/master-admin/staff/{id}/reject": {
    patch: operation("Staff", "Reject staff", { parameters: [pathParameter("id")] }),
  },
  "/api/master-admin/staff/{id}/activate": {
    patch: operation("Staff", "Activate staff", { parameters: [pathParameter("id")] }),
  },
  "/api/master-admin/staff/{id}/deactivate": {
    patch: operation("Staff", "Deactivate staff", { parameters: [pathParameter("id")] }),
  },
  "/api/master-admin/staff/{id}": {
    patch: operation("Staff", "Update staff", { parameters: [pathParameter("id")], requestBody: jsonBody(ref("UpdateStaff")) }),
  },
  "/api/master-admin/staff/permanent": {
    delete: operation("Staff", "Permanently delete selected staff", { requestBody: jsonBody(ref("DeleteStaff")) }),
  },
  "/api/master-admin/dashboard": {
    get: operation("Master Admin", "Get Master Admin dashboard statistics"),
  },
  "/api/program-owner/master-admins": {
    get: operation("Admin", "List Master Admins"),
    post: operation("Admin", "Create a Master Admin", { auth: true, successCode: 201, requestBody: jsonBody(ref("CreateMasterAdmin")) }),
  },
  "/api/program-owner/master-admins/{id}/activate": {
    patch: operation("Admin", "Activate a Master Admin", { parameters: [pathParameter("id")] }),
  },
  "/api/program-owner/master-admins/{id}/deactivate": {
    patch: operation("Admin", "Deactivate a Master Admin", { parameters: [pathParameter("id")] }),
  },
  "/api/program-owner/master-admins/{id}": {
    delete: operation("Admin", "Delete a Master Admin", { parameters: [pathParameter("id")] }),
  },
  "/api/program-owner/companies": {
    get: operation("Companies", "List managed companies"),
  },
  "/api/program-owner/companies/{companyId}": {
    get: operation("Companies", "Get company details", { parameters: [pathParameter("companyId")] }),
    delete: operation("Companies", "Delete a company", { parameters: [pathParameter("companyId")] }),
  },
  "/api/webauthn/credentials": {
    get: operation("Biometric", "Check biometric credentials"),
  },
  "/api/webauthn/register/options": {
    post: operation("Biometric", "Generate biometric registration options"),
  },
  "/api/webauthn/register/verify": {
    post: operation("Biometric", "Verify biometric registration", { requestBody: jsonBody(ref("WebAuthnRegistration")) }),
  },
  "/api/webauthn/authenticate/options": {
    post: operation("Biometric", "Generate biometric authentication options"),
  },
  "/api/webauthn/authenticate/verify": {
    post: operation("Biometric", "Verify biometric authentication", { requestBody: jsonBody(ref("WebAuthnAuthentication")) }),
  },
  "/api/clinical-reports": {
    get: operation("Clinical Reports", "List clinical reports"),
    post: operation("Clinical Reports", "Create a clinical report", { successCode: 201, requestBody: jsonBody(ref("ClinicalReportInput")) }),
  },
  "/api/clinical-reports/{id}": {
    get: operation("Clinical Reports", "Get a clinical report", { parameters: [pathParameter("id")] }),
    put: operation("Clinical Reports", "Update a clinical report", { parameters: [pathParameter("id")], requestBody: jsonBody(ref("ClinicalReportInput")) }),
  },
  "/api/clinical-reports/bulk": {
    delete: operation("Clinical Reports", "Permanently delete selected clinical reports", { requestBody: jsonBody(ref("DeleteClinicalReports")) }),
  },
  "/api/clinical-reports/{id}/pdf": {
    get: operation("Clinical Reports", "Download a clinical report PDF", { parameters: [pathParameter("id")], responseContent: { "application/pdf": { schema: { type: "string", format: "binary" } } } }),
  },
  "/api/clinical-reports/{id}/docx": {
    get: operation("Clinical Reports", "Download a clinical report DOCX", { parameters: [pathParameter("id")], responseContent: { "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { schema: { type: "string", format: "binary" } } } }),
  },
};

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Staff Attendance API",
    description: "API documentation for Staff Attendance Management System",
    version: "1.0.0",
  },
  servers: [
    { url: "http://localhost:5000", description: "Local development" },
    { url: productionServer, description: "Production" },
  ],
  tags: [
    { name: "System" }, { name: "Auth" }, { name: "Companies" }, { name: "Departments" },
    { name: "Staff" }, { name: "Admin" }, { name: "Master Admin" }, { name: "Attendance" },
    { name: "Clinical Reports" }, { name: "Biometric" },
  ],
  components: {
    securitySchemes: {
      BearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      Login: { type: "object", required: ["email", "password"], properties: { email: { type: "string", format: "email" }, password: { type: "string" }, deviceToken: { type: "string" } } },
      RefreshToken: { type: "object", required: ["refreshToken"], properties: { refreshToken: { type: "string" } } },
      RegisterStaff: { type: "object", required: ["companyCode", "employeeId", "name", "email", "password", "departmentId"], properties: { companyCode: { type: "string" }, employeeId: { type: "string" }, name: { type: "string", minLength: 2, maxLength: 150 }, email: { type: "string", format: "email" }, phone: { type: "string" }, password: { type: "string", minLength: 8 }, departmentId: { type: "string", format: "uuid" }, designation: { type: "string" }, deviceToken: { type: "string" } } },
      RegisterProgramOwner: { type: "object", required: ["employeeId", "name", "email", "password"], properties: { employeeId: { type: "string" }, name: { type: "string" }, email: { type: "string", format: "email" }, password: { type: "string", minLength: 8 }, phone: { type: "string" } } },
      ClockIn: { type: "object", required: ["latitude", "longitude", "accuracy", "assignedTask"], properties: { latitude: { type: "number" }, longitude: { type: "number" }, accuracy: { type: "number" }, method: { type: "string" }, assignedTask: { type: "string", maxLength: 500 } } },
      ClockOut: { type: "object", required: ["latitude", "longitude", "accuracy"], properties: { latitude: { type: "number" }, longitude: { type: "number" }, accuracy: { type: "number" }, method: { type: "string" } } },
      Department: { type: "object", required: ["name", "code"], properties: { name: { type: "string", minLength: 2, maxLength: 100 }, code: { type: "string", minLength: 1, maxLength: 30 } } },
      CreateAdmin: { type: "object", required: ["employeeId", "name", "email", "password", "departmentId"], properties: { employeeId: { type: "string" }, name: { type: "string" }, email: { type: "string", format: "email" }, password: { type: "string", minLength: 8 }, departmentId: { type: "string", format: "uuid" }, phone: { type: "string" }, designation: { type: "string" } } },
      UpdateUser: { type: "object", required: ["name"], properties: { name: { type: "string", minLength: 2, maxLength: 150 }, phone: { type: "string" }, designation: { type: "string" } } },
      UpdateStaff: { type: "object", required: ["employeeId", "name"], properties: { employeeId: { type: "string" }, name: { type: "string" }, phone: { type: "string" }, designation: { type: "string" } } },
      CreateMasterAdmin: { type: "object", required: ["employeeId", "name", "email", "password", "companyCode", "companyName"], properties: { employeeId: { type: "string" }, name: { type: "string" }, email: { type: "string", format: "email" }, password: { type: "string", minLength: 8 }, companyCode: { type: "string" }, companyName: { type: "string" }, phone: { type: "string" } } },
      UpdateAttendanceTime: { type: "object", properties: { clockIn: { type: "string", pattern: "^([01]\\d|2[0-3]):([0-5]\\d)$" }, clockOut: { type: ["string", "null"], pattern: "^([01]\\d|2[0-3]):([0-5]\\d)$" } } },
      ClinicalReportInput: { type: "object", required: ["unitLocation", "monitoringDateTime", "trainees"], properties: { unitLocation: { type: "string", maxLength: 200 }, monitoringDateTime: { type: "string" }, language: { type: "string", enum: ["en", "ms"] }, trainees: { type: "array", minItems: 1, items: { $ref: "#/components/schemas/ReportTrainee" } } } },
      ReportTrainee: { type: "object", required: ["traineeName"], properties: { traineeName: { type: "string", maxLength: 150 }, group: { type: "string", maxLength: 100 }, monitoringObjective: { type: "string", maxLength: 2000 }, teachingLearningActivities: { type: "string", maxLength: 4000 }, clinicalPracticeRecordBook: { type: "string", maxLength: 4000 }, disciplineTraineeWelfareDiscussion: { type: "string", maxLength: 4000 } } },
      DeleteClinicalReports: { type: "object", required: ["reportIds"], properties: { reportIds: { type: "array", minItems: 1, items: { type: "string", format: "uuid" } } } },
      DeleteStaff: { type: "object", required: ["staffIds"], properties: { staffIds: { type: "array", minItems: 1, items: { type: "string", format: "uuid" } } } },
      StaffDataFilter: { type: "object", required: ["companyId"], properties: { companyId: { type: "string", format: "uuid" }, departmentId: { type: "string", format: "uuid" }, employeeId: { type: "string" }, dateStart: { type: "string", format: "date" }, dateEnd: { type: "string", format: "date" } } },
      AttendanceFilter: { type: "object", required: ["companyId"], properties: { companyId: { type: "string", format: "uuid" }, departmentId: { type: "string", format: "uuid" }, employeeId: { type: "string" }, startDate: { type: "string", format: "date" }, endDate: { type: "string", format: "date" } } },
      WebAuthnRegistration: { type: "object", additionalProperties: true },
      WebAuthnAuthentication: { type: "object", required: ["id"], additionalProperties: true, properties: { id: { type: "string" } } },
    },
  },
  paths,
};

export const swaggerSpec = swaggerJSDoc({
  definition: swaggerDefinition,
  apis: [],
});
