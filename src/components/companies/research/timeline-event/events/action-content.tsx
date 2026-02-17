import { AgentAction } from '@/types/llm.types';
import { BashCommand, WebCrawlerCommand } from '@/types/sandbox.types';
import { EventStyle } from '../types';
import { formatActionDetails } from '../utils/format-action-details';
import { BashAction } from './bash-action';
import { WebCrawlerAction } from './web-crawler-action';

interface ActionContentProps {
  action: AgentAction;
  toolName: string;
  style: EventStyle;
}

export function ActionContent({ action, toolName, style }: ActionContentProps) {
  if (toolName === 'bash') {
    return <BashAction action={action as BashCommand} style={style} />;
  }

  if (toolName === 'web_crawler') {
    return <WebCrawlerAction action={action as WebCrawlerCommand} style={style} />;
  }

  const details = formatActionDetails(action, toolName);
  return (
    <div className="flex-1">
      <div className={`text-xs font-medium uppercase tracking-wider mb-1 ${style.labelColor}`}>
        {details.tool}
      </div>
      <p className={details.isSecondaryStyle ? 'text-xs text-text-secondary' : ' text-smtext-text-primary'}>
        {details.primary}
      </p>
      {details.secondary && (
        <p className="text-xs text-text-secondary mt-1">
          {details.secondary}
        </p>
      )}
    </div>
  );
}
