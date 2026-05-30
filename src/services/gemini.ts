import { GoogleGenerativeAI } from '@google/generative-ai';
import { PRInfo, PRFile, PRReviewResult } from '../types';

/**
 * Validates the Gemini API key by making a simple request
 */
export async function validateGeminiKey(apiKey: string): Promise<boolean> {
  if (!apiKey || apiKey.trim() === '') return false;
  
  try {
    const ai = new GoogleGenerativeAI(apiKey);
    // Use gemini-2.5-flash as the check model
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent('Ping');
    return !!result.response.text();
  } catch (error) {
    console.error('Error validating Gemini key:', error);
    return false;
  }
}

/**
 * Runs the AI review on a PR's metadata and changed files using Gemini
 */
export async function analyzePR(
  prInfo: PRInfo,
  files: PRFile[],
  apiKey: string,
  modelName: string = 'gemini-2.5-flash'
): Promise<PRReviewResult> {
  const ai = new GoogleGenerativeAI(apiKey);
  
  // Format the file diff data to feed into the model
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
   - Provide an exact 'codeSuggestion' replacement block whenever possible. Ensure the suggestion matches the syntax of the language, respects indentation, and is clean.

4. SEVERITY LEVEL:
   - critical: Severe logic bugs, memory leaks, credential exposure, security vulnerabilities (SQL injection, XSS, SSRF), or crashes.
   - warning: Sub-optimal performance, unhandled error cases, API deprecation, or potential race conditions.
   - info: Refactoring ideas, code readability enhancements, or minor cleanups.`;

  const model = ai.getGenerativeModel({ model: modelName, systemInstruction });

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

Please analyze the PR and return the review in JSON format matching the schema requested.
Ensure all JSON comments map correctly to filenames and rightLineNum (line) from the diff.`;

  // Define structured JSON Schema
  const responseSchema = {
    type: 'OBJECT',
    properties: {
      summary: {
        type: 'OBJECT',
        properties: {
          overview: { 
            type: 'STRING', 
            description: 'A 2-3 sentence high-level summary of the PR purpose and scope.' 
          },
          architecturalImpact: { 
            type: 'STRING', 
            description: 'Evaluation of how this PR impacts the architecture, dependencies, or scalability of the codebase.' 
          },
          keyChanges: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            description: 'Key logical and functional updates introduced in this PR.'
          },
          riskScore: { 
            type: 'INTEGER', 
            description: 'A score from 1 to 100 representing the risk of merging this PR (e.g. 1-30 low, 31-70 medium, 71-100 high).' 
          },
          riskSummary: { 
            type: 'STRING', 
            description: 'A brief explanation explaining why this risk score was assigned, mentioning any major critical risks.' 
          }
        },
        required: ['overview', 'architecturalImpact', 'keyChanges', 'riskScore', 'riskSummary']
      },
      comments: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            id: { type: 'STRING', description: 'A unique short slug, e.g. "sec-xss" or "perf-loop"' },
            filename: { type: 'STRING', description: 'The exact path and filename as listed in the diff header (e.g. src/components/SetupForm.tsx).' },
            line: { type: 'INTEGER', description: 'The 1-indexed line number in the NEW file (right side of the diff) where the suggestion applies. Must represent a line changed or added.' },
            severity: {
              type: 'STRING',
              enum: ['critical', 'warning', 'info'],
              description: 'Severity: critical (bug/security), warning (perf/edge cases), info (style/readability).'
            },
            category: {
              type: 'STRING',
              enum: ['security', 'performance', 'style', 'logic', 'other'],
              description: 'Classification of the comment.'
            },
            title: { type: 'STRING', description: 'A short (3-6 words) title summarizing the comment.' },
            description: { type: 'STRING', description: 'Detailed, constructive explanation of the problem and the resolution.' },
            codeSuggestion: { type: 'STRING', description: 'Clean replacement code snippet for the target line/block. Do NOT include diff symbols like "+" or "-". Just raw replacement code.' }
          },
          required: ['id', 'filename', 'line', 'severity', 'category', 'title', 'description']
        },
        description: 'Specific line-level code suggestions. Return an empty array if no issues are detected.'
      }
    },
    required: ['summary', 'comments']
  };

  try {
    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema as any,
        temperature: 0.1, // Keep temp low to reduce hallucinations and ensure structured conformance
      }
    });

    const responseText = response.response.text();
    if (!responseText) {
      throw new Error('Empty response received from Gemini API');
    }

    const result = JSON.parse(responseText) as PRReviewResult;
    return result;
  } catch (error) {
    console.error('Error during Gemini API review execution:', error);
    throw error;
  }
}
