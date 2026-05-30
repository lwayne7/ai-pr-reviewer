import { PRInfo, AIReviewSummary } from '../types';
import { GlassCard } from './GlassCard';

interface PRSummaryProps {
  prInfo: PRInfo;
  summary: AIReviewSummary;
}

export function PRSummary({ prInfo, summary }: PRSummaryProps) {
  // Determine risk category color
  const getRiskColor = (score: number) => {
    if (score < 30) return 'var(--color-success)';
    if (score < 70) return 'var(--color-warning)';
    return 'var(--color-critical)';
  };

  const getRiskLabel = (score: number) => {
    if (score < 30) return '低风险';
    if (score < 70) return '中风险';
    return '高风险';
  };

  const totalLines = prInfo.additions + prInfo.deletions;
  const additionsPercent = totalLines > 0 ? (prInfo.additions / totalLines) * 100 : 0;
  const deletionsPercent = totalLines > 0 ? (prInfo.deletions / totalLines) * 100 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* PR Header Info Card */}
      <GlassCard>
        <div className="pr-header-card">
          <div className="pr-title-row">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span className="badge badge-info" style={{ textTransform: 'none' }}>
                  #{prInfo.pullNumber}
                </span>
                <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                  {prInfo.state}
                </span>
              </div>
              <h1 className="pr-title">{prInfo.title}</h1>
            </div>
            
            <a 
              href={prInfo.htmlUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn btn-secondary"
              style={{ padding: '8px 12px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            >
              打开 PR ↗
            </a>
          </div>

          <div className="pr-meta">
            <div className="pr-meta-item">
              <img 
                src={prInfo.authorAvatarUrl} 
                alt={prInfo.author} 
                style={{ width: '20px', height: '20px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)' }} 
              />
              <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{prInfo.author}</span>
            </div>
            <div className="pr-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>{new Date(prInfo.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="pr-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{prInfo.owner}/{prInfo.repo}</span>
            </div>
          </div>
        </div>

        {/* Change Stats Bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
            <span>{prInfo.changedFiles} 个文件被修改</span>
            <span>
              <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>+{prInfo.additions}</span>
              {' / '}
              <span style={{ color: 'var(--color-critical)', fontWeight: 600 }}>-{prInfo.deletions}</span>
            </span>
          </div>
          {totalLines > 0 ? (
            <div style={{ height: '4px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '2px', overflow: 'hidden', display: 'flex', gap: '2px' }}>
              <div style={{ width: `${additionsPercent}%`, background: 'var(--color-success)', borderRadius: '2px 0 0 2px' }} />
              <div style={{ width: `${deletionsPercent}%`, background: 'var(--color-critical)', borderRadius: '0 2px 2px 0' }} />
            </div>
          ) : (
            <div style={{ height: '4px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '2px' }} />
          )}
        </div>

        <div className="pr-stats">
          <div className="stat-box">
            <div className="stat-val additions">+{prInfo.additions}</div>
            <div className="stat-lbl">新增行数</div>
          </div>
          <div className="stat-box">
            <div className="stat-val deletions">-{prInfo.deletions}</div>
            <div className="stat-lbl">删除行数</div>
          </div>
          <div className="stat-box">
            <div className="stat-val">{prInfo.changedFiles}</div>
            <div className="stat-lbl">变更文件</div>
          </div>
        </div>
      </GlassCard>

      {/* AI Summary Card */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
        {/* Main Text Summary */}
        <GlassCard style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '8px', color: 'var(--color-accent)' }}>变更概要评估</h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>{summary.overview}</p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '8px', color: 'var(--color-secondary)' }}>架构冲击分析</h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>{summary.architecturalImpact}</p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '12px', color: 'var(--color-primary)' }}>核心修改点</h2>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {summary.keyChanges.map((change, idx) => (
                <li key={idx} style={{ color: 'var(--color-text-secondary)', fontSize: '0.92rem', lineHeight: '1.5' }}>
                  {change}
                </li>
              ))}
            </ul>
          </div>
        </GlassCard>

        {/* Polished Risk Telemetry Dial */}
        <GlassCard style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', textAlign: 'center', minWidth: '280px' }}>
          <h2 style={{ fontSize: '1rem', color: 'var(--color-text-primary)', fontWeight: 600 }}>项目风险评估指数</h2>
          
          {/* Risk Gauge Circle with precise ticks */}
          <div style={{ position: 'relative', width: '130px', height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="130" height="130" style={{ transform: 'rotate(-90deg)' }}>
              {/* Telemetry Ticked Background Circle */}
              <circle 
                cx="65" 
                cy="65" 
                r="52" 
                fill="none" 
                stroke="rgba(255, 255, 255, 0.04)" 
                strokeWidth="6" 
                strokeDasharray="3 2"
              />
              {/* Ticked Active Arc */}
              <circle 
                cx="65" 
                cy="65" 
                r="52" 
                fill="none" 
                stroke={getRiskColor(summary.riskScore)} 
                strokeWidth="6" 
                strokeDasharray={2 * Math.PI * 52}
                strokeDashoffset={2 * Math.PI * 52 * (1 - summary.riskScore / 100)}
                strokeLinecap="butt"
                style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
              />
            </svg>
            <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '2.25rem', fontWeight: 600, fontFamily: 'var(--font-mono)', color: getRiskColor(summary.riskScore), lineHeight: 1 }}>
                {summary.riskScore}
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '6px' }}>
                SCORE / 100
              </span>
            </div>
          </div>

          <div>
            <span 
              className="badge" 
              style={{ 
                background: 'rgba(255,255,255,0.02)',
                color: getRiskColor(summary.riskScore),
                border: `1px solid ${getRiskColor(summary.riskScore)}25`,
                padding: '4px 12px',
                fontSize: '0.75rem',
                borderRadius: '4px',
                fontFamily: 'var(--font-mono)'
              }}
            >
              {getRiskLabel(summary.riskScore)}
            </span>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: '1.5', padding: '0 8px' }}>
            {summary.riskSummary}
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
