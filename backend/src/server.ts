import "dotenv/config";
import express from "express";
import cors from "cors";
import attendanceRoutes from "./routes/attendance.routes.js";
import { authenticateToken } from "./middleware/auth.middleware.js";
import { errorHandler } from "./middleware/error.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import masterAdminRoutes from "./routes/master-admin.routes.js";
import programOwnerRoutes from "./routes/program-owner.routes.js";
import webauthnRoutes from "./routes/webauthn.routes.js";

const app = express();

const PORT = 5000;

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://192.168.1.42:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://192.168.1.42:5174",
  process.env.FRONTEND_URL,
]);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Staff Tracker Geo API is running",
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    status: "healthy",
  });
});

// Attendance routes with authentication
app.use("/api/attendance", authenticateToken, attendanceRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/master-admin", masterAdminRoutes);
app.use("/api/program-owner", programOwnerRoutes);
app.use("/api/webauthn", webauthnRoutes);
app.use(errorHandler);


app.listen(PORT, "0.0.0.0", () => {
  console.log(`Staff Tracker Geo API running on http://0.0.0.0:${PORT}`);
});


