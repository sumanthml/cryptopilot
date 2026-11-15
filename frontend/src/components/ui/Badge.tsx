import React from 'react';
import { clsx } from 'clsx';
import { getSeverityBg, getStatusColor, getConfidenceColor, getConfidenceLabel } from '../../utils/helpers';

type BadgeVariant = 'severity' | 'status' | 'confidence' | 'default' | 'critical' | 'high' | 'medium' | 'low';

interface BadgeProps {
  value?: string | number;
  children?: React.ReactNode;
  variant?: BadgeVariant | string;
  className?: string;
}

export default function Badge({ value, children, variant = 'default', className }: BadgeProps) {
  let colorClass = 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  const val = value !== undefined ? value : children;

  if (variant === 'severity' || variant === 'CRITICAL' || variant === 'HIGH' || variant === 'MEDIUM' || variant === 'LOW' || variant === 'critical' || variant === 'high' || variant === 'medium' || variant === 'low') {
    colorClass = getSeverityBg(String(val));
  } else if (variant === 'status') {
    colorClass = getStatusColor(String(val));
  } else if (variant === 'confidence') {
    const num = typeof val === 'number' ? val : parseFloat(String(val));
    colorClass = getConfidenceColor(num);
    const label = getConfidenceLabel(num);
    return (
      <span
        className={clsx(
          'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
          colorClass,
          className
        )}
      >
        {label} ({Math.round(num * 100)}%)
      </span>
    );
  }

  const displayValue = typeof val === 'string'
    ? val.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
    : val;

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
        colorClass,
        className
      )}
    >
      {displayValue}
    </span>
  );
}
