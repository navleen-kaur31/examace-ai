const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ PUT YOUR API KEY HERE
const genAI = new GoogleGenerativeAI("AIzaSyCzTyRFbGgTb9XQRNQnrj33P82MvQdNLng");

// ✅ USE THIS MODEL (NEW WAY)
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash-latest"
});

app.post("/ask", async (req, res) => {
  try {
    const { type, input } = req.body;

    let prompt = `Explain ${input}`;

    if (type === "Notes") {
      prompt = `Create detailed exam notes on "${input}".

Include:
- Definition
- Explanation
- Characteristics
- Advantages
- Disadvantages
- Diagram (text)
- Conclusion

Make it perfect for exams.`;
    }

    const result = await model.generateContent(prompt);

    const text = result.response.text();

    res.json({ reply: text });

  } catch (error) {
    console.log(error);
    res.json({ reply: "Error: " + error.message });
  }
});

app.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});