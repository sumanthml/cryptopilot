import React from 'react';
import { clsx } from 'clsx';

interface StatusDotProps {
  status: string;
  className?: string;
  label?: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-400',
  scanning: 'bg-blue-400 animate-pulse',
  running: 'bg-blue-400 animate-pulse',
  completed: 'bg-green-400',
  passed: 'bg-green-400',
  failed: 'bg-red-400',
  open: 'bg-red-400',
  accepted: 'bg-blue-400',
  mitigated: 'bg-green-400',
  false_positive: 'bg-gray-400',
  draft: 'bg-gray-400',
  in_progress: 'bg-indigo-400 animate-pulse',
  active: 'bg-green-400',
  inactive: 'bg-gray-400',
};

export default function StatusDot({ status, className, label }: StatusDotProps) {
  const color = statusColors[status] || 'bg-gray-400';

  return (
    <span className={clsx('inline-flex items-center gap-1.5', className)}>
      <span className={clsx('w-2 h-2 rounded-full shrink-0', color)} />
      {label && <span className="text-sm text-gray-300">{label}</span>}
    </span>
  );
}
