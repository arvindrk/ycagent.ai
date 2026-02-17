import { EventStyle } from '../types';

interface ErrorContentProps {
  error?: string;
  style: EventStyle;
}

export function ErrorContent({ error, style }: ErrorContentProps) {
  return (
    <div className="flex-1">
      <div className={`text-xs font-medium uppercase tracking-wider mb-1 ${style.labelColor}`}>
        {style.label}
      </div>
      <p className={`text-sm ${style.labelColor}`}>
        {error || 'An error occurred'}
      </p>
    </div>
  );
}
