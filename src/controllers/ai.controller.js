import asyncHandler from "../utils/asynchandler.js";
import { ApiResponse } from "../utils/apiresponse.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Task } from "../models/task.model.js";
import { Habit } from "../models/habit.model.js";
import userModel from "../models/user.model.js";

// Initialize Gemini (Safe Fallback if key missing)
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.log(
    "⚠️ GEMINI_API_KEY is missing in environment variables. using fallback logic.",
  );
} else {
  console.log("✅ Gemini AI initialized with Key.");
}

// Simple in-memory cache to prevent 429 Rate Limits
// Structure: { userId: { data: object, timestamp: number } }
const insightCache = {};

console.log("Gemini API Key Status:", apiKey ? "Present" : "Missing");
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

const getInsights = asyncHandler(async (req, res) => {
  const { id } = req.user;

  // 1. Check Cache (valid for 1 hour)
  const cached = insightCache[id];
  const ONE_HOUR = 60 * 60 * 1000;
  if (cached && Date.now() - cached.timestamp < ONE_HOUR) {
    return res
      .status(200)
      .json(new ApiResponse(true, "Insight fetched from cache", cached.data));
  }

  // 1. Fetch User & Partner Data
  const user = await userModel.findById(id).select("name partnerId");
  let partner = null;
  if (user.partnerId) {
    partner = await userModel.findById(user.partnerId).select("name");
  }

  // Fetch last 7 days of tasks
  const today = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 7);

  const tasks = await Task.find({
    $or: [{ userId: id }, { userId: user.partnerId }],
    date: { $gte: sevenDaysAgo },
  });

  const habits = await Habit.find({
    userId: id,
  });

  // Calculate Stats
  const userTasks = tasks.filter((t) => t.userId.toString() === id);
  const partnerTasks = partner
    ? tasks.filter((t) => t.userId.toString() === user.partnerId.toString())
    : [];

  const userCompleted = userTasks.filter((t) => t.isCompleted).length;
  const partnerCompleted = partnerTasks.filter((t) => t.isCompleted).length;

  const topCategory =
    userTasks
      .filter((t) => t.isCompleted)
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + 1;
        return acc;
      }, {}) || {};

  const bestCategory = Object.keys(topCategory).reduce(
    (a, b) => (topCategory[a] > topCategory[b] ? a : b),
    "General",
  );

  // 2. Mock AI Logic (Fallback)
  let insight = {
    summary: "You are doing great! Keep tracking your tasks consistently.",
    tip: "Try scheduling your hardest tasks for the morning.",
    mood: "Happy",
  };

  // 3. Real AI Logic (If Key Exists)
  if (genAI) {
    try {
      // User has access to specific latest aliases
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

      const prompt = `
        Act as a friendly, slightly witty relationship & productivity coach called "DuoCoach".
        Analyze this data for a couple, ${user.name} and ${partner ? partner.name : "their hypothetical partner"}.
        
        Data (Last 7 Days):
        - ${user.name}: Completed ${userCompleted}/${userTasks.length} tasks. Best Category: ${bestCategory}.
        - ${partner ? partner.name : "Partner"}: Completed ${partnerCompleted}/${partnerTasks.length} tasks.
        - Common Habits maintained: ${habits.length}.

        Generate a JSON response with:
        1. "summary": A 2-sentence encouraging summary of their week. Mention specific numbers or categories.
        2. "tip": A 1-sentence fun or practical tip to improve their synergy or individual productivity.
        3. "mood": One word emotion (e.g. "On Fire", "Steady", "Needs Love", "Power Couple").

        Return ONLY raw JSON, no markdown formatting.
      `;

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      // Clean up markdown code blocks if present
      const cleanedText = text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      insight = JSON.parse(cleanedText);

      // Save to Cache
      insightCache[id] = { data: insight, timestamp: Date.now() };
    } catch (error) {
      console.error("AI Generation Failed, using fallback:", error);
    }
  } else {
    // Enhanced Fallback Logic
    if (userCompleted > 5 && partnerCompleted > 5) {
      insight.summary = `Wow, power couple alert! both of you crushed ${userCompleted + partnerCompleted} tasks this week.`;
      insight.tip = "Celebrate with a movie night or a shared treat!";
      insight.mood = "Power Couple";
    } else if (userCompleted > 5) {
      insight.summary = `You are carrying the team this week with ${userCompleted} tasks done!`;
      insight.tip = `Maybe nudge ${partner ? partner.name : "your partner"} to help them catch up?`;
      insight.mood = "Leading";
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(true, "Insight generated", insight));
});

const parseTask = asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json(new ApiResponse(false, "Text is required"));
  }

  // Fallback if no API key
  if (!genAI) {
    return res.status(200).json(
      new ApiResponse(true, "Fallback parsing", {
        content: text,
        category: "General",
        duration: 30,
        startTime: "",
      }),
    );
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const prompt = `
      Extract task details from this text: "${text}".
      Current Date: ${new Date().toISOString()}.
      
      Return JSON with:
      - content (string, clean title)
      - category (Work, Personal, Workout, Study, Other) - infer from context
      - duration (number, in minutes) - default to 30 if not specified
      - startTime (string, HH:MM 24hr format) or null if not specified
      - priority (High, Medium, Low) - default Medium
      
      Return ONLY raw JSON.
    `;

    const result = await model.generateContent(prompt);
    const textRes = result.response.text();
    const cleaned = textRes
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(cleaned);

    return res.status(200).json(new ApiResponse(true, "Task parsed", parsed));
  } catch (error) {
    console.error("AI Parse Failed:", error);
    return res.status(500).json(new ApiResponse(false, "Failed to parse task"));
  }
});

const categorizeExpense = asyncHandler(async (req, res) => {
  const { description } = req.body;
  if (!description)
    return res.status(400).json(new ApiResponse(false, "No desc"));

  // Fallback
  if (!genAI) {
    return res
      .status(200)
      .json(new ApiResponse(true, "Fallback", { category: "General" }));
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const prompt = `
      Categorize this expense description: "${description}".
      Categories: [General, Food, Transport, Shopping, Bills, Date Night].
      Return JSON with key "category".
      Example: "Uber to work" -> {"category": "Transport"}.
      Return ONLY raw JSON.
    `;

    const result = await model.generateContent(prompt);
    const textRes = result.response.text();
    const cleaned = textRes
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(cleaned);

    return res
      .status(200)
      .json(new ApiResponse(true, "Expense categorized", parsed));
  } catch (error) {
    return res
      .status(200)
      .json(new ApiResponse(true, "Error fallback", { category: "General" }));
  }
});

export { getInsights, parseTask, categorizeExpense };
