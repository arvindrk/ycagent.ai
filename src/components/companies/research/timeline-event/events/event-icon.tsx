import { Loader2 } from 'lucide-react';
import { SSEEvent, StreamChunk } from '@/types/llm.types';
import { EventStyle } from '../types';
import { formatActionDetails } from '../utils/format-action-details';
import { CircularProgress } from './circular-progress';

interface EventIconProps {
  event: StreamChunk;
  style: EventStyle;
}

export function EventIcon({ event, style }: EventIconProps) {
  const Icon = style.icon;

  if (event.type === SSEEvent.THINKING) {
    return <Loader2 className={`w-4 h-4 ${style.iconColor} flex-shrink-0 mt-0.5 animate-spin`} aria-hidden="true" />;
  }

  if (event.type === SSEEvent.ACTION && event.action && event.toolName) {
    const details = formatActionDetails(event.action, event.toolName);
    if (details.duration) {
      return <CircularProgress duration={details.duration} className={style.iconColor} />;
    }
    const ActionIcon = details.icon;
    const iconColor = details.iconClassName ?? style.iconColor;
    return <ActionIcon className={`w-4 h-4 ${iconColor} flex-shrink-0 mt-0.5`} aria-hidden="true" />;
  }

  return <Icon className={`w-4 h-4 ${style.iconColor} flex-shrink-0 mt-0.5`} aria-hidden="true" />;
}
