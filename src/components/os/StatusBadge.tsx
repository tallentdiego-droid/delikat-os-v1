import type { ReactNode } from 'react';

function toneFromStatus(status: string): string {
  const value = status.toLowerCase();
  if (value.includes('active') || value.includes('approved') || value.includes('satisfied') || value.includes('completed')) return 'success';
  if (value.includes('missing') || value.includes('failed') || value.includes('archived')) return 'danger';
  if (value.includes('pending') || value.includes('draft') || value.includes('assigned') || value.includes('in_progress')) return 'warning';
  return 'neutral';
}

export function StatusBadge({
  status,
  label,
}: {
  status: string;
  label?: ReactNode;
}): JSX.Element {
  const tone = toneFromStatus(status);
  return <span className={`statusBadge ${tone}`}>{label ?? status}</span>;
}

