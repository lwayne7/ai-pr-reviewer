export interface UserCredentials {
  githubToken: string;
  geminiApiKey: string;
}

export interface PRInfo {
  owner: string;
  repo: string;
  pullNumber: number;
  title: string;
  body: string;
  author: string;
  authorAvatarUrl: string;
  state: string;
  createdAt: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  htmlUrl: string;
}

export interface PRFile {
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed';
  additions: number;
  deletions: number;
  changes: number;
  patch?: string; // Raw git patch
}

export interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'addition' | 'deletion' | 'normal' | 'hunk-header';
  content: string;
  leftLineNum?: number;  // Deleted/normal line number
  rightLineNum?: number; // Added/normal line number
  index: number;         // Index of line in patch (used for posting comments to GitHub)
}

export type SeverityType = 'critical' | 'warning' | 'info';
export type CategoryType = 'security' | 'performance' | 'style' | 'logic' | 'other';

export interface AIReviewComment {
  id: string;
  filename: string;
  line: number;           // 1-indexed target line number in the new file (rightLineNum)
  severity: SeverityType;
  category: CategoryType;
  title: string;
  description: string;
  codeSuggestion?: string; // Proposed replacement block of code
}

export interface AIReviewSummary {
  overview: string;
  architecturalImpact: string;
  keyChanges: string[];
  riskScore: number;       // 1 - 100
  riskSummary: string;
}

export interface PRReviewResult {
  summary: AIReviewSummary;
  comments: AIReviewComment[];
}

export interface CachedReview {
  id: string; // "owner/repo#number"
  prInfo: PRInfo;
  files: PRFile[];
  result: PRReviewResult;
  timestamp: number;
}
