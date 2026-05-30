import React, { useState, useEffect } from 'react';
import { GlassCard } from './GlassCard';
import { parsePRUrl } from '../services/github';

interface SetupFormProps {
  onSetupComplete: (credentials: { githubToken: string }, prUrl: string) => void;
  isLoading: boolean;
}

export function SetupForm({ onSetupComplete, isLoading }: SetupFormProps) {
  const [githubToken, setGithubToken] = useState('');
  const [prUrl, setPrUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Load saved credentials on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('ai_pr_reviewer_github_token');
    if (savedToken) setGithubToken(savedToken);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const prInfo = parsePRUrl(prUrl);
    if (!prInfo) {
      setErrorMsg('Invalid Pull Request URL. Must match format: https://github.com/owner/repo/pull/number');
      return;
    }

    // Save tokens
    if (githubToken) {
      localStorage.setItem('ai_pr_reviewer_github_token', githubToken);
    } else {
      localStorage.removeItem('ai_pr_reviewer_github_token');
    }

    onSetupComplete({ githubToken }, prUrl);
  };

  return (
    <GlassCard glow className="panel-glow-indigo">
      <h2 style={{ marginBottom: '24px', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-primary)' }}>
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        Review Configuration
      </h2>

      <form onSubmit={handleSubmit}>
        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label className="form-label" htmlFor="pr-url">
            GitHub Pull Request URL *
          </label>
          <input
            id="pr-url"
            type="url"
            className="form-input"
            placeholder="https://github.com/owner/repo/pull/123"
            value={prUrl}
            onChange={(e) => setPrUrl(e.target.value)}
            required
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ 
              background: 'none', 
              border: 'none', 
              padding: '0', 
              fontSize: '0.85rem', 
              color: 'var(--color-primary)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              cursor: 'pointer',
              fontWeight: 500,
              boxShadow: 'none'
            }}
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <svg 
              width="14" 
              height="14" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              style={{ transform: showAdvanced ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options (GitHub Auth Token)'}
          </button>
        </div>

        {showAdvanced && (
          <div className="form-group" style={{ 
            marginTop: '8px', 
            padding: '16px', 
            background: 'rgba(255, 255, 255, 0.01)', 
            border: '1px dashed rgba(255, 255, 255, 0.05)', 
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <label className="form-label" htmlFor="github-token">
              GitHub Personal Access Token (PAT)
            </label>
            <input
              id="github-token"
              type="password"
              className="form-input"
              style={{ marginTop: '6px' }}
              placeholder="ghp_... (Only required for private repos or rate limits)"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
            />
          </div>
        )}

        {errorMsg && (
          <div style={{
            background: 'var(--bg-critical-glow)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: 'var(--color-critical)',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '0.875rem',
            marginBottom: '20px'
          }}>
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%' }}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', borderTopColor: '#fff', borderBottomColor: '#fff' }} />
              Running Analysis...
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
              Fetch & Review
            </>
          )}
        </button>
      </form>
    </GlassCard>
  );
}
