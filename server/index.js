import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const ALIYUN_API_KEY = process.env.ALIYUN_API_KEY;

app.use(cors());
app.use(express.json({ limit: '10mb' })); // support larger PR diff payloads

// In production, serve the built Vite frontend statically
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
}

/**
 * Endpoint to analyze Pull Request code changes using Aliyun Qwen Coder API
 */
app.post('/api/review', async (req, res) => {
  const { prInfo, files, modelName } = req.body;

  if (!prInfo || !files) {
    return res.status(400).json({ error: 'prInfo and files are required parameters.' });
  }

  if (!ALIYUN_API_KEY) {
    return res.status(500).json({ error: 'Aliyun API Key (ALIYUN_API_KEY) is not configured on the backend server.' });
  }

  // Use the requested model name directly, with qwen-plus as default fallback
  const resolvedModel = modelName || 'qwen-plus';

  // Format file diff data for the system prompt
  const filesDiffData = files
    .map((file, idx) => {
      return `### File [${idx + 1}]: ${file.filename}
Status: ${file.status} | Additions: ${file.additions} | Deletions: ${file.deletions}
${file.patch ? `\`\`\`diff\n${file.patch}\n\`\`\`` : '*(No diff available / Binary file or empty)*'}`;
    })
    .join('\n\n');

  const systemInstruction = `You are an elite Senior Software Engineer, Security Architect, and Code Quality Reviewer.
Your task is to conduct a professional, rigorous, and constructive code review of the provided Pull Request.

CRITICAL RULES FOR REVIEW:
1. ACCURACY & FALSE POSITIVE CONTROL:
   - Only flag actual bugs, security flaws, performance bottlenecks, unhandled edge cases, or severe architectural flaws.
   - Do NOT comment on minor formatting, import orders, or styling rules (such as spaces/tabs) unless they present a functional bug.
   - Do NOT complain about missing documentation/comments unless the code is extremely complex and unintuitive.
   - Do NOT generate comments for code that is part of the context (unchanged lines) - only comment on lines that were added or modified (prefixed with '+' in the diff).
   
2. LINE IDENTIFICATION:
   - For each comment, you MUST specify the exact target line number ('line') in the NEW file (the right side of the diff).
   - This line must correspond to a line that is modified or added. Double check the diff hunks to map the rightLineNum correctly.

3. ACTIONABLE FEEDBACK:
   - Provide a clear, polite explanation of the issue, explaining WHY it is a problem.
   - Provide an exact 'codeSuggestion' replacement block whenever possible. Ensure the suggestion respects indentation and syntax. Do NOT include diff symbols like '+' or '-' inside the code suggestion.

4. SEVERITY LEVEL:
   - critical: Severe logic bugs, memory leaks, credential exposure, security vulnerabilities (SQL injection, XSS, SSRF), or crashes.
   - warning: Sub-optimal performance, unhandled error cases, API deprecation, or potential race conditions.
   - info: Refactoring ideas, code readability enhancements, or minor cleanups.

5. OUTPUT FORMAT:
   - You MUST respond with a valid raw JSON object matching the JSON schema requested. Do not wrap your response in markdown code blocks (\`\`\`json). Just return raw JSON.`;

  const userPrompt = `Pull Request Details:
Repository: ${prInfo.owner}/${prInfo.repo}
PR Number: #${prInfo.pullNumber}
PR Title: ${prInfo.title}
PR Description:
${prInfo.body || 'No description provided.'}

Author: ${prInfo.author}
Additions: ${prInfo.additions} | Deletions: ${prInfo.deletions} | Files Changed: ${prInfo.changedFiles}

--------------------------------------------------------------------------------
CHANGED FILES AND DIFFS:
${filesDiffData}
--------------------------------------------------------------------------------

Please analyze the PR and return the review in JSON format matching the schema below:
{
  "summary": {
    "overview": "A 2-3 sentence summary of the PR.",
    "architecturalImpact": "Evaluation of architecture/dependencies.",
    "keyChanges": ["Item 1", "Item 2"],
    "riskScore": 12, // number from 1 to 100
    "riskSummary": "Brief explanation of risk score."
  },
  "comments": [
    {
      "id": "unique-slug",
      "filename": "path/to/file.ts",
      "line": 42, // Line number in the new file
      "severity": "critical" | "warning" | "info",
      "category": "security" | "performance" | "style" | "logic" | "other",
      "title": "Short title",
      "description": "Details",
      "codeSuggestion": "Replacement code (optional)"
    }
  ]
}`;

  console.log(`[AI-Review] Initiating review for PR ${prInfo.owner}/${prInfo.repo}#${prInfo.pullNumber} using Qwen model: ${resolvedModel}`);

  try {
    // Aliyun Qwen OpenAI-compatible chat completion request
    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ALIYUN_API_KEY}`
      },
      body: JSON.stringify({
        model: resolvedModel,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userPrompt }
        ],
        // Ask Qwen to output formatted JSON
        response_format: { type: 'json_object' },
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Aliyun Qwen API responded with error: ${response.status} ${response.statusText}\nDetails: ${errText}`);
    }

    const responseData = await response.json();
    const responseText = responseData.choices?.[0]?.message?.content;

    if (!responseText) {
      throw new Error('Received empty content from Qwen chat completion API.');
    }

    // Parse the JSON string
    const reviewResult = JSON.parse(responseText.trim());
    
    console.log(`[AI-Review] Completed review successfully. Found ${reviewResult.comments?.length || 0} recommendations.`);
    res.json(reviewResult);

  } catch (error) {
    console.error('[AI-Review-Error]', error);
    res.status(500).json({ error: error.message || 'An error occurred during AI analysis.' });
  }
});

// Route everything else in production to the SPA index.html
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
});
