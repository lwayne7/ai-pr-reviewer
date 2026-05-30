import { PRInfo, PRFile, PRReviewResult } from '../types';

/**
 * Sends the Pull Request metadata and file diffs to our Express server backend 
 * to execute AI review analysis using Aliyun Qwen.
 */
export async function analyzePR(
  prInfo: PRInfo,
  files: PRFile[],
  modelName: string = 'qwen-plus'
): Promise<PRReviewResult> {
  const response = await fetch('/api/review', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prInfo, files, modelName }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errMsg = errData.error || response.statusText;
    throw new Error(`AI Review analysis failed: ${errMsg} (Status: ${response.status})`);
  }

  const data = await response.json();
  return data as PRReviewResult;
}
