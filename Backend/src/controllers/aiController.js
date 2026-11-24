export async function suggestCategory(req, res, next) {
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

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Classify expense into ONE word from [${ALLOWED_CATEGORIES.join(
        ", "
      )}]: "${description.trim()}"`,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        maxOutputTokens: 10,
        temperature: 0,
      },
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
    // Gemini API fail hone par user experience break na ho, isliye fallback return karein
    if (req.body?.description) {
      return res.status(200).json({
        success: true,
        category: fallbackCategorize(req.body.description),
        source: "fallback",
      });
    }
    return next(error);
  }
}

export async function getSpendingInsights(req, res, next) {
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
    return next(error);
  }
}
