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
      setErrorMsg('无效的 Pull Request 链接。格式必须匹配：https://github.com/owner/repo/pull/number');
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
    <GlassCard style={{ padding: '32px' }}>
      <h2 style={{ marginBottom: '20px', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-primary)' }}>
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        载入代码仓库分支 (PR)
      </h2>

      <form onSubmit={handleSubmit}>
        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label className="form-label" htmlFor="pr-url">
            GitHub Pull Request 链接 *
          </label>
          <input
            id="pr-url"
            type="url"
            className="form-input"
            placeholder="https://github.com/用户名/仓库名/pull/序号"
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
            {showAdvanced ? '隐藏高级选项' : '展开高级选项 (GitHub 认证 Token)'}
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
              GitHub 个人访问令牌 (PAT)
            </label>
            <input
              id="github-token"
              type="password"
              className="form-input"
              style={{ marginTop: '6px' }}
              placeholder="ghp_... (仅私有仓库或达到速率限制时需要)"
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
              正在分析代码变更...
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
              拉取并开始审阅
            </>
          )}
        </button>
      </form>
    </GlassCard>
  );
}
