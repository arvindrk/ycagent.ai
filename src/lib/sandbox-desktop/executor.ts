import { Sandbox } from "@e2b/desktop";
import { ResolutionScaler } from "./resolution";
import { ComputerAction, GoogleSearchCommand, WebCrawlerCommand } from "@/types/sandbox.types";
import { BashCommand } from "@/types/sandbox.types";
import { TextEditorCommand } from "@/types/sandbox.types";
import { NavigationManager, NavigatorRole } from "./navigation";
import { StandardToolCall, StandardToolResult } from "@/types/tool.types";
import { getSearchProvider } from "@/lib/google-search";
import { getCrawlerProvider } from "@/lib/crawler";
import { SearchProvider } from "@/types/google-search.types";
import { CrawlerProvider } from "@/types/crawler.types";

export class ActionExecutor {
  constructor(
    private desktop: Sandbox,
    private scaler: ResolutionScaler,
    private navigationManager: NavigationManager
  ) { }

  async execute(toolCall: StandardToolCall): Promise<StandardToolResult> {
    let textResult: string | undefined;

    switch (toolCall.name) {
      case "computer":
        await this.executeComputer(toolCall.input as ComputerAction);
        break;
      case "bash":
        await this.executeBash(toolCall.input as BashCommand);
        break;
      case "str_replace_editor":
        await this.executeEditor(toolCall.input as TextEditorCommand);
        break;
      case "google_search":
        textResult = await this.executeSearch(toolCall.input as GoogleSearchCommand);
        break;
      case "web_crawler":
        textResult = await this.executeCrawler(toolCall.input as WebCrawlerCommand);
        break;
    }

    if (textResult) {
      return {
        toolCallId: toolCall.id,
        content: { type: 'text', text: textResult }
      };
    }

    const screenshot = await this.scaler.takeScreenshot();
    return {
      toolCallId: toolCall.id,
      content: {
        type: 'image',
        base64: screenshot.toString('base64'),
        mediaType: 'image/png'
      }
    };
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
    const provider = getSearchProvider({ provider: SearchProvider.SERPER });
    const results = await provider.search(input.query, {
      numResults: input.num_results || 10
    });

    const returning = results.results
      .map(r => `[Position ${r.position}] ${r.title}\n${r.link}\n${r.snippet}`)
      .join('\n\n');


    return returning;
  }

  private async executeCrawler(input: WebCrawlerCommand): Promise<string> {
    const crawler = getCrawlerProvider({ provider: CrawlerProvider.FIRECRAWL });
    const limit = Math.min(input.limit || 3, 10);
    const urls = input.urls.slice(0, limit);
    const formats = input.formats || ['markdown'];
    const onlyMainContent = input.onlyMainContent ?? true;


    const results = await Promise.allSettled(
      urls.map(url =>
        crawler.scrape(url, {
          formats,
          onlyMainContent
        })
      )
    );

    const output: string[] = [];
    let successCount = 0;
    let failCount = 0;

    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        const data = result.value;
        successCount++;
        output.push(
          `[URL ${i + 1}/${urls.length}] ${data.url}`,
          `Status: Success`,
          ``,
          data.markdown || data.html || '(no content)',
          ``
        );
      } else {
        failCount++;
        output.push(
          `[URL ${i + 1}/${urls.length}] ${urls[i]}`,
          `Status: Failed`,
          `Error: ${result.reason?.message || 'unknown error'}`,
          ``
        );
      }
    });

    const summary = `Scraped ${successCount}/${urls.length} URLs successfully${failCount > 0 ? ` (${failCount} failed)` : ''}`;


    return [summary, '', '---', '', ...output].join('\n');
  }
}
