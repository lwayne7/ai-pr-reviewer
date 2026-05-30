import React, { useState } from 'react';
import { PRFile, AIReviewComment } from '../types';
import { parsePatch } from '../services/github';
import { GlassCard } from './GlassCard';

interface DiffViewerProps {
  files: PRFile[];
  comments: AIReviewComment[];
}

export function DiffViewer({ files, comments }: DiffViewerProps) {
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);

  const selectedFile = files[selectedFileIdx];
  const selectedFileComments = comments.filter(c => c.filename === selectedFile?.filename);

  // Group comments by line number for inline insertion
  const commentsByLine = selectedFileComments.reduce((acc, c) => {
    if (!acc[c.line]) acc[c.line] = [];
    acc[c.line].push(c);
    return acc;
  }, {} as Record<number, AIReviewComment[]>);

  // Parse patch if available
  const hunks = selectedFile?.patch ? parsePatch(selectedFile.patch) : [];

  // Helper to count issues per file
  const getFileCommentCount = (filename: string) => {
    return comments.filter(c => c.filename === filename).length;
  };

  const getSeverityColor = (severity: string) => {
    if (severity === 'critical') return 'var(--color-critical)';
    if (severity === 'warning') return 'var(--color-warning)';
    return 'var(--color-info)';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('代码修复建议已复制到剪贴板！');
  };

  return (
    <div className="pr-content-grid">
      {/* File List Side Panel */}
      <GlassCard className="file-list-card" style={{ padding: '16px' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', color: 'var(--color-text-primary)' }}>已变更文件</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {files.map((file, idx) => {
            const commentCount = getFileCommentCount(file.filename);
            const isActive = idx === selectedFileIdx;
            
            return (
              <div 
                key={file.filename}
                className={`file-item ${isActive ? 'active' : ''}`}
                onClick={() => setSelectedFileIdx(idx)}
              >
                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1, paddingRight: '8px' }}>
                  <span className="file-name" title={file.filename}>{file.filename}</span>
                  <div className="file-stats">
                    <span className="file-additions">+{file.additions}</span>
                    <span style={{ color: 'var(--color-text-muted)' }}>/</span>
                    <span className="file-deletions">-{file.deletions}</span>
                  </div>
                </div>
                
                {commentCount > 0 && (
                  <span 
                    className="file-badge-issues"
                    title={`${commentCount} AI suggestions`}
                    style={{
                      background: commentCount >= 3 ? 'var(--color-critical)' : 
                                  commentCount >= 1 ? 'var(--color-warning)' : 'var(--color-primary)'
                    }}
                  >
                    {commentCount}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Main Diff Code Display */}
      <div className="workspace-wrapper">
        {selectedFile ? (
          <div className="diff-container">
            <div className="diff-file-header">
              <span className="diff-filepath" style={{ fontFamily: 'var(--font-mono)' }}>{selectedFile.filename}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                文件状态: <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{selectedFile.status}</span>
              </span>
            </div>

            <div className="diff-content">
              {hunks.length > 0 ? (
                <table className="diff-table">
                  <tbody>
                    {hunks.map((hunk, hIdx) => (
                      <React.Fragment key={hIdx}>
                        {hunk.lines.map((line, lIdx) => {
                          const isAddition = line.type === 'addition';
                          const isDeletion = line.type === 'deletion';
                          const isHunkHeader = line.type === 'hunk-header';
                          
                          let lineClass = '';
                          if (isAddition) lineClass = 'addition';
                          else if (isDeletion) lineClass = 'deletion';
                          else if (isHunkHeader) lineClass = 'hunk-header';

                          // Check if we have inline comments for this right side line (modified/added lines)
                          const rightLineNum = line.rightLineNum;
                          const inlineComments = rightLineNum ? commentsByLine[rightLineNum] : [];

                          return (
                            <React.Fragment key={lIdx}>
                              <tr className={`diff-line ${lineClass}`}>
                                <td className="diff-linenum">
                                  {isHunkHeader ? '@@' : (isAddition ? '' : line.leftLineNum)}
                                </td>
                                <td className="diff-linenum">
                                  {isHunkHeader ? '@@' : (isDeletion ? '' : line.rightLineNum)}
                                </td>
                                <td className="diff-code">
                                  {isHunkHeader ? line.content : (isAddition ? `+${line.content}` : (isDeletion ? `-${line.content}` : ` ${line.content}`))}
                                </td>
                              </tr>
                              
                              {/* Overlay Inline AI comments directly below the matching line */}
                              {inlineComments && inlineComments.length > 0 && (
                                <tr>
                                  <td colSpan={3}>
                                    {inlineComments.map(comment => (
                                      <div key={comment.id} className="inline-review-container">
                                        <div className="inline-review-header">
                                          <div className="inline-review-author">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                              <path d="m12 3-1.912 5.886H3.82l4.992 3.63L6.9 18.4 12 14.77l5.1 3.63-1.912-5.884 4.992-3.63h-6.268Z" />
                                            </svg>
                                            审阅建议
                                          </div>
                                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <span 
                                              className="badge" 
                                              style={{ 
                                                background: `${getSeverityColor(comment.severity)}15`, 
                                                color: getSeverityColor(comment.severity),
                                                borderColor: `${getSeverityColor(comment.severity)}30`,
                                                fontSize: '0.65rem',
                                                padding: '2px 8px'
                                              }}
                                            >
                                              {comment.severity}
                                            </span>
                                            <span className="badge badge-info" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                                              {comment.category}
                                            </span>
                                          </div>
                                        </div>
                                        
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                          <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                                            {comment.title}
                                          </h4>
                                          <p className="inline-review-comment">
                                            {comment.description}
                                          </p>
                                        </div>

                                        {comment.codeSuggestion && (
                                          <div className="inline-review-suggestion">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                              <span className="inline-review-suggestion-title">推荐修复代码</span>
                                              <button 
                                                className="btn btn-secondary" 
                                                style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                                                onClick={() => copyToClipboard(comment.codeSuggestion!)}
                                              >
                                                复制建议
                                              </button>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                                              {/* Original Code */}
                                              <div style={{ display: 'flex', background: 'rgba(239, 68, 68, 0.08)', padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                <span style={{ color: 'var(--color-critical)', marginRight: '12px', userSelect: 'none', width: '10px' }}>-</span>
                                                <span style={{ color: '#fca5a5', whiteSpace: 'pre-wrap', wordBreak: 'break-all', flex: 1 }}>{line.content}</span>
                                              </div>
                                              {/* Suggested Code */}
                                              <div style={{ display: 'flex', background: 'rgba(16, 185, 129, 0.08)', padding: '6px 12px' }}>
                                                <span style={{ color: 'var(--color-success)', marginRight: '12px', userSelect: 'none', width: '10px' }}>+</span>
                                                <span style={{ color: '#a7f3d0', whiteSpace: 'pre-wrap', wordBreak: 'break-all', flex: 1 }}>{comment.codeSuggestion}</span>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                  此文件暂无代码变更或差异对比内容（二进制文件或空补丁）。
                </div>
              )}
            </div>
          </div>
        ) : (
          <GlassCard style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>请在左侧文件列表中选择文件以查看具体的代码变更</span>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
