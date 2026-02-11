import { Sandbox } from "@e2b/desktop";
import { ComputerModel, ComputerInteractionStreamerFacade } from "./types";
import { AnthropicComputerStreamer } from "./providers/anthropic";

export class StreamerFactory {
  static getStreamer(
    model: ComputerModel,
    desktop: Sandbox,
    resolution: [number, number]
  ): ComputerInteractionStreamerFacade {
    switch (model) {
      case "anthropic":
      default:
        return new AnthropicComputerStreamer({ desktop, resolution });
    }
  }
}
