import { useState } from 'react';
import { SetupForm } from './components/SetupForm';
import { PRSummary } from './components/PRSummary';
import { DiffViewer } from './components/DiffViewer';
import { ReviewPanel } from './components/ReviewPanel';
import { fetchPRDetails, fetchPRFiles, parsePRUrl } from './services/github';
import { analyzePR } from './services/gemini';
import { PRInfo, PRFile, PRReviewResult } from './types';
import { GlassCard } from './components/GlassCard';

export function App() {
  const [githubToken, setGithubToken] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [prUrl, setPrUrl] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');

  const [prInfo, setPrInfo] = useState<PRInfo | null>(null);
  const [files, setFiles] = useState<PRFile[]>([]);
  const [reviewResult, setReviewResult] = useState<PRReviewResult | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'diff' | 'suggestions'>('summary');
  const [error, setError] = useState('');

  const handleSetupComplete = async (
    creds: { githubToken: string; geminiApiKey: string },
    url: string
  ) => {
    setIsLoading(true);
    setError('');
    setGithubToken(creds.githubToken);
    setGeminiApiKey(creds.geminiApiKey);
    setPrUrl(url);

    const parsed = parsePRUrl(url);
    if (!parsed) {
      setError('Invalid Pull Request URL');
      setIsLoading(false);
      return;
    }

    try {
      // 1. Fetch Pull Request metadata
      const info = await fetchPRDetails(parsed.owner, parsed.repo, parsed.pullNumber, creds.githubToken);
      setPrInfo(info);

      // 2. Fetch Pull Request changed files
      const prFiles = await fetchPRFiles(parsed.owner, parsed.repo, parsed.pullNumber, creds.githubToken);
      setFiles(prFiles);

      // 3. Analyze code changes using Gemini model
      const result = await analyzePR(info, prFiles, creds.geminiApiKey, selectedModel);
      setReviewResult(result);
      setActiveTab('summary');
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'An unexpected error occurred during PR analysis.');
      setPrInfo(null);
      setFiles([]);
      setReviewResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setPrInfo(null);
    setFiles([]);
    setReviewResult(null);
    setError('');
  };

  return (
    <div className="app-container">
      {/* Premium Header */}
      <header className="app-header">
        <div className="brand">
          <div className="brand-logo">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
              <line x1="12" y1="22" x2="12" y2="12" />
              <line x1="12" y1="12" x2="22" y2="8.5" />
              <line x1="12" y1="12" x2="2" y2="8.5" />
            </svg>
          </div>
          <div>
            <h1 className="brand-title">AI PR REVIEWER</h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Advanced Code Intelligence
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Model Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Model:</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="form-input"
              style={{ padding: '6px 12px', fontSize: '0.85rem', width: 'auto', background: 'rgba(0,0,0,0.5)', cursor: 'pointer' }}
              disabled={isLoading || !!reviewResult}
            >
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fast)</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Reasoning)</option>
            </select>
          </div>

          {reviewResult && (
            <button className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={handleReset}>
              Reset Analysis
            </button>
          )}
        </div>
      </header>

      {/* Main Panel Content */}
      <main style={{ flex: 1 }}>
        {error && (
          <div style={{
            background: 'var(--bg-critical-glow)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: 'var(--color-critical)',
            padding: '16px',
            borderRadius: '12px',
            fontSize: '0.9rem',
            marginBottom: '24px'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '4px' }}>Analysis Failed</h3>
            {error}
          </div>
        )}

        {!reviewResult ? (
          /* Landing Setup Screen */
          <div className="grid-dashboard">
            <SetupForm onSetupComplete={handleSetupComplete} isLoading={isLoading} />
            
            <GlassCard style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h2 style={{ fontSize: '1.25rem', color: 'var(--color-accent)' }}>AI Code Review Assistance</h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                Paste any GitHub Pull Request URL to fetch its full patch diffs and submit it for a multi-stage AI review. Review results are structured securely client-side.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ color: 'var(--color-primary)', marginTop: '2px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>PR Change Summarization</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      Generates a concise functional summary and explains changes' architectural footprint and dependencies.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ color: 'var(--color-secondary)', marginTop: '2px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Risk & Vulnerability Isolation</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      Detects logic bugs, security leaks (API tokens, SQL injection, XSS), race conditions, and heavy loops.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ color: 'var(--color-accent)', marginTop: '2px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Interactive Diff Annotations</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      Inspect code diffs inline with AI suggestions overlaid at exact target line offsets, including one-click copyable code suggestions.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ color: 'var(--color-success)', marginTop: '2px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>PR Feedback Syncing</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      Publish review reports and line-level recommendations directly to the GitHub PR under your active credentials.
                    </p>
                  </div>
                </div>
              </div>

              <div style={{
                marginTop: '16px',
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '0.8rem',
                color: 'var(--color-text-muted)'
              }}>
                <strong>Privacy Info:</strong> Your API keys and source code diffs are processed directly client-side. Key details are saved locally in your browser and never transit to third-party database servers.
              </div>
            </GlassCard>
          </div>
        ) : (
          /* Active Review Workspace Screen */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Tab navigation */}
            <div className="tabs-container">
              <button 
                className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
                onClick={() => setActiveTab('summary')}
              >
                PR Summary
              </button>
              <button 
                className={`tab-btn ${activeTab === 'diff' ? 'active' : ''}`}
                onClick={() => setActiveTab('diff')}
              >
                Inspect Diff Diffs
              </button>
              <button 
                className={`tab-btn ${activeTab === 'suggestions' ? 'active' : ''}`}
                onClick={() => setActiveTab('suggestions')}
              >
                AI Suggestions ({reviewResult.comments.length})
              </button>
            </div>

            {/* Tab Panes */}
            <div>
              {activeTab === 'summary' && prInfo && (
                <PRSummary prInfo={prInfo} summary={reviewResult.summary} />
              )}
              {activeTab === 'diff' && (
                <DiffViewer files={files} comments={reviewResult.comments} />
              )}
              {activeTab === 'suggestions' && prInfo && (
                <ReviewPanel 
                  comments={reviewResult.comments}
                  owner={prInfo.owner}
                  repo={prInfo.repo}
                  pullNumber={prInfo.pullNumber}
                  githubToken={githubToken}
                  aiSummaryMarkdown={reviewResult.summary.overview}
                />
              )}
            </div>
          </div>
        )}
      </main>

      <footer style={{
        marginTop: 'auto',
        padding: '24px 0 12px 0',
        borderTop: '1px solid var(--border-color)',
        textAlign: 'center',
        fontSize: '0.75rem',
        color: 'var(--color-text-muted)'
      }}>
        © 2026 AI Pull Request Reviewer Assistant. Running securely in Sandbox Mode.
      </footer>
    </div>
  );
}
export default App;
