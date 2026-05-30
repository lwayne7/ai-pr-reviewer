import { PRInfo, PRFile, DiffHunk } from '../types';

/**
 * Parses a GitHub PR URL to extract owner, repo, and pull number.
 * Supported format: https://github.com/owner/repo/pull/number
 */
export function parsePRUrl(url: string): { owner: string; repo: string; pullNumber: number } | null {
  try {
    const cleanUrl = url.trim();
    const match = cleanUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/i);
    if (!match) return null;
    
    return {
      owner: match[1],
      repo: match[2],
      pullNumber: parseInt(match[3], 10),
    };
  } catch (error) {
    return null;
  }
}

/**
 * Helper to construct GitHub API headers
 */
function getHeaders(token?: string): HeadersInit {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token && token.trim() !== '') {
    headers['Authorization'] = `token ${token.trim()}`;
  }
  return headers;
}

/**
 * Fetches general details of a Pull Request
 */
export async function fetchPRDetails(
  owner: string,
  repo: string,
  pullNumber: number,
  token?: string
): Promise<PRInfo> {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`;
  const response = await fetch(url, { headers: getHeaders(token) });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch PR details: ${response.statusText} (${response.status})`);
  }
  
  const data = await response.json();
  return {
    owner,
    repo,
    pullNumber,
    title: data.title,
    body: data.body || '',
    author: data.user.login,
    authorAvatarUrl: data.user.avatar_url,
    state: data.state,
    createdAt: data.created_at,
    additions: data.additions,
    deletions: data.deletions,
    changedFiles: data.changed_files,
    htmlUrl: data.html_url,
  };
}

/**
 * Fetches the list of files changed in a Pull Request
 */
export async function fetchPRFiles(
  owner: string,
  repo: string,
  pullNumber: number,
  token?: string
): Promise<PRFile[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/files?per_page=100`;
  const response = await fetch(url, { headers: getHeaders(token) });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch PR files: ${response.statusText} (${response.status})`);
  }
  
  const data = await response.json();
  return data.map((file: any) => ({
    filename: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    changes: file.changes,
    patch: file.patch, // The raw patch content
  }));
}

/**
 * Parses a raw git patch string into structured DiffHunks and DiffLines
 */
export function parsePatch(patch?: string): DiffHunk[] {
  if (!patch) return [];
  
  const hunks: DiffHunk[] = [];
  const lines = patch.split('\n');
  
  let currentHunk: DiffHunk | null = null;
  let leftLineNum = 0;
  let rightLineNum = 0;
  let lineIndex = 0; // The index of the line in the diff patch (needed for legacy GitHub APIs, if used)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    lineIndex = i;

    // Check for hunk header e.g., @@ -1,4 +1,5 @@
    const hunkHeaderMatch = line.match(/^@@ -(\d+),?(\d*)\s+\+(\d+),?(\d*)\s+@@/);
    
    if (hunkHeaderMatch) {
      if (currentHunk) {
        hunks.push(currentHunk);
      }
      
      leftLineNum = parseInt(hunkHeaderMatch[1], 10);
      rightLineNum = parseInt(hunkHeaderMatch[3], 10);
      
      currentHunk = {
        header: line,
        lines: [{
          type: 'hunk-header',
          content: line,
          index: lineIndex
        }]
      };
    } else if (currentHunk) {
      if (line.startsWith('+')) {
        currentHunk.lines.push({
          type: 'addition',
          content: line.substring(1),
          rightLineNum: rightLineNum++,
          index: lineIndex
        });
      } else if (line.startsWith('-')) {
        currentHunk.lines.push({
          type: 'deletion',
          content: line.substring(1),
          leftLineNum: leftLineNum++,
          index: lineIndex
        });
      } else {
        // Normal/context line (starts with space or empty)
        currentHunk.lines.push({
          type: 'normal',
          content: line.startsWith(' ') ? line.substring(1) : line,
          leftLineNum: leftLineNum++,
          rightLineNum: rightLineNum++,
          index: lineIndex
        });
      }
    }
  }
  
  if (currentHunk) {
    hunks.push(currentHunk);
  }
  
  return hunks;
}

/**
 * Submits a complete review with comments to the GitHub PR.
 */
export async function submitPRReview(
  owner: string,
  repo: string,
  pullNumber: number,
  token: string,
  summary: string,
  comments: Array<{ path: string; line: number; body: string }>
): Promise<void> {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`;
  
  // Format comments to match GitHub API Review Comment format.
  // Note: We comment on the RIGHT side of the diff (new code changes).
  const githubComments = comments.map(c => ({
    path: c.path,
    line: c.line,
    side: 'RIGHT',
    body: c.body
  }));

  const payload = {
    body: summary,
    event: 'COMMENT', // Submits review as a comment. Can be 'COMMENT', 'APPROVE', or 'REQUEST_CHANGES'
    comments: githubComments
  };
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...getHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errMsg = errData.message || response.statusText;
    throw new Error(`Failed to submit PR review: ${errMsg} (${response.status})`);
  }
}
