import type { KeyboardEvent, ReactNode } from 'react';

export function OSCard({
  children,
  className = '',
  onClick,
  selected = false,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
}): JSX.Element {
  function handleKeyDown(event: KeyboardEvent<HTMLElement>): void {
    if (!onClick) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  }

  return (
    <article
      className={className ? `osCard${selected ? ' selected' : ''} ${className}` : `osCard${selected ? ' selected' : ''}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </article>
  );
}
