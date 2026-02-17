import { EventStyle } from '../types';

interface DoneContentProps {
  style: EventStyle;
}

export function DoneContent({ style }: DoneContentProps) {
  return (
    <div className="flex-1">
      <p className={`text-sm font-medium ${style.labelColor}`}>
        Research completed
      </p>
    </div>
  );
}
