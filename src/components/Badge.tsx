interface BadgeProps {
  label: string;
  color?: string;
  variant?: 'solid' | 'outline' | 'soft';
  size?: 'sm' | 'md';
}

export default function Badge({ label, color = '#6366F1', variant = 'soft', size = 'sm' }: BadgeProps) {
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';

  if (variant === 'solid') {
    return (
      <span className={`inline-flex items-center rounded-full font-medium ${sizeClass}`} style={{ backgroundColor: color, color: '#fff' }}>
        {label}
      </span>
    );
  }
  if (variant === 'outline') {
    return (
      <span className={`inline-flex items-center rounded-full font-medium border ${sizeClass}`} style={{ borderColor: color, color }}>
        {label}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClass}`} style={{ backgroundColor: `${color}18`, color }}>
      {label}
    </span>
  );
}

const statusMap: Record<string, { color: string; label: string }> = {
  published: { color: '#10B981', label: 'Publicado' },
  draft: { color: '#F59E0B', label: 'Borrador' },
  archived: { color: '#6B7280', label: 'Archivado' },
  active: { color: '#10B981', label: 'Activo' },
  inactive: { color: '#6B7280', label: 'Inactivo' },
  pending: { color: '#F59E0B', label: 'Pendiente' },
};

export function StatusBadge({ status }: { status: string }) {
  const { color, label } = statusMap[status] ?? { color: '#6B7280', label: status };
  return <Badge label={label} color={color} variant="soft" />;
}
