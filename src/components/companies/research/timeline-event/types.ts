import { StreamChunk } from '@/types/llm.types';
import { type ComponentType } from 'react';
import { type LucideIcon } from 'lucide-react';

export interface TimelineEventProps {
  event: StreamChunk;
  isLatest: boolean;
}

export interface CircularProgressProps {
  duration: number;
  className?: string;
}

export type IconType = ComponentType<{ className?: string }>;

export interface ActionDetails {
  tool: string;
  primary: string;
  secondary?: string;
  icon: IconType;
  iconClassName?: string;
  duration?: number;
  urls?: string[];
  isSecondaryStyle?: boolean;
}

export interface EventStyle {
  nodeColor: string;
  nodeBg: string;
  icon: LucideIcon;
  iconColor: string;
  label: string;
  labelColor: string;
  cardBg: string;
}
