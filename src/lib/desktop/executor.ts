import { Sandbox } from "@e2b/desktop";
import { ResolutionScaler } from "./resolution";
import { ComputerAction } from "./types";
import { BashCommand } from "./types";
import { TextEditorCommand } from "./types";
import { BetaToolUseBlock } from "@anthropic-ai/sdk/resources/beta/messages/messages.mjs";

export class ActionExecutor {
  constructor(
    private desktop: Sandbox,
    private scaler: ResolutionScaler
  ) { }

  async execute(tool: BetaToolUseBlock): Promise<void> {
    switch (tool.name) {
      case "computer":
        await this.executeComputer(tool.input as ComputerAction);
        break;
      case "bash":
        await this.executeBash(tool.input as BashCommand);
        break;
      case "str_replace_editor":
        await this.executeEditor(tool.input as TextEditorCommand);
        break;
    }
  }

  private async executeComputer(action: ComputerAction): Promise<void> {
    switch (action.action) {
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
}
