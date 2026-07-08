interface BadgeProps {
  label: string;
  color?: string;
  variant?: 'solid' | 'outline' | 'soft';
  size?: 'sm' | 'md';
}

export default function Badge({ label, color = '#6366F1', variant = 'soft', size = 'sm' }: BadgeProps) {
  const sizeClass = size === 'sm' ? 'badgeSm' : 'badgeMd';

  if (variant === 'solid') {
    return (
      <span className={`badge ${sizeClass}`} style={{ backgroundColor: color, color: '#fff' }}>
        {label}
      </span>
    );
  }

  if (variant === 'outline') {
    return (
      <span className={`badge ${sizeClass} badgeOutline`} style={{ borderColor: color, color }}>
        {label}
      </span>
    );
  }

  return (
    <span className={`badge ${sizeClass}`} style={{ backgroundColor: `${color}18`, color }}>
      {label}
    </span>
  );
}

const statusMap: Record<string, { color: string; label: string }> = {
  published: { color: '#10B981', label: 'Published' },
  approved: { color: '#10B981', label: 'Approved' },
  active: { color: '#10B981', label: 'Active' },
  draft: { color: '#F59E0B', label: 'Draft' },
  archived: { color: '#6B7280', label: 'Archived' },
  pending: { color: '#F59E0B', label: 'Pending' },
  inactive: { color: '#6B7280', label: 'Inactive' },
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const { color, label: mappedLabel } = statusMap[status] ?? { color: '#6B7280', label: status };
  return <Badge label={label ?? mappedLabel} color={color} variant="soft" />;
}
