import { BashCommand } from '@/types/sandbox.types';
import { EventStyle } from '../types';

interface BashActionProps {
  action: BashCommand;
  style: EventStyle;
}

export function BashAction({ action, style }: BashActionProps) {
  if ('restart' in action) {
    return (
      <div className="flex-1">
        <div className={`text-xs font-medium uppercase tracking-wider mb-1 ${style.labelColor}`}>
          BASH
        </div>
        <p className="text-sm text-text-primary">
          Restarting bash session
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <div className={`text-xs font-medium uppercase tracking-wider mb-1 ${style.labelColor}`}>
        BASH
      </div>
      <code className="block mt-1 px-3 py-2 bg-bg-primary rounded-md text-xs font-mono text-text-primary">
        {action.command}
      </code>
      <p className="text-xs text-text-secondary mt-2">
        Working directory: /workspace
      </p>
    </div>
  );
}
