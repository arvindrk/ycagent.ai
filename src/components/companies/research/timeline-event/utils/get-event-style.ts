import {
  Brain,
  Zap,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import { SSEEvent } from '@/types/llm.types';
import { EventStyle } from '../types';

export function getEventStyle(type: SSEEvent): EventStyle {
  switch (type) {
    case SSEEvent.THINKING:
      return {
        nodeColor: 'border-text-tertiary',
        nodeBg: 'bg-bg-tertiary',
        icon: Loader2,
        iconColor: 'text-text-tertiary',
        label: 'THINKING',
        labelColor: 'text-text-tertiary',
        cardBg: 'bg-bg-quaternary',
      };
    case SSEEvent.REASONING:
      return {
        nodeColor: 'border-blue',
        nodeBg: 'bg-bg-tertiary',
        icon: Brain,
        iconColor: 'text-blue',
        label: 'REASONING',
        labelColor: 'text-blue',
        cardBg: 'bg-bg-quaternary',
      };
    case SSEEvent.ACTION:
      return {
        nodeColor: 'border-accent',
        nodeBg: 'bg-bg-tertiary',
        icon: Zap,
        iconColor: 'text-accent',
        label: 'ACTION',
        labelColor: 'text-accent',
        cardBg: 'bg-bg-quaternary',
      };
    case SSEEvent.ERROR:
      return {
        nodeColor: 'border-red',
        nodeBg: 'bg-bg-tertiary',
        icon: AlertCircle,
        iconColor: 'text-red',
        label: 'ERROR',
        labelColor: 'text-red',
        cardBg: 'bg-red/5',
      };
    case SSEEvent.DONE:
      return {
        nodeColor: 'border-green',
        nodeBg: 'bg-green',
        icon: CheckCircle,
        iconColor: 'text-green',
        label: 'DONE',
        labelColor: 'text-green',
        cardBg: 'bg-bg-quaternary',
      };
    default:
      return {
        nodeColor: 'border-border-secondary',
        nodeBg: 'bg-bg-tertiary',
        icon: XCircle,
        iconColor: 'text-text-tertiary',
        label: 'EVENT',
        labelColor: 'text-text-tertiary',
        cardBg: 'bg-bg-quaternary',
      };
  }
}
