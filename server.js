require("dotenv").config();

const express = require("express");
const cors = require("cors");
const Groq = require("groq-sdk");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const Tesseract = require("tesseract.js");
const fs = require("fs");
const path = require("path");
const { fromPath } = require("pdf2pic");

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

/* ================= HELPERS ================= */

function chunkText(text, size = 12000) {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

function expandTopic(topic) {
  const map = {
    deadlock: ["deadlock","coffman conditions","deadlock prevention","deadlock avoidance","banker's algorithm"],
    database: ["database","dbms","sql","joins","normalization","transactions"],
    os: ["operating system","process","thread","cpu scheduling","deadlock","paging"]
  };

  const lower = topic.toLowerCase();

  for (const key in map) {
    if (lower.includes(key)) return map[key];
  }

  return [topic];
}

async function runFastOCR(pdfPath) {
  const outputDir = path.join(__dirname, "ocr-temp");

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  const convert = fromPath(pdfPath, {
    density: 120,
    saveFilename: "page",
    savePath: outputDir,
    format: "png",
    width: 1200,
    height: 1600
  });

  let extractedText = "";

  for (let i = 1; i <= 30; i++) {
    try {
      const page = await convert(i);

      const result = await Tesseract.recognize(page.path, "eng");

      extractedText += "\n" + result.data.text;

      fs.unlinkSync(page.path);
    } catch {
      break;
    }
  }

  return extractedText;
}

/* ================= ASK ROUTE ================= */

app.post("/ask", async (req, res) => {
  try {
    const {
      type,
      input,
      question,
      previous,
      marks,
      answer,
      tasks,
      syllabus,
      days,
      hours,
      pyqText
    } = req.body;

    let prompt = "";

    /* NOTES */
    if (type === "notes") {
      prompt = `
Create highly engaging, detailed, exam-focused notes on "${input}".

Requirements:
- Structured markdown
- Main headings/subheadings
- Bullet points
- Bold keywords
- Memory tricks
- Examples
- Exam tips
- Diagrams where useful
`;
    }

    /* MCQ */
    else if (type === "mcq") {
      prompt = `
Generate 8-10 HIGH QUALITY EXAM MCQs on "${input}"

Previously Generated:
${previous || "None"}

Rules:
- Do NOT repeat previous MCQs
- Exam-level difficulty
- 4 options per question
- Correct answer
- Explanation

STRICT FORMAT:

1. Question text
A. Option
B. Option
C. Option
D. Option
Answer: B
Explanation: ...
`;
    }

    /* QUESTIONS */
    else if (type === "questions") {
      prompt = `
Generate 8-10 important exam questions on "${input}"

Previously Generated:
${previous || "None"}

Rules:
- No duplicates
- Include high-probability exam questions
- Mix short + long answer style
`;
    }

    /* EXPAND NOTES */
    else if (type === "expand") {
      prompt = `
Expand these notes on "${input}"

Existing Notes:
${previous}

Add:
- More explanation
- More examples
- More diagrams
- Advanced details
`;
    }

    /* ASK TOPIC */
    else if (type === "askTopic") {
      prompt = `
Answer this student doubt about "${input}"

Question:
${question}

Explain clearly with examples/diagram if useful.
`;
    }

    /* TEACHER CHAT */
    else if (type === "teacherChat") {
      prompt = `
You are an excellent real-life teacher.

Teach the student conversationally and naturally.

Topic: ${input}

Student Question:
${question}

Rules:
- Explain step by step
- Be interactive and engaging
- Use analogies/examples
- Teach like a real professor
`;
    }

    /* FLASHCARDS */
    else if (type === "flashcards") {
      prompt = `
Generate 8-10 flashcards for topic "${input}"

Format:

Q: ...
A: ...
`;
    }

    /* REVISION SHEET */
    else if (type === "revision") {
      prompt = `
Create a 1-page quick revision sheet for "${input}"

Include:
- Key definitions
- Important formulas/rules
- Memory tricks
- Important facts only
`;
    }

    /* MNEMONICS */
    else if (type === "mnemonics") {
      prompt = `
Generate useful mnemonics / memory tricks for "${input}"
`;
    }

    /* PREDICT QUESTIONS */
    else if (type === "predictPYQ") {
      prompt = `
Based on these extracted PYQs:

${pyqText}

Predict likely questions for upcoming exam.

Return most probable 8-10 predicted questions.
`;
    }

    /* EVALUATE */
    else if (type === "evaluate") {
      prompt = `
You are a strict but helpful exam evaluator.

Question: ${question}
Marks: ${marks}

Student Answer:
${answer}

Return:

# Marks Awarded
X/${marks}

# Feedback
- ...

# Deductions
- ...

# Improvements
- ...

# Enhanced Answer
Provide perfect full-mark answer.
`;
    }

    /* PLAN */
    else if (type === "plan") {
      prompt = `
Create detailed study plan.

Pending Tasks:
${tasks}

Syllabus:
${syllabus}

Days Until Exam:
${days}

Daily Study Hours:
${hours}

Return day-wise plan.
`;
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7
    });

    res.json({
      reply: completion.choices[0].message.content
    });

  } catch (err) {
    console.error(err);
    res.json({
      reply: "Error: " + err.message
    });
  }
});

/* ================= PYQ ROUTE ================= */

app.post("/upload-pyq", upload.array("files", 20), async (req, res) => {
  try {
    const topics = req.body.topics;
    const expandedTopics = expandTopic(topics);

    let extractedText = "";

    for (const uploadedFile of req.files) {
      const filePath = uploadedFile.path;
      const fileType = uploadedFile.mimetype;

      if (fileType.startsWith("image/")) {
        const result = await Tesseract.recognize(filePath, "eng");
        extractedText += "\n" + result.data.text;
      }

      else if (fileType === "application/pdf") {
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(dataBuffer);

        let pdfText = pdfData.text;

        if (pdfText.trim().length < 500) {
          pdfText = await runFastOCR(filePath);
        }

        extractedText += "\n" + pdfText;
      }

      fs.unlinkSync(filePath);
    }

    const chunks = chunkText(extractedText, 12000);

    let chunkResults = [];

    for (const chunk of chunks) {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{
          role: "user",
          content: `
Extract PYQs relevant to topic: ${topics}

SMART TOPIC TERMS:
${expandedTopics.join(", ")}

Paper Text:
${chunk}

Return:
# Direct PYQs
# Related PYQs
# Insights
`
        }],
        temperature: 0.2
      });

      chunkResults.push(completion.choices[0].message.content);
    }

    res.json({
      reply: chunkResults.join("\n\n")
    });

  } catch (err) {
    console.error(err);
    res.json({
      reply: "Error processing PYQs."
    });
  }
});

/* ================= START ================= */

app.listen(3000, () => {
  console.log("🚀 ExamAce AI running on http://localhost:3000");
});