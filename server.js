require("dotenv").config();

const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🎯 MAIN ROUTE
app.post("/ask", async (req, res) => {
  try {
    const { type, input } = req.body;

    let prompt = "";

    // 🧠 Agent brain
    if (type === "Notes") {
      prompt = `
Create topper-level exam notes on "${input}".

Include:
- Definition
- Explanation
- Characteristics
- Advantages
- Disadvantages
- Diagram (text)
- Conclusion

Style:
- Structured
- Bullet points
- Highlight keywords
- Simple Punjabi-English mix

Make it exam-ready.
`;
    }

    else if (type === "MCQ") {
      prompt = `
Generate 5 MCQs on "${input}".

Include:
- Question
- 4 options
- Correct answer
- Explanation
`;
    }

    else if (type === "Evaluate") {
      prompt = `
Evaluate this answer like an examiner:

${input}

Give:
- Marks out of 10
- Feedback
- Improvements
`;
    }

    else if (type === "Plan") {
      prompt = `
Create a 7-day study plan for "${input}".
Make it practical and exam-focused.
`;
    }

    else if (type === "PYQ") {
      prompt = `
Analyze PYQs of "${input}".

Give:
- Important topics
- Repeated patterns
- Expected questions
`;
    }

    else {
      prompt = `Explain "${input}" clearly for exams.`;
    }

    // 🚀 OpenAI call (NEW API)
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const text = response.output[0].content[0].text;

    res.json({ reply: text });

  } catch (error) {
    console.error(error);
    res.json({ reply: "Error: " + error.message });
  }
});

// 🚀 start server
app.listen(3000, () => {
  console.log("🚀 ExamAce AI running on http://localhost:3000");
});