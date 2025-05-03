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
"Analyze the following game development code snippet. Provide improvements focusing on:

1.Performance Optimization: Enhance frame rates and reduce latency.
2. Memory Management: Optimize resource loading and garbage collection.
3. Code Readability: Refactor for clarity and maintainability.
4. Best Practices: Align with industry standards for game development.
5. Security: Identify and mitigate potential vulnerabilities.
.

Here is the code:
${code}

The user request is:
"${prompt}"

Rewrite the code and explain what changed.
`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    // Extract code block
    const match = text.match(/```(\w+)?\n([\s\S]+?)```/);
    const modifiedCode = match ? match[2].trim() : '';
    const explanation = text.split('Explanation:')[1]?.trim() || 'No explanation provided.';
    // const language = langDetector(modifiedCode) || 'javascript';

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
