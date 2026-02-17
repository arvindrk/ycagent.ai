import { EventStyle } from '../types';

interface ReasoningContentProps {
  content: string;
  style: EventStyle;
}

export function ReasoningContent({ content, style }: ReasoningContentProps) {
  const [, heading, body] = content.match(/^\*\*(.+?)\*\*\s*([\s\S]*)/) || [null, null, content];

  return (
    <div className="flex-1">
      <div className={`text-xs font-medium uppercase tracking-wider mb-1 ${style.labelColor}`}>
        {style.label}
      </div>
      {heading && (
        <h3 className="text-sm font-bold mb-2">
          {heading}
        </h3>
      )}
      {body && (
        <p className="text-sm text-text-primary leading-relaxed">
          {body}
        </p>
      )}
    </div>
  );
}
