import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Momentary loudness (LUFS) over the last few seconds of a live HLS
 * stream, as a proxy signal for "the crowd/commentary just reacted to
 * something." This is a genuinely weak signal on its own — arena crowd
 * mic bleed, commentary excitement, and in-game SFX all show up the same
 * way — which is why it's one input to a weighted score
 * (hype-worker.ts) rather than treated as a standalone detector.
 */
export async function readCrowdLoudness(hlsPlaylistUrl: string, sampleSeconds = 6): Promise<number> {
  // ffmpeg's ebur128 filter writes loudness stats to stderr; -f null
  // discards the (irrelevant here) video/audio output — we only want the
  // printed stats.
  const result = await execFileAsync(
    "ffmpeg",
    [
      "-y",
      "-t", String(sampleSeconds),
      "-i", hlsPlaylistUrl,
      "-af", "ebur128=peak=true",
      "-f", "null",
      "-",
    ],
    { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 }
  ).catch((err) => ({ stderr: (err.stderr as string) ?? "" }));

  const stderr = "stderr" in result ? result.stderr : "";

  // Look for the "Summary" block's "I:" (integrated loudness) line, e.g.
  // "    I:         -18.4 LUFS". Falls back to a neutral mid-value if the
  // stream doesn't have an audio track or parsing fails — a missing
  // signal should pull the weighted score toward neutral, not crash it.
  const match = stderr.match(/I:\s*(-?\d+(?:\.\d+)?)\s*LUFS/);
  if (!match) return 0.5;

  const lufs = parseFloat(match[1]);
  // Typical broadcast range is roughly -30 (quiet) to -6 (loud/peaking).
  // Normalize to 0–1 for combining with the other signals.
  const normalized = (lufs + 30) / 24;
  return Math.max(0, Math.min(1, normalized));
}
