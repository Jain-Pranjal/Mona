import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

app.post('/ai-improve', async (req, res) => {
  const { code, prompt } = req.body;

  const fullPrompt = `
You are an elite coding assistant and code optimizer. Your role is to take the provided code and significantly improve it while preserving its original functionality.

- Apply modern best practices for the detected programming language.
- Simplify logic, remove redundancy, and make performance optimizations.
- Fix any potential bugs or bad practices.
- Refactor variable, function, and class names to be more meaningful.
- Modularize the code if appropriate, breaking large chunks into smaller, reusable pieces.
- Use modern language features (e.g., async/await, arrow functions, optional chaining) when applicable.
- Make the code cleaner, more readable, and maintainable according to standard conventions.

Here is the code you must improve:
${code}

The user also requests:
"${prompt}"

Return the improved code first, and then list and explain what changes and improvements you made. Be detailed in the explanation.
`;


  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

// Extract improved code block
const codeMatch = text.match(/```[\s\S]*?\n([\s\S]*?)```/);
const modifiedCode = codeMatch ? codeMatch[1].trim() : '';

// Extract explanation (everything after the code block)
const explanation = codeMatch ? text.split(codeMatch[0])[1]?.trim() || 'No explanation provided.': 'No explanation provided.';


    res.json({
      modifiedCode,
      explanation,
      // language,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gemini API call failed' });
  }
});

export default app;
