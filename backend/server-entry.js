require("dotenv").config({ path: require("path").join(__dirname, ".env"), override: true });

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const helmet = require("helmet");
const compression = require("compression");
const http = require("http");
const passport = require("./config/passport");
const { protect, requireRole } = require("./middleware/authMiddleware");
const { getExecutionDebug } = require("./controllers/executionController");
const { scheduleNightlySync } = require("./jobs/syncProblems");
const { startImportWorker } = require("./services/importQueue");
const { initSocket } = require("./socket");
const { startCompetitiveTestLifecycle } = require("./services/competitiveTestLifecycle");
const studyGroupRoutes = require("./modules/studyGroupGemini");

const routes = {
  auth: require("./routes/authRoutes"),
  dashboard: require("./routes/dashboardRoutes"),
  problems: require("./routes/problemRoutes"),
  submissions: require("./routes/submissionRoutes"),
  execution: require("./routes/executionRoutes"),
  discussions: require("./routes/discussionRoutes"),
  solutions: require("./routes/solutionRoutes"),
  leaderboard: require("./routes/leaderBoardRoutes"),
  questions: require("./routes/companyQuestionRoutes"),
  sheets: require("./routes/SheetRoutes"),
  imports: require("./routes/importRoutes"),
  streak: require("./routes/streakRoutes"),
  gamification: require("./routes/gamificationRoutes"),
  aptitude: require("./routes/aptitudeRoutes"),
  directMessages: require("./routes/directMessageRoutes"),
  notifications: require("./routes/notificationRoutes"),
  profile: require("./routes/profileRoutes"),
  mockInterviews: require("./routes/mockInterviewRoutes"),
};

const app = express();
const httpServer = http.createServer(app);
const io = initSocket(httpServer);

app.locals.io = io;

const configuredClientUrl = process.env.CLIENT_URL || "http://localhost:5173";
const allowedClientOrigins = new Set([configuredClientUrl, "http://localhost:5173", "http://127.0.0.1:5173"]);

app.set("trust proxy", 1);
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: (origin, callback) => callback(null, !origin || allowedClientOrigins.has(origin)),
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || "codeverse-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 24 * 60 * 60 * 1000,
  },
}));
app.use(passport.initialize());
app.use(passport.session());
app.use("/api/study-groups", studyGroupRoutes);

app.use("/api/auth", routes.auth);
app.use("/api/dashboard", routes.dashboard);
app.use("/api/problems", routes.problems);
app.use("/api/submissions", routes.submissions);
app.use("/api/execution", routes.execution);
app.use("/api/problems/:problemId/discussions", routes.discussions);
app.use("/api/problems/:problemId/solutions", routes.solutions);
app.use("/api/leaderboard", routes.leaderboard);
app.use("/api/questions", routes.questions);
app.use("/api/sheets", routes.sheets);
app.use("/api/import", routes.imports);
app.use("/api/streak", routes.streak);
app.use("/api/gamification", routes.gamification);
app.use("/api/aptitude", routes.aptitude);
app.use("/api/direct-messages", routes.directMessages);
app.use("/api/messages", routes.directMessages);
app.use("/api/notifications", routes.notifications);
app.use("/api/profile", routes.profile);
app.use("/api/mock-interviews", routes.mockInterviews);
app.get("/api/debug/execution/:id", protect, requireRole("admin"), getExecutionDebug);
app.get("/api/health", (req, res) => {
  const databaseStates = ["disconnected", "connected", "connecting", "disconnecting"];
  const database = databaseStates[mongoose.connection.readyState] || "unknown";
  const healthy = database === "connected";
  return res.status(healthy ? 200 : 503).json({
    success: healthy,
    service: "codeverse-api",
    database,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});
app.get("/", (req, res) => res.status(200).json({ success: true, message: "CodeVerse API 🚀" }));
app.use((req, res) => res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === "production" ? "Internal Server Error" : err.message,
  });
});

const port = Number(process.env.PORT || 5001);
let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Shutting down backend (${signal})...`);

  try {
    await new Promise((resolve) => {
      if (!httpServer.listening) return resolve();
      httpServer.close(() => resolve());
    });
    await mongoose.disconnect();
  } catch (error) {
    console.error("Backend shutdown warning:", error.message);
  } finally {
    process.exit(0);
  }
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

async function startServer() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing. Add it to backend/.env before starting the server.");
  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  console.log("MongoDB Connected ✅");
  await startImportWorker();
  await scheduleNightlySync();
  await startCompetitiveTestLifecycle(io);
  httpServer.listen(port, "127.0.0.1", () => console.log(`Server running on port ${port} ✅`));
}

startServer().catch((error) => {
  console.error("Backend startup failed:", error);
  mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
