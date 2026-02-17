import {
  Zap,
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
  Bug,
} from 'lucide-react';
import { AgentAction } from '@/types/llm.types';
import { ComputerAction, BashCommand, TextEditorCommand, GoogleSearchCommand, WebCrawlerCommand } from '@/types/sandbox.types';
import { GoogleIcon } from '@/components/icons/google-icon';
import { ActionDetails } from '../types';

export function formatActionDetails(
  action: AgentAction,
  toolName?: string
): ActionDetails {
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

  if (toolName === 'web_crawler') {
    const crawlerAction = action as WebCrawlerCommand;
    return {
      tool: 'Web Crawler',
      primary: crawlerAction.urls[0] || 'No URLs',
      secondary: crawlerAction.urls.length > 1 ? `+${crawlerAction.urls.length - 1} more` : undefined,
      icon: Bug,
      urls: crawlerAction.urls,
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
      primary: bashAction.command,
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
        isSecondaryStyle: true,
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
