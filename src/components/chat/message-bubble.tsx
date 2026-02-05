'use client';

import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageBubbleProps {
  content: string;
  role: 'user' | 'assistant';
}

export function MessageBubble({ content, role }: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[85%] px-4 py-2.5 ${
          isUser
            ? 'bg-accent text-accent-foreground rounded-2xl rounded-br-md'
            : 'bg-muted text-foreground rounded-2xl rounded-bl-md'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm">{content}</p>
        ) : (
          <div className="prose prose-sm max-w-none text-sm">
            <Markdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Paragraph styling
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                // Table styling for product comparisons
                table: ({ children }) => (
                  <div className="overflow-x-auto my-2 -mx-2">
                    <table className="min-w-full border-collapse text-xs">
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border border-border bg-table-header px-2 py-1.5 text-left font-medium">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-border px-2 py-1.5">{children}</td>
                ),
                // List styling
                ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="text-sm">{children}</li>,
                // Code styling (inline and block)
                code: ({ className, children }) => {
                  const isBlock = className?.includes('language-');
                  return isBlock ? (
                    <code className={`block bg-background/50 p-2 rounded text-xs overflow-x-auto ${className}`}>
                      {children}
                    </code>
                  ) : (
                    <code className="bg-background/50 px-1 py-0.5 rounded text-xs">{children}</code>
                  );
                },
                // Strong/bold
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              }}
            >
              {content}
            </Markdown>
          </div>
        )}
      </div>
    </div>
  );
}
