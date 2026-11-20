'use client';

import React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownPreviewProps {
  content: string;
  emptyMessage?: string;
}

export function MarkdownPreview({
  content,
  emptyMessage = 'Nothing to preview yet. Start writing in the Markdown editor.',
}: MarkdownPreviewProps) {
  if (!content || !content.trim()) {
    return (
      <div className="py-10 text-center text-xs text-zinc-400 dark:text-zinc-500 italic">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed space-y-3 break-words">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-zinc-50 mt-4 mb-2 pb-1.5 border-b border-zinc-200 dark:border-zinc-800">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-4 mb-1.5">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-3 mb-1">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="leading-relaxed my-2">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 my-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 my-2">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-sky-500 pl-3.5 py-1 my-3 bg-sky-50/50 dark:bg-sky-950/30 rounded-r-lg text-zinc-700 dark:text-zinc-300 italic">
              {children}
            </blockquote>
          ),
          code: ({ className, children, ...props }) => {
            const isBlock = Boolean(className && className.includes('language-'));
            if (isBlock) {
              return (
                <code
                  className={`block font-mono text-xs bg-zinc-900 text-zinc-100 dark:bg-zinc-950 p-3.5 rounded-xl overflow-x-auto border border-zinc-800 my-2.5 ${className || ''}`}
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                className="font-mono text-xs px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-sky-700 dark:text-sky-300"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => <pre className="my-2 overflow-x-auto">{children}</pre>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 dark:text-sky-400 underline hover:text-sky-500 font-medium"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 border border-zinc-200 dark:border-zinc-800 rounded-xl">
              <table className="w-full text-xs text-left border-collapse">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 font-semibold text-zinc-800 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800/60">
              {children}
            </td>
          ),
          hr: () => <hr className="my-4 border-zinc-200 dark:border-zinc-800" />,
          input: ({ type, checked }) => {
            if (type === 'checkbox') {
              return (
                <input
                  type="checkbox"
                  checked={Boolean(checked)}
                  readOnly
                  className="mr-2 align-middle accent-sky-600 rounded"
                />
              );
            }
            return null;
          },
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
