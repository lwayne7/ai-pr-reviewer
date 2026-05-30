import { useState, useEffect } from 'react';
import { SetupForm } from './components/SetupForm';
import { PRSummary } from './components/PRSummary';
import { DiffViewer } from './components/DiffViewer';
import { ReviewPanel } from './components/ReviewPanel';
import { fetchPRDetails, fetchPRFiles, parsePRUrl } from './services/github';
import { analyzePR } from './services/ai';
import { PRInfo, PRFile, PRReviewResult, CachedReview } from './types';
import { GlassCard } from './components/GlassCard';
import { HistoryList } from './components/HistoryList';
import { getReviewHistory, saveReviewToHistory, clearReviewHistory } from './services/history';

export function App() {
  const [githubToken, setGithubToken] = useState('');
  const [selectedModel, setSelectedModel] = useState('qwen-plus');

  const [prInfo, setPrInfo] = useState<PRInfo | null>(null);
  const [files, setFiles] = useState<PRFile[]>([]);
  const [reviewResult, setReviewResult] = useState<PRReviewResult | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'diff' | 'suggestions'>('summary');
  const [error, setError] = useState('');
  const [history, setHistory] = useState<CachedReview[]>([]);

  useEffect(() => {
    setHistory(getReviewHistory());
  }, []);

  const handleSelectHistory = (cached: CachedReview) => {
    setPrInfo(cached.prInfo);
    setFiles(cached.files);
    setReviewResult(cached.result);
    setActiveTab('summary');
  };

  const handleClearHistory = () => {
    clearReviewHistory();
    setHistory([]);
  };

  const handleSetupComplete = async (
    creds: { githubToken: string },
    url: string
  ) => {
    setIsLoading(true);
    setError('');
    setGithubToken(creds.githubToken);

    const parsed = parsePRUrl(url);
    if (!parsed) {
      setError('无效的 Pull Request 链接。请确保链接格式正确。');
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

      // 3. Analyze code changes using backend AI service (Aliyun Qwen)
      const result = await analyzePR(info, prFiles, selectedModel);
      setReviewResult(result);
      
      // Save to local history
      const cachedReview: CachedReview = {
        id: `${parsed.owner}/${parsed.repo}#${parsed.pullNumber}`,
        prInfo: info,
        files: prFiles,
        result,
        timestamp: Date.now()
      };
      saveReviewToHistory(cachedReview);
      setHistory(getReviewHistory());

      setActiveTab('summary');
    } catch (e: any) {
      console.error(e);
      setError(e.message || '在分析 PR 差异代码时发生意外错误。');
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
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'none', letterSpacing: '0.05em' }}>
              开发团队智能审查助理
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Model Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>审阅模型：</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="form-input"
              style={{ padding: '6px 12px', fontSize: '0.85rem', width: 'auto', background: 'rgba(0,0,0,0.5)', cursor: 'pointer' }}
              disabled={isLoading || !!reviewResult}
            >
              <option value="qwen-plus">qwen-plus (均衡性能版)</option>
              <option value="qwen-max">qwen-max (旗舰超强版)</option>
              <option value="qwen2.5-coder-72b-instruct">qwen2.5-coder-72b-instruct (最强代码专家)</option>
              <option value="qwen2.5-coder-32b-instruct">qwen2.5-coder-32b-instruct (高效代码专家)</option>
              <option value="qwen-turbo">qwen-turbo (极速轻量版)</option>
            </select>
          </div>

          {reviewResult && (
            <button className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={handleReset}>
              重新开始
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
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '4px' }}>代码审查失败</h3>
            {error}
          </div>
        )}

        {!reviewResult ? (
          /* Landing Setup Screen */
          <div className="grid-dashboard">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <SetupForm onSetupComplete={handleSetupComplete} isLoading={isLoading} />
              <HistoryList 
                history={history} 
                onSelectReview={handleSelectHistory} 
                onClearAll={handleClearHistory} 
              />
            </div>
            
            <GlassCard style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h2 style={{ fontSize: '1.25rem', color: 'var(--color-accent)' }}>智能代码审查助理</h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                输入任意 GitHub Pull Request 链接，拉取代码变更的 diff 补丁，并提交进行多阶段的深度安全、逻辑与架构风险评估。所有审查结果安全地在本地加载和缓存。
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
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>变更概要与架构评估</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      智能总结本次变更的功能要点，并分析其带来的架构冲击、API 变动和模块间依赖关系。
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
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>代码缺陷与安全风险排查</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      深度扫描逻辑缺陷、硬编码秘钥（API Token/密钥）、安全风险（SQL 注入/XSS）、并发竞争条件和效率瓶颈。
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
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>文件差异行内对照标注</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      还原经典代码差异（Diff）对照视图，在被修改代码行下方就地渲染审查建议，并提供一键复制的重构方案。
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
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>审查卡片一键同步</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      支持使用您自己的 GitHub 访问令牌，将审查大纲和行内评审卡片一键同步并提交到 GitHub Pull Request 官方评论区。
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
                <strong>隐私说明：</strong> 您的阿里云 API 密钥安全地保存在您的本地后端服务中。PR 补丁内容均经由您本地启动的后端服务代理转发给 DashScope (通义千问) 模型进行处理。
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
                PR 概要评估
              </button>
              <button 
                className={`tab-btn ${activeTab === 'diff' ? 'active' : ''}`}
                onClick={() => setActiveTab('diff')}
              >
                文件差异比对
              </button>
              <button 
                className={`tab-btn ${activeTab === 'suggestions' ? 'active' : ''}`}
                onClick={() => setActiveTab('suggestions')}
              >
                行内审查建议 ({reviewResult.comments.length})
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
                  files={files}
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
        © 2026 智能代码评审助理. 运行于沙箱隔离环境中。
      </footer>
    </div>
  );
}
export default App;
