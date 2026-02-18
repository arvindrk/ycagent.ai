import { CheckCircle } from 'lucide-react';
import { SSEEvent } from '@/types/llm.types';
import { TimelineEventProps } from './types';
import { getEventStyle } from './utils/get-event-style';
import { EventIcon } from './events/event-icon';
import { ThinkingContent } from './events/thinking-content';
import { ReasoningContent } from './events/reasoning-content';
import { ActionContent } from './events/action-content';
import { ErrorContent } from './events/error-content';
import { DoneContent } from './events/done-content';

export function TimelineEvent({ event, isLatest }: TimelineEventProps) {
  const style = getEventStyle(event.type);

  const renderContent = () => {
    switch (event.type) {
      case SSEEvent.THINKING:
        return <ThinkingContent />;

      case SSEEvent.REASONING:
        return <ReasoningContent content={event.content || ''} style={style} />;

      case SSEEvent.ACTION:
        if (event.action && event.toolName) {
          return <ActionContent action={event.action} toolName={event.toolName} style={style} />;
        }
        return (
          <div className="flex-1">
            <div className={`text-xs font-medium uppercase tracking-wider mb-1 ${style.labelColor}`}>
              {style.label}
            </div>
            <p className="text-sm text-text-primary">
              {event.toolName || 'Action'}
            </p>
          </div>
        );

      case SSEEvent.ERROR:
        return <ErrorContent error={event.error} style={style} />;

      case SSEEvent.DONE:
        return <DoneContent style={style} />;

      default:
        return (
          <div className="flex-1">
            <p className="text-sm text-text-secondary">
              {JSON.stringify(event)}
            </p>
          </div>
        );
    }
  };

  return (
    <div className="relative flex animate-slide-up-fade">
      <div className="absolute left-0 top-2.5 flex items-center justify-center w-5 h-5">
        {event.type === SSEEvent.ACTION && event.isCompleted ? (
          <CheckCircle className={`w-4 h-4 fill-bg-primary text-green ${isLatest ? 'animate-ripple-ring' : ''}`} />
        ) : (
          <div
            className={`relative w-3 h-3 rounded-full border-2 ${style.nodeColor} ${style.nodeBg} ${style.iconColor} ${isLatest ? 'animate-ripple-ring' : ''
              }`}
          >
            <div
              className={`w-1 h-1 rounded-full bg-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${event.type === SSEEvent.DONE ? 'hidden' : ''
                }`}
            />
          </div>
        )}
      </div>

      <div className="ml-8 flex-1">
        <div
          className={`rounded-lg px-4 py-3 ${style.cardBg} shadow-sm hover:shadow-md transition-all duration-200 ease-out max-w-[90%]`}
        >
          <div className="flex gap-3 items-start">
            <EventIcon event={event} style={style} />
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
