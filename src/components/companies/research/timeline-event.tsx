import {
  Brain,
  Zap,
  CheckCircle,
  AlertCircle,
  XCircle,
  Camera,
  MousePointerClick,
  Keyboard,
  MousePointer,
  ArrowUpDown,
  Terminal,
  Eye,
  FilePlus,
  FileEdit,
  FileText,
  Globe,
  type LucideIcon,
} from 'lucide-react';
import { StreamChunk, SSEEvent } from '@/lib/llm/types';
import { ComputerAction, BashCommand, TextEditorCommand, GoogleSearchCommand } from '@/lib/sandbox-desktop/types';
import { GoogleIcon } from '@/components/icons/google-icon';

interface TimelineEventProps {
  event: StreamChunk;
  isLatest: boolean;
}

interface CircularProgressProps {
  duration: number;
  className?: string;
}

function CircularProgress({ duration, className = '' }: CircularProgressProps) {
  const radius = 6;
  const circumference = 2 * Math.PI * radius;

  return (
    <svg className={`w-4 h-4 ${className}`} viewBox="0 0 16 16">
      <circle
        cx="8"
        cy="8"
        r={radius}
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        opacity="0.2"
      />
      <circle
        cx="8"
        cy="8"
        r={radius}
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={circumference}
        strokeLinecap="round"
        transform="rotate(-90 8 8)"
        style={{
          animation: `circular-progress ${duration * 1000}ms linear forwards`,
        }}
      />
    </svg>
  );
}

type IconType = LucideIcon | typeof GoogleIcon;

function formatActionDetails(
  action: ComputerAction | BashCommand | TextEditorCommand | GoogleSearchCommand,
  toolName?: string
): { tool: string; primary: string; secondary?: string; icon: IconType; duration?: number } {
  if (!toolName) {
    return { tool: 'action', primary: 'Unknown action', icon: Zap };
  }

  if (toolName === 'google_search') {
    const searchAction = action as GoogleSearchCommand;
    return {
      tool: 'Google Search',
      primary: searchAction.query,
      secondary: searchAction.num_results ? `${searchAction.num_results} results` : undefined,
      icon: GoogleIcon,
    };
  }

  if (toolName === 'bash') {
    const bashAction = action as BashCommand;
    if ('restart' in bashAction) {
      return {
        tool: 'bash',
        primary: 'Restarting bash session',
        icon: Terminal,
      };
    }
    return {
      tool: 'bash',
      primary: `Executing: ${bashAction.command}`,
      secondary: 'Working directory: /workspace',
      icon: Terminal,
    };
  }

  if (toolName === 'computer') {
    const computerAction = action as ComputerAction;
    if (computerAction.action === 'navigate') {
      return {
        tool: 'Browse',
        primary: computerAction.url,
        icon: Globe,
      };
    }
    if (computerAction.action === 'screenshot') {
      return {
        tool: 'Action',
        primary: 'Taking screenshot',
        icon: Camera,
      };
    }
    if (computerAction.action === 'key' || computerAction.action === 'type') {
      return {
        tool: 'Action',
        primary: `Typing: ${computerAction.text}`,
        icon: Keyboard,
      };
    }
    if (computerAction.action === 'mouse_move') {
      return {
        tool: 'Action',
        primary: 'Moving mouse',
        secondary: `Position: [${computerAction.coordinate[0]}, ${computerAction.coordinate[1]}]`,
        icon: MousePointer,
      };
    }
    if (computerAction.action === 'left_click' || computerAction.action === 'right_click' || computerAction.action === 'double_click') {
      return {
        tool: 'Action',
        primary: `${computerAction.action.replace('_', ' ')}`,
        secondary: `Position: [${computerAction.coordinate[0]}, ${computerAction.coordinate[1]}]`,
        icon: MousePointerClick,
      };
    }
    if (computerAction.action === 'scroll') {
      return {
        tool: 'Action',
        primary: `Scrolling ${computerAction.scroll_direction}`,
        secondary: `Amount: ${computerAction.scroll_amount}`,
        icon: ArrowUpDown,
      };
    }
    if (computerAction.action === 'wait') {
      return {
        tool: 'Action',
        primary: `Waiting ${computerAction.duration}s`,
        icon: Zap,
        duration: computerAction.duration,
      };
    }
  }

  if (toolName === 'text_editor') {
    const editorAction = action as TextEditorCommand;
    if (editorAction.command === 'view') {
      return {
        tool: 'text_editor',
        primary: 'Viewing file',
        secondary: `Path: ${editorAction.path}`,
        icon: Eye,
      };
    }
    if (editorAction.command === 'create') {
      return {
        tool: 'text_editor',
        primary: 'Creating file',
        secondary: `Path: ${editorAction.path}`,
        icon: FilePlus,
      };
    }
    if (editorAction.command === 'str_replace') {
      return {
        tool: 'text_editor',
        primary: 'Editing file',
        secondary: `Path: ${editorAction.path}`,
        icon: FileEdit,
      };
    }
    if (editorAction.command === 'insert') {
      return {
        tool: 'text_editor',
        primary: 'Inserting text',
        secondary: `Path: ${editorAction.path}, Line: ${editorAction.insert_line}`,
        icon: FileText,
      };
    }
  }

  return {
    tool: toolName,
    primary: JSON.stringify(action),
    icon: Zap,
  };
}

