import React from 'react';
import { clsx } from 'clsx';

interface ProgressBarProps {
  value?: number; // 0-100
  progress?: number;
  max?: number;
  label?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'indigo' | 'green' | 'red' | 'orange' | 'yellow' | 'blue' | 'emerald';
  className?: string;
  animated?: boolean;
}

const sizeClasses = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

const colorClasses: Record<string, string> = {
  indigo: 'bg-indigo-500',
  green: 'bg-green-500',
  emerald: 'bg-emerald-500',
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  yellow: 'bg-yellow-500',
  blue: 'bg-blue-500',
};

export default function ProgressBar({
  value,
  progress,
  max = 100,
  label,
  showLabel = false,
  size = 'md',
  color = 'indigo',
  className,
  animated = false,
}: ProgressBarProps) {
  const actualVal = value !== undefined ? value : (progress !== undefined ? progress : 0);
  const pct = Math.min(100, Math.max(0, (actualVal / max) * 100));

  return (
    <div className={clsx('w-full', className)}>
      {(label || showLabel) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-sm text-gray-400">{label}</span>}
          {showLabel && (
            <span className="text-sm font-medium text-gray-300">{Math.round(pct)}%</span>
          )}
        </div>
      )}
      <div className={clsx('w-full bg-gray-700 rounded-full overflow-hidden', sizeClasses[size])}>
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-500',
            colorClasses[color],
            animated && 'relative overflow-hidden after:absolute after:inset-0 after:bg-white/20 after:animate-pulse'
          )}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
