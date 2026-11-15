import React from 'react';
import { clsx } from 'clsx';

interface CodeSnippetProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  className?: string;
  diff?: boolean;
}

function highlightDiff(line: string): string {
  if (line.startsWith('+') && !line.startsWith('+++')) return 'diff-add';
  if (line.startsWith('-') && !line.startsWith('---')) return 'diff-remove';
  if (line.startsWith('@@')) return 'diff-header';
  return '';
}

export default function CodeSnippet({
  code,
  language = 'python',
  filename,
  showLineNumbers = false,
  className,
  diff = false,
}: CodeSnippetProps) {
  const lines = code.split('\n');

  return (
    <div className={clsx('rounded-lg overflow-hidden border border-gray-700', className)}>
      {filename && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700">
          <span className="text-xs font-mono text-gray-400">{filename}</span>
          <span className="text-xs text-gray-500 uppercase tracking-wide">{language}</span>
        </div>
      )}
      <pre className="bg-gray-900 overflow-x-auto text-sm font-mono leading-relaxed p-4">
        {diff
          ? lines.map((line, i) => {
              const cls = highlightDiff(line);
              return (
                <div key={i} className={clsx('px-1 rounded', cls)}>
                  {showLineNumbers && (
                    <span className="select-none mr-4 text-gray-600 text-xs w-8 inline-block text-right">
                      {i + 1}
                    </span>
                  )}
                  <span>{line || '\u00a0'}</span>
                </div>
              );
            })
          : lines.map((line, i) => (
              <div key={i}>
                {showLineNumbers && (
                  <span className="select-none mr-4 text-gray-600 text-xs w-8 inline-block text-right">
                    {i + 1}
                  </span>
                )}
                <span className="text-gray-200">{line || '\u00a0'}</span>
              </div>
            ))}
      </pre>
    </div>
  );
}
