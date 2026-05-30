import React from 'react';

/**
 * Parses inline markdown format (bold, code, links) and returns a list of React nodes.
 */
function parseInline(text: string): React.ReactNode[] {
  // Regex to match code block: `code` or bold block: **bold**
  const regex = /(\*\*.*?\*\*|`.*?`|\*.*?\*)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} style={{ color: 'var(--color-text-primary)', fontWeight: 650 }}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code 
          key={index} 
          style={{ 
            background: 'rgba(255, 255, 255, 0.05)', 
            border: '1px solid rgba(255, 255, 255, 0.05)',
            padding: '2px 5px', 
            borderRadius: '4px', 
            fontFamily: 'var(--font-mono)', 
            fontSize: '0.85em', 
            color: 'var(--color-accent)' 
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

/**
 * Lightweight, safe React-based Markdown renderer.
 * Supports bold, italics, inline code, paragraphs, and list items.
 */
export function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null;

  // Split into lines to parse list blocks and paragraph blocks
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let currentListItems: React.ReactNode[] = [];

  const flushList = (key: number) => {
    if (currentListItems.length > 0) {
      blocks.push(
        <ul 
          key={`list-${key}`} 
          style={{ 
            paddingLeft: '20px', 
            margin: '8px 0 12px 0', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '6px' 
          }}
        >
          {currentListItems}
        </ul>
      );
      currentListItems = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Match bullet points (unordered lists)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const content = trimmed.substring(2);
      currentListItems.push(
        <li 
          key={`li-${idx}`} 
          style={{ 
            color: 'var(--color-text-secondary)', 
            fontSize: '0.9rem', 
            lineHeight: '1.5' 
          }}
        >
          {parseInline(content)}
        </li>
      );
    } 
    // Match numbered list
    else if (/^\d+\.\s/.test(trimmed)) {
      const match = trimmed.match(/^(\d+)\.\s(.*)/);
      const content = match ? match[2] : trimmed;
      currentListItems.push(
        <li 
          key={`li-num-${idx}`} 
          style={{ 
            color: 'var(--color-text-secondary)', 
            fontSize: '0.9rem', 
            lineHeight: '1.5' 
          }}
        >
          {parseInline(content)}
        </li>
      );
    }
    // Match header tags
    else if (trimmed.startsWith('### ')) {
      flushList(idx);
      blocks.push(
        <h4 
          key={`h4-${idx}`} 
          style={{ 
            fontSize: '1rem', 
            fontWeight: 650, 
            marginTop: '16px', 
            marginBottom: '8px',
            color: 'var(--color-text-primary)' 
          }}
        >
          {parseInline(trimmed.substring(4))}
        </h4>
      );
    }
    else if (trimmed.startsWith('## ')) {
      flushList(idx);
      blocks.push(
        <h3 
          key={`h3-${idx}`} 
          style={{ 
            fontSize: '1.15rem', 
            fontWeight: 650, 
            marginTop: '20px', 
            marginBottom: '10px',
            color: 'var(--color-text-primary)' 
          }}
        >
          {parseInline(trimmed.substring(3))}
        </h3>
      );
    }
    // Match line break or empty line
    else if (trimmed === '') {
      flushList(idx);
    } 
    // Paragraph
    else {
      flushList(idx);
      blocks.push(
        <p 
          key={`p-${idx}`} 
          style={{ 
            marginBottom: '10px', 
            fontSize: '0.9rem', 
            lineHeight: '1.6', 
            color: 'var(--color-text-secondary)' 
          }}
        >
          {parseInline(line)}
        </p>
      );
    }
  });

  // Flush any remaining list items
  flushList(lines.length);

  return <div className="analysis-markdown">{blocks}</div>;
}
