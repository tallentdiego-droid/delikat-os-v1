import type { ReactNode } from 'react';

export function OSCard({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return <article className={className ? `osCard ${className}` : 'osCard'}>{children}</article>;
}

