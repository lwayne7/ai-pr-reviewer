import { useState } from 'react';
import { AIReviewComment, SeverityType, CategoryType } from '../types';
import { GlassCard } from './GlassCard';
import { submitPRReview } from '../services/github';

interface ReviewPanelProps {
  comments: AIReviewComment[];
  owner: string;
  repo: string;
  pullNumber: number;
  githubToken?: string;
  aiSummaryMarkdown: string; // The text summary we want to post as the review body
}

export function ReviewPanel({
  comments,
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
    if (!githubToken) {
      alert('GitHub Personal Access Token is required to post reviews. Please enter it in the setup configuration.');
      return;
    }
    
    setIsSubmitting(true);
    setSubmitStatus(null);

    // Map comments to the structure required by the GitHub API helper
    const apiComments = comments.map(c => ({
      path: c.filename,
      line: c.line,
      body: `**[AI Code Review - ${c.severity.toUpperCase()} (${c.category.toUpperCase()})]**: ${c.title}\n\n${c.description}${c.codeSuggestion ? `\n\n\`\`\`suggestion\n${c.codeSuggestion}\n\`\`\`` : ''}`
    }));

    try {
      await submitPRReview(
        owner,
        repo,
        pullNumber,
        githubToken,
        `### AI PR Review Report\n\n${aiSummaryMarkdown}\n\n*Review comments posted automatically by AI PR Reviewer.*`,
        apiComments
      );
      setSubmitStatus({
        success: true,
        message: `Successfully posted review with ${comments.length} comments to PR #${pullNumber}!`
      });
    } catch (error: any) {
      setSubmitStatus({
        success: false,
        message: error.message || 'Failed to submit review to GitHub.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="review-panel-container">
      {/* GitHub Actions Card */}
      <GlassCard style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', color: 'var(--color-text-primary)' }}>GitHub Integration</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            {githubToken 
              ? 'GitHub Access Token is set. You can publish this review directly to the PR.' 
              : 'Provide a GitHub Token in the config to sync comments directly back to your PR.'
            }
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={handlePostReview}
          disabled={isSubmitting || comments.length === 0}
        >
          {isSubmitting ? (
            <>
              <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', borderTopColor: '#fff', borderBottomColor: '#fff' }} />
              Submitting review...
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                <path d="M9 18c-4.51 2-5-2-7-2" />
              </svg>
              Post Review to GitHub
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
          <h3 style={{ fontSize: '1.05rem' }}>AI Recommendations ({filteredComments.length})</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Showing {filteredComments.length} of {comments.length} issues
          </span>
        </div>

        {/* Search & Sort Controls */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="form-input"
            style={{ padding: '8px 12px', fontSize: '0.85rem', flex: 1, minWidth: '200px' }}
            placeholder="Search suggestions by keyword, file path..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className="form-input"
            style={{ padding: '8px 12px', fontSize: '0.85rem', width: '180px', cursor: 'pointer' }}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="severity">Sort: Severity First</option>
            <option value="line">Sort: Line Number</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Severity Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', minWidth: '70px' }}>Severity:</span>
            <div className="filter-bar">
              {['all', 'critical', 'warning', 'info'].map(sev => (
                <button
                  key={sev}
                  className={`filter-chip ${selectedSeverity === sev ? 'active' : ''}`}
                  onClick={() => setSelectedSeverity(sev as any)}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', minWidth: '70px' }}>Category:</span>
            <div className="filter-bar">
              {['all', 'security', 'performance', 'style', 'logic', 'other'].map(cat => (
                <button
                  key={cat}
                  className={`filter-chip ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat as any)}
                >
                  {cat}
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
                    {comment.severity}
                  </span>
                  <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                    {comment.category}
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
                <p className="suggestion-desc">
                  {comment.description}
                </p>
              </div>

              {comment.codeSuggestion && (
                <div className="inline-review-suggestion" style={{ marginTop: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="inline-review-suggestion-title">Proposed Fix</span>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                      onClick={() => {
                        navigator.clipboard.writeText(comment.codeSuggestion!);
                        alert('Copied suggestion to clipboard!');
                      }}
                    >
                      Copy code
                    </button>
                  </div>
                  <pre className="inline-review-code"><code>{comment.codeSuggestion}</code></pre>
                </div>
              )}
            </GlassCard>
          ))
        ) : (
          <GlassCard style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            No recommendations match the selected filters.
          </GlassCard>
        )}
      </div>
    </div>
  );
}