function getEventStyle(type: SSEEvent) {
  switch (type) {
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

export function TimelineEvent({ event, isLatest }: TimelineEventProps) {
  const style = getEventStyle(event.type);
  const Icon = style.icon;

  const getActionIcon = () => {
    if (event.type === SSEEvent.ACTION && event.action && event.toolName) {
      const details = formatActionDetails(event.action, event.toolName);
      if (details.duration) {
        return <CircularProgress duration={details.duration} className={style.iconColor} />;
      }
      const ActionIcon = details.icon;
      return <ActionIcon className={`w-4 h-4 ${style.iconColor} flex-shrink-0 mt-0.5`} aria-hidden="true" />;
    }
    return <Icon className={`w-4 h-4 ${style.iconColor} flex-shrink-0 mt-0.5`} aria-hidden="true" />;
  };

  const renderContent = () => {
    switch (event.type) {
      case SSEEvent.REASONING:
        return (
          <div className="flex-1">
            <div className={`text-xs font-medium uppercase tracking-wider mb-1 ${style.labelColor}`}>
              {style.label}
            </div>
            <p className="text-sm text-text-primary leading-relaxed">
              {event.content}
            </p>
          </div>
        );

      case SSEEvent.ACTION:
        if (event.action && event.toolName) {
          const details = formatActionDetails(event.action, event.toolName);
          return (
            <div className="flex-1">
              <div className={`text-xs font-medium uppercase tracking-wider mb-1 ${style.labelColor}`}>
                {details.tool}
              </div>
              <p className="text-sm text-text-primary">
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
        return (
          <div className="flex-1">
            <div className={`text-xs font-medium uppercase tracking-wider mb-1 ${style.labelColor}`}>
              {style.label}
            </div>
            <p className={`text-sm ${style.labelColor}`}>
              {event.error || 'An error occurred'}
            </p>
          </div>
        );

      case SSEEvent.DONE:
        return (
          <div className="flex-1">
            <p className={`text-sm font-medium ${style.labelColor}`}>
              Research completed
            </p>
          </div>
        );

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
          <CheckCircle className={`w-4 h-4 text-green ${isLatest ? 'animate-ripple-ring' : ''}`} />
        ) : (
          <div
            className={`relative w-3 h-3 rounded-full border-2 ${style.nodeColor} ${style.nodeBg} ${style.iconColor} ${isLatest ? 'animate-ripple-ring' : ''
              }`}
          >
            <div className={`w-1 h-1 rounded-full bg-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${event.type === SSEEvent.DONE ? 'hidden' : ''
              }`} />
          </div>
        )}
      </div>

      <div className="ml-8 flex-1">
        <div
          className={`rounded-lg px-4 py-3 ${style.cardBg} shadow-sm hover:shadow-md transition-all duration-200 ease-out`}
        >
          <div className="flex gap-3 items-start">
            {getActionIcon()}
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
