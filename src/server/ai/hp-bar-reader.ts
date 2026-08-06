import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { HudConfig } from "./game-hud-config";

const execFileAsync = promisify(execFile);

/**
 * Reads one player's HP bar fraction (0 = empty, 1 = full) from a single
 * frame of the live stream. The technique: FFmpeg crops just the bar's
 * pixel region, scales it down to width×1 (collapsing vertical variation,
 * e.g. bar-edge borders, into a single representative row), and outputs
 * raw RGB24 bytes straight to stdout — no image-decoding library needed
 * in Node, just a Buffer scan.
 *
 * Reads left-to-right (health bars deplete right-to-left visually in most
 * fighting game HUDs, i.e. the left edge is anchored) and reports the
 * fraction of pixels from the left that still look like "bar" before
 * hitting background — this assumes the bar's left edge is the anchored
 * side, which is true for the vast majority of FGC HUDs but not a
 * universal law; check this assumption against each game added to
 * game-hud-config.ts.
 */
export async function readHpFraction(
  hlsPlaylistUrl: string,
  bar: HudConfig["playerOneBar"],
  isFilledPixel: HudConfig["isFilledPixel"]
): Promise<number> {
  const { x, y, width, height } = bar;

  const { stdout } = await execFileAsync(
    "ffmpeg",
    [
      "-y",
      "-i", hlsPlaylistUrl,
      "-vframes", "1",
      "-vf", `crop=${width}:${height}:${x}:${y},scale=${width}:1`,
      "-f", "rawvideo",
      "-pix_fmt", "rgb24",
      "-",
    ],
    { encoding: "buffer", maxBuffer: 1024 * 1024 }
  );

  const pixelCount = width; // one row, `width` pixels, 3 bytes (RGB) each
  let filledCount = 0;

  for (let i = 0; i < pixelCount; i++) {
    const offset = i * 3;
    const r = stdout[offset];
    const g = stdout[offset + 1];
    const b = stdout[offset + 2];
    if (isFilledPixel(r, g, b)) {
      filledCount++;
    } else if (filledCount > 0) {
      // Stop at the first non-bar pixel after the bar has started — this
      // is what makes it "how far the bar extends from the anchor edge"
      // rather than "what fraction of pixels anywhere in the crop happen
      // to be bar-colored" (which would be thrown off by HUD text/icons
      // overlapping the crop region).
      break;
    }
  }

  return Math.min(1, filledCount / pixelCount);
}

export async function readBothHpFractions(hlsPlaylistUrl: string, config: HudConfig) {
  const [playerOne, playerTwo] = await Promise.all([
    readHpFraction(hlsPlaylistUrl, config.playerOneBar, config.isFilledPixel),
    readHpFraction(hlsPlaylistUrl, config.playerTwoBar, config.isFilledPixel),
  ]);
  return { playerOne, playerTwo };
}
