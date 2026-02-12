import { Sandbox } from "@e2b/desktop";

export enum NavigatorRole {
  AGENT = "agent",
  SYSTEM = "system",
  TOOL = "tool",
}

export interface NavigationEvent {
  url: string;
  source: NavigatorRole;
  timestamp: Date;
}

export class NavigationManager {
  private history: NavigationEvent[] = [];

  constructor(private desktop: Sandbox) { }

  async navigate(url: string, source: NavigatorRole = NavigatorRole.AGENT): Promise<void> {
    const event: NavigationEvent = {
      url,
      source,
      timestamp: new Date()
    };

    this.history.push(event);
    await this.desktop.open(url);
  }

  getHistory(): NavigationEvent[] {
    return [...this.history];
  }

  getCurrentUrl(): string | undefined {
    return this.history[this.history.length - 1]?.url;
  }

  clear(): void {
    this.history = [];
  }
}
