import { useState } from 'react';
import { AIReviewComment, SeverityType, CategoryType, PRFile } from '../types';
import { GlassCard } from './GlassCard';
import { submitPRReview, parsePatch } from '../services/github';
import { renderMarkdown } from '../services/markdown';

const severityMap: Record<SeverityType, string> = {
  critical: '严重',
  warning: '警告',
  info: '建议'
};

const categoryMap: Record<CategoryType, string> = {
  security: '安全',
  performance: '性能',
  style: '规范',
  logic: '逻辑',
  other: '其他'
};

const severityLabels: Record<string, string> = {
  all: '全部级别',
  critical: '严重 (Critical)',
  warning: '警告 (Warning)',
  info: '建议 (Info)'
};

const categoryLabels: Record<string, string> = {
  all: '全部类型',
  security: '安全',
  performance: '性能',
  style: '规范',
  logic: '逻辑',
  other: '其他'
};

interface ReviewPanelProps {
  comments: AIReviewComment[];
  files: PRFile[];
  owner: string;
  repo: string;
  pullNumber: number;
  githubToken?: string;
  aiSummaryMarkdown: string; // The text summary we want to post as the review body
}

export function ReviewPanel({
  comments,
  files,
  owner,
  repo,
  pullNumber,
  githubToken,
  aiSummaryMarkdown
}: ReviewPanelProps) {
  const [selectedSeverity, setSelectedSeverity] = useState<SeverityType | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'severity' | 'line'>('severity');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [activeToken, setActiveToken] = useState(githubToken || localStorage.getItem('ai_pr_reviewer_github_token') || '');

  const getCategoryIcon = (category: string) => {
    const strokeWidth = 2.2;
    if (category === 'security') {
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    }
    if (category === 'performance') {
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }}>
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      );
    }
    if (category === 'style') {
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      );
    }
    if (category === 'logic') {
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }}>
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        </svg>
      );
    }
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }}>
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" x2="12.01" y1="17" y2="17" />
      </svg>
    );
  };

  // Filters & Sorting
  const filteredComments = comments
    .filter(c => {
      const severityMatch = selectedSeverity === 'all' || c.severity === selectedSeverity;
      const categoryMatch = selectedCategory === 'all' || c.category === selectedCategory;
      const query = searchQuery.toLowerCase().trim();
      const searchMatch = query === '' ||
        c.title.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query) ||
        c.filename.toLowerCase().includes(query);
      return severityMatch && categoryMatch && searchMatch;
    })
    .sort((a, b) => {
      if (sortBy === 'line') {
        if (a.filename !== b.filename) {
          return a.filename.localeCompare(b.filename);
        }
        return a.line - b.line;
      } else {
        const priority: Record<string, number> = { critical: 1, warning: 2, info: 3 };
        return (priority[a.severity] || 3) - (priority[b.severity] || 3);
      }
    });

  const getSeverityColor = (severity: string) => {
    if (severity === 'critical') return 'var(--color-critical)';
    if (severity === 'warning') return 'var(--color-warning)';
    return 'var(--color-info)';
  };

  const handlePostReview = async () => {
    if (!activeToken) {
      alert('同步审查意见需要配置 GitHub 个人访问令牌，请在下方输入。');
      return;
    }
    
    setIsSubmitting(true);
    setSubmitStatus(null);

    // 1. Build a map of valid right-side lines from the diff patches to prevent 422 errors on incorrect line numbers
    const validLinesMap = files.reduce((acc, file) => {
      const hunks = parsePatch(file.patch);
      const validLines = new Set<number>();
      for (const hunk of hunks) {
        for (const line of hunk.lines) {
          if ((line.type === 'addition' || line.type === 'normal') && line.rightLineNum !== undefined) {
            validLines.add(line.rightLineNum);
          }
        }
      }
      acc[file.filename] = validLines;
      return acc;
    }, {} as Record<string, Set<number>>);

    // 2. Validate and partition comments into inline review comments and general comments
    const validApiComments: Array<{ path: string; line: number; body: string }> = [];
    const unmappedComments: AIReviewComment[] = [];

    for (const c of comments) {
      const fileValidLines = validLinesMap[c.filename];
      const isLineValid = fileValidLines && fileValidLines.has(c.line);

      if (isLineValid) {
        validApiComments.push({
          path: c.filename,
          line: c.line,
          body: `**[代码审阅意见 - ${severityMap[c.severity] || c.severity} (${categoryMap[c.category] || c.category})]**: ${c.title}\n\n${c.description}${c.codeSuggestion ? `\n\n\`\`\`suggestion\n${c.codeSuggestion}\n\`\`\`` : ''}`
        });
      } else {
        unmappedComments.push(c);
      }
    }

    // 3. Construct review summary body, appending unmapped/hallucinated comments so they aren't lost
    let finalSummary = `### 智能代码审查报告\n\n${aiSummaryMarkdown}\n\n*本审查意见由智能代码评审助理自动生成。*`;
    
    if (unmappedComments.length > 0) {
      finalSummary += `\n\n---\n\n### ⚠️ 全局或未匹配行号的建议\n*以下建议未能定位到 diff 中的具体代码行（可能位于 diff 范围外，或对应的文件未找到）：*\n\n` + 
        unmappedComments.map((c, idx) => {
          return `${idx + 1}. **[${c.filename}:L${c.line}] (${severityMap[c.severity] || c.severity} / ${categoryMap[c.category] || c.category})**: **${c.title}**\n   ${c.description}${c.codeSuggestion ? `\n   \`\`\`suggestion\n   ${c.codeSuggestion}\n   \`\`\`` : ''}`;
        }).join('\n\n');
    }

    try {
      await submitPRReview(
        owner,
        repo,
        pullNumber,
        activeToken,
        finalSummary,
        validApiComments
      );
      setSubmitStatus({
        success: true,
        message: `成功同步审查意见到 PR #${pullNumber}！(已发送 ${validApiComments.length} 条行级评论，${unmappedComments.length} 条全局建议已随审查总结一同发布)`
      });
    } catch (error: any) {
      setSubmitStatus({
        success: false,
        message: error.message || '未能成功同步审查意见到 GitHub。'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="review-panel-container">
      {/* GitHub Actions Card */}
      <GlassCard style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ flex: 1, minWidth: '280px' }}>
          <h3 style={{ fontSize: '1.05rem', color: 'var(--color-text-primary)' }}>GitHub 协同同步</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '4px', marginBottom: activeToken ? '0' : '12px' }}>
            {activeToken 
              ? '已配置 GitHub 访问令牌。您可以直接将本次审查意见发布到 GitHub PR。' 
              : '在下方配置 GitHub 访问令牌以启用直接同步，并避免 GitHub API 的速率限制。'
            }
          </p>
          {!githubToken && (
            <input
              type="password"
              className="form-input"
              style={{ padding: '8px 12px', fontSize: '0.85rem', maxWidth: '300px' }}
              placeholder="输入 GitHub 个人访问令牌 (ghp_...)"
              value={activeToken}
              onChange={(e) => {
                setActiveToken(e.target.value);
                if (e.target.value) {
                  localStorage.setItem('ai_pr_reviewer_github_token', e.target.value);
                } else {
                  localStorage.removeItem('ai_pr_reviewer_github_token');
                }
              }}
            />
          )}
        </div>

        <button
          className="btn btn-primary"
          onClick={handlePostReview}
          disabled={isSubmitting || comments.length === 0}
        >
          {isSubmitting ? (
            <>
              <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', borderTopColor: '#fff', borderBottomColor: '#fff' }} />
              正在提交审查意见...
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                <path d="M9 18c-4.51 2-5-2-7-2" />
              </svg>
              同步到 GitHub PR
            </>
          )}
        </button>
      </GlassCard>

      {submitStatus && (
        <div style={{
          background: submitStatus.success ? 'var(--bg-success-glow)' : 'var(--bg-critical-glow)',
          border: `1px solid ${submitStatus.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
          color: submitStatus.success ? 'var(--color-success)' : 'var(--color-critical)',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '0.85rem'
        }}>
          {submitStatus.message}
        </div>
      )}

      {/* Filters Card */}
      <GlassCard style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ fontSize: '1.05rem' }}>审查意见列表 ({filteredComments.length})</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            当前筛选显示出 {filteredComments.length} / {comments.length} 条建议
          </span>
        </div>

        {/* Search & Sort Controls */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="form-input"
            style={{ padding: '8px 12px', fontSize: '0.85rem', flex: 1, minWidth: '200px' }}
            placeholder="通过关键字、文件路径搜索意见..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className="form-input"
            style={{ padding: '8px 12px', fontSize: '0.85rem', width: '180px', cursor: 'pointer' }}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="severity">优先级排序 (严重度优先)</option>
            <option value="line">代码位置排序 (行号优先)</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Severity Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', minWidth: '70px' }}>严重程度：</span>
            <div className="filter-bar">
              {['all', 'critical', 'warning', 'info'].map(sev => (
                <button
                  key={sev}
                  className={`filter-chip ${selectedSeverity === sev ? 'active' : ''}`}
                  onClick={() => setSelectedSeverity(sev as any)}
                >
                  {severityLabels[sev]}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', minWidth: '70px' }}>类型分类：</span>
            <div className="filter-bar">
              {['all', 'security', 'performance', 'style', 'logic', 'other'].map(cat => (
                <button
                  key={cat}
                  className={`filter-chip ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat as any)}
                >
                  {categoryLabels[cat]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Suggestions List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredComments.length > 0 ? (
          filteredComments.map(comment => (
            <GlassCard key={comment.id} className="suggestion-card" style={{ padding: '20px' }}>
              <div className="suggestion-header">
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span 
                    className="badge" 
                    style={{ 
                      background: `${getSeverityColor(comment.severity)}15`, 
                      color: getSeverityColor(comment.severity),
                      borderColor: `${getSeverityColor(comment.severity)}30`,
                      fontSize: '0.65rem'
                    }}
                  >
                    {severityMap[comment.severity] || comment.severity}
                  </span>
                  <span className="badge badge-info" style={{ fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center' }}>
                    {getCategoryIcon(comment.category)}
                    {categoryMap[comment.category] || comment.category}
                  </span>
                </div>
                <span className="suggestion-filepath">
                  {comment.filename} : L{comment.line}
                </span>
              </div>

              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px', color: 'var(--color-text-primary)' }}>
                  {comment.title}
                </h4>
                <div style={{ fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--color-text-secondary)' }}>
                  {renderMarkdown(comment.description)}
                </div>
              </div>

              {comment.codeSuggestion && (
                <div className="inline-review-suggestion" style={{ marginTop: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="inline-review-suggestion-title">推荐修复方案</span>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                      onClick={() => {
                        navigator.clipboard.writeText(comment.codeSuggestion!);
                        alert('修复建议代码已复制到剪贴板！');
                      }}
                    >
                      复制建议代码
                    </button>
                  </div>
                  <pre className="inline-review-code"><code>{comment.codeSuggestion}</code></pre>
                </div>
              )}
            </GlassCard>
          ))
        ) : (
          <GlassCard style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            没有符合当前筛选条件的审查意见。
          </GlassCard>
        )}
      </div>
    </div>
  );
}
