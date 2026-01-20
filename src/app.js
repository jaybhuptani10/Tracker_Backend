import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import "./jobs/reminder.job.js"; // Start Cron Jobs

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
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

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

app.use("/user", userRouter);
app.use("/tasks", taskRouter);
app.use("/work-session", workSessionRouter);
app.use("/habits", habitRouter);
import analyticsRouter from "./routes/analytics.routes.js";
app.use("/analytics", analyticsRouter);

app.use("/", (req, res) => {
  res.json("Hell");
});

export default app;
