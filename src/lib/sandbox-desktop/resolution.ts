import { Sandbox } from "@e2b/desktop";
import sharp from "sharp";

const MAX_WIDTH = 1280;
const MAX_HEIGHT = 800;
const MIN_WIDTH = 800;
const MIN_HEIGHT = 600;

export class ResolutionScaler {
  private desktop: Sandbox;
  private originalResolution: [number, number];
  private scaledResolution: [number, number];
  private scaleFactor: number;

  constructor(desktop: Sandbox, originalResolution: [number, number]) {
    this.desktop = desktop;
    this.originalResolution = originalResolution;

    const { scaledResolution, scaleFactor } = this.calculateScaled(originalResolution);
    this.scaledResolution = scaledResolution;
    this.scaleFactor = scaleFactor;
  }

  getScaledResolution(): [number, number] {
    return this.scaledResolution;
  }

  scaleToOriginal(coord: [number, number]): [number, number] {
    return [
      Math.round(coord[0] / this.scaleFactor),
      Math.round(coord[1] / this.scaleFactor)
    ];
  }

  async takeScreenshot(): Promise<Buffer> {
    const screenshot = await this.desktop.screenshot();

    if (this.scaleFactor === 1) {
      return Buffer.from(screenshot);
    }

    return await sharp(screenshot)
      .resize(this.scaledResolution[0], this.scaledResolution[1], {
        fit: "fill",
        kernel: "lanczos3"
      })
      .toBuffer();
  }

  private calculateScaled(original: [number, number]): {
    scaledResolution: [number, number];
    scaleFactor: number;
  } {
    const [w, h] = original;

    if (w <= MAX_WIDTH && w >= MIN_WIDTH && h <= MAX_HEIGHT && h >= MIN_HEIGHT) {
      return { scaledResolution: [w, h], scaleFactor: 1 };
    }

    let scaleFactor = 1;
    if (w > MAX_WIDTH || h > MAX_HEIGHT) {
      scaleFactor = Math.min(MAX_WIDTH / w, MAX_HEIGHT / h);
    } else {
      scaleFactor = Math.max(MIN_WIDTH / w, MIN_HEIGHT / h);
    }

    const scaledW = Math.round(w * scaleFactor);
    const scaledH = Math.round(h * scaleFactor);

    return {
      scaledResolution: [scaledW, scaledH],
      scaleFactor: Math.sqrt((scaledW / w) * (scaledH / h))
    };
  }
}
