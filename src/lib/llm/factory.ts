import { Sandbox } from "@e2b/desktop";
import { ComputerModel, ComputerInteractionStreamerFacade } from "./types";
import { AnthropicComputerStreamer } from "./providers/anthropic";
import { Resolution } from "../sandbox-desktop/types";

export class StreamerFactory {
  static getStreamer(
    model: ComputerModel,
    desktop: Sandbox,
    resolution: Resolution
  ): ComputerInteractionStreamerFacade {
    switch (model) {
      case "anthropic":
      default:
        return new AnthropicComputerStreamer({ desktop, resolution });
    }
  }
}
