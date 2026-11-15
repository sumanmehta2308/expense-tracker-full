import { GoogleGenAI } from "@google/genai";
import pool from "../config/db.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// तुम्हारे dropdown में मौजूद exact categories
const ALLOWED_CATEGORIES = [
  "Food",
  "Fuel",
  "Shopping",
  "Bills",
  "Entertainment",
  "Travel",
  "Health",
  "Other",
];
function fallbackCategorize(description) {
  const text = description.toLowerCase();
  if (
    /food|lunch|dinner|breakfast|domino|pizza|burger|swiggy|zomato|tea|coffee|grocery|milk/.test(
      text
    )
  )
    return "Food";
  if (/petrol|diesel|fuel|pump|cng|ev charge/.test(text)) return "Fuel";
  if (/amazon|flipkart|myntra|shirt|shoes|mall|clothes|shopping/.test(text))
    return "Shopping";
  if (/electricity|water|wifi|internet|recharge|bill|rent|gas/.test(text))
    return "Bills";
  if (/movie|netflix|pvr|game|concert|spotify/.test(text))
    return "Entertainment";
  if (/uber|ola|flight|train|bus|metro|hotel|trip/.test(text)) return "Travel";
  if (/doctor|medicine|hospital|pharmacy|gym|medical/.test(text))
    return "Health";
  return "Other";
}
export async function suggestCategory(req, res) {
  try {
    const { description } = req.body;

    if (!description || description.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Please enter an expense description first.",
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(200).json({
        success: true,
        category: fallbackCategorize(description),
        source: "fallback",
      });
    }

    const prompt = `Categorize this expense description into EXACTLY ONE of these categories: ${ALLOWED_CATEGORIES.join(
      ", "
    )}.
Expense description: "${description.trim()}"
Reply with ONLY the single category word, nothing else.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const rawText = (response.text || "").trim().replace(/[^a-zA-Z]/g, "");
    const matchedCategory =
      ALLOWED_CATEGORIES.find(
        (cat) => cat.toLowerCase() === rawText.toLowerCase()
      ) || fallbackCategorize(description);

    return res.status(200).json({
      success: true,
      category: matchedCategory,
      source: "gemini-ai",
    });
  } catch (error) {
    console.error("AI Categorize Error:", error.message);
    return res.status(200).json({
      success: true,
      category: fallbackCategorize(req.body?.description || ""),
      source: "fallback",
    });
  }
}
export async function getSpendingInsights(req, res) {
  try {
    const userId = req.user.id;
    const [expenses] = await pool.query(
      "SELECT amount, description, category, created_at FROM expenses WHERE user_id = ? ORDER BY created_at DESC LIMIT 30",
      [userId]
    );

    if (expenses.length === 0) {
      return res.status(200).json({
        success: true,
        insights:
          "Add a few expenses first so AI can analyze your spending habits!",
      });
    }

    const summaryText = expenses
      .map((e) => `${e.description} (${e.category}): ₹${e.amount}`)
      .join("; ");

    const prompt = `You are a concise personal finance coach for an Indian user. Analyze these recent expenses and give 3 short, actionable bullet points (max 15 words each) in plain text with emojis on where they spend most and how to save money:
Expenses: ${summaryText}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return res.status(200).json({
      success: true,
      insights: response.text.trim(),
    });
  } catch (error) {
    console.error("AI Insights Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Could not generate AI insights right now.",
    });
  }
}
