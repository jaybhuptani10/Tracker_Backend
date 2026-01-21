import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
const app = express();

const allowedOrigins = [
  "https://duotrack.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`Blocked by CORS: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Only run cron jobs if NOT in Vercel environment (Serverless functions shouldn't run persistent cron)
if (!process.env.VERCEL) {
  import("./jobs/reminder.job.js");
}

// Debug Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

import userRouter from "./routes/user.routes.js";
import taskRouter from "./routes/task.routes.js";
import workSessionRouter from "./routes/workSession.routes.js";
import habitRouter from "./routes/habit.routes.js";
import noteRouter from "./routes/note.routes.js";
import expenseRouter from "./routes/expense.routes.js";

// Routes declaration
app.use("/user", userRouter);
app.use("/tasks", taskRouter);
app.use("/habits", habitRouter);
app.use("/work-session", workSessionRouter);
app.use("/notes", noteRouter);
app.use("/expenses", expenseRouter);
import analyticsRouter from "./routes/analytics.routes.js";
app.use("/analytics", analyticsRouter);

// Health check route - MUST be after other routes to avoid shadowing
app.use("/", (req, res) => {
  res.json("Hell");
});

export default app;
