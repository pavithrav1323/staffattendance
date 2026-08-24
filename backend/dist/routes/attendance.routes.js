import { Router } from "express";
import { clockIn, clockOut, exportAttendanceHistory, getAttendanceHistory, getAttendanceSummary, getCurrentSession, } from "../controllers/attendance.controller.js";
const router = Router();
router.post("/clock-in", clockIn);
router.post("/clock-out", clockOut);
router.get("/current-session", getCurrentSession);
router.get("/history", getAttendanceHistory);
router.get("/history/export", exportAttendanceHistory);
router.get("/summary", getAttendanceSummary);
export default router;
//# sourceMappingURL=attendance.routes.js.map