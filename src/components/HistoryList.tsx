import { CachedReview } from '../types';
import { GlassCard } from './GlassCard';

interface HistoryListProps {
  history: CachedReview[];
  onSelectReview: (review: CachedReview) => void;
  onClearAll: () => void;
}

export function HistoryList({ history, onSelectReview, onClearAll }: HistoryListProps) {
  const getRiskColor = (score: number) => {
    if (score < 30) return 'var(--color-success)';
    if (score < 70) return 'var(--color-warning)';
    return 'var(--color-critical)';
  };

  if (history.length === 0) {
    return null;
  }

  return (
    <GlassCard style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-primary)' }}>
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M12 7v5l4 2" />
          </svg>
          Recent Reviews
        </h3>
        <button 
          className="btn btn-secondary" 
          style={{ padding: '4px 8px', fontSize: '0.75rem', border: 'none', background: 'none', color: 'var(--color-text-muted)' }}
          onClick={onClearAll}
        >
          Clear All
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
        {history.map((item) => {
          const formattedDate = new Date(item.timestamp).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          return (
            <div
              key={item.id}
              onClick={() => onSelectReview(item)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-color)',
                cursor: 'pointer',
                transition: 'var(--transition-fast)'
              }}
              className="history-item-hover"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden', flex: 1, paddingRight: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  <span>{item.prInfo.owner}/{item.prInfo.repo}</span>
                  <span style={{ color: 'var(--color-primary)' }}>#{item.prInfo.pullNumber}</span>
                </div>
                <span 
                  style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  title={item.prInfo.title}
                >
                  {item.prInfo.title}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{formattedDate}</span>
              </div>

              <div 
                style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  background: `${getRiskColor(item.result.summary.riskScore)}15`, 
                  border: `1px solid ${getRiskColor(item.result.summary.riskScore)}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: getRiskColor(item.result.summary.riskScore),
                  boxShadow: `0 0 10px ${getRiskColor(item.result.summary.riskScore)}10`
                }}
                title={`Risk Score: ${item.result.summary.riskScore}`}
              >
                {item.result.summary.riskScore}
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
