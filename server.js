require("dotenv").config();

const express = require("express");
const cors = require("cors");
const Groq = require("groq-sdk");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

app.post("/ask", async (req, res) => {
  try {
    const { type, input } = req.body;

    let prompt = "";

    // 🧠 AI Agent logic
    if (type === "notes") {
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
- Simple language
- Exam ready
`;
    }

    else if (type === "pyq") {
      prompt = `
Analyze previous year questions of "${input}".

Give:
- Important topics
- Repeated patterns
- Expected questions
`;
    }

    else if (type === "plan") {
      prompt = `
Create a 7-day study plan for "${input}".
Make it practical and exam-focused.
`;
    }

    else if (type === "evaluate") {
      prompt = `
Evaluate this answer like an examiner:

${input}

Give:
- Marks out of 10
- Feedback
- Improvements
`;
    }

    else if (type === "enhance") {
      prompt = `
Improve this answer to score full marks:

${input}

Add:
- Structure
- Keywords
- Better explanation
`;
    }

    else {
      prompt = `Explain "${input}" clearly for exams.`;
    }

    // 🚀 Groq API call
    const chatCompletion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const reply = chatCompletion.choices[0].message.content;

    res.json({ reply });

  } catch (error) {
    console.error(error);
    res.json({ reply: "Error: " + error.message });
  }
});

app.listen(3000, () => {
  console.log("🚀 ExamAce AI running on http://localhost:3000");
});