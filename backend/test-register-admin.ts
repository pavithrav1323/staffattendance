import { registerStaff } from "./src/modules/auth/auth.service.ts";

async function test() {
  try {
    const result = await registerStaff({
      companyCode: "ASSN001",
      employeeId: "TESTEMP999",
      name: "Test Staff",
      email: "teststaff999@example.com",
      phone: "+60123456789",
      password: "Test@1234",
      departmentId: "e5282622-aa84-47ba-964b-ffc8de3d3131",
      designation: "Tester",
    });

    console.log("Registration result:", JSON.stringify(result, null, 2));

    const adminName = result.admin?.name ?? null;
    console.log("Admin name:", adminName);
  } catch (error: any) {
    console.error("Registration error:", error.message);
  }
}

test();
