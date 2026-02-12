import { Sandbox } from "@e2b/desktop";
import { ResolutionScaler } from "./resolution";
import { ComputerAction, GoogleSearchCommand } from "./types";
import { BashCommand } from "./types";
import { TextEditorCommand } from "./types";
import { NavigationManager, NavigatorRole } from "./navigation";
import { BetaToolUseBlock } from "@anthropic-ai/sdk/resources/beta/messages/messages.mjs";
import { getSearchProvider } from "@/lib/google-search";

export class ActionExecutor {
  constructor(
    private desktop: Sandbox,
    private scaler: ResolutionScaler,
    private navigationManager: NavigationManager
  ) { }

  async execute(tool: BetaToolUseBlock): Promise<string | void> {
    switch (tool.name) {
      case "computer":
        await this.executeComputer(tool.input as ComputerAction);
        return;
      case "bash":
        await this.executeBash(tool.input as BashCommand);
        return;
      case "str_replace_editor":
        await this.executeEditor(tool.input as TextEditorCommand);
        return;
      case "google_search":
        return await this.executeSearch(tool.input as GoogleSearchCommand);
    }
  }

  private async executeComputer(action: ComputerAction): Promise<void> {
    switch (action.action) {
      case "navigate":
        await this.navigationManager.navigate(action.url, NavigatorRole.AGENT);
        break;
      case "left_click": {
        const [x, y] = this.scaler.scaleToOriginal(action.coordinate);
        await this.desktop.leftClick(x, y);
        break;
      }
      case "right_click": {
        const [x, y] = this.scaler.scaleToOriginal(action.coordinate);
        await this.desktop.rightClick(x, y);
        break;
      }
      case "double_click": {
        const [x, y] = this.scaler.scaleToOriginal(action.coordinate);
        await this.desktop.doubleClick(x, y);
        break;
      }
      case "mouse_move": {
        const [x, y] = this.scaler.scaleToOriginal(action.coordinate);
        await this.desktop.moveMouse(x, y);
        break;
      }
      case "type":
        await this.desktop.write(action.text);
        break;
      case "key":
        await this.desktop.press(action.text);
        break;
      case "scroll": {
        const [x, y] = this.scaler.scaleToOriginal(action.coordinate);
        await this.desktop.moveMouse(x, y);
        await this.desktop.scroll(
          action.scroll_direction === "up" ? "up" : "down",
          action.scroll_amount
        );
        break;
      }
      case "wait":
        await new Promise(resolve => setTimeout(resolve, action.duration * 1000));
        break;
      case "screenshot":
        break;
    }
  }

  private async executeBash(cmd: BashCommand): Promise<void> {
    if ("restart" in cmd && cmd.restart) {
      return;
    }
    if ("command" in cmd && cmd.command) {
      await this.desktop.commands.run(cmd.command);
    }
  }

  private async executeEditor(cmd: TextEditorCommand): Promise<void> {
    switch (cmd.command) {
      case "view": {
        await this.desktop.files.read(cmd.path);
        break;
      }
      case "create":
        await this.desktop.files.write(cmd.path, cmd.file_text);
        break;
      case "str_replace": {
        const content = await this.desktop.files.read(cmd.path);
        const updated = content.toString().replace(cmd.old_str, cmd.new_str);
        await this.desktop.files.write(cmd.path, updated);
        break;
      }
      case "insert": {
        const content = await this.desktop.files.read(cmd.path);
        const lines = content.toString().split('\n');
        lines.splice(cmd.insert_line, 0, cmd.new_str);
        await this.desktop.files.write(cmd.path, lines.join('\n'));
        break;
      }
    }
  }

  private async executeSearch(input: GoogleSearchCommand): Promise<string> {
    const provider = getSearchProvider({ provider: 'serper' });
    const results = await provider.search(input.query, {
      numResults: input.num_results || 10
    });

    return results.results
      .map(r => `[Position ${r.position}] ${r.title}\n${r.link}\n${r.snippet}`)
      .join('\n\n');
  }
}
