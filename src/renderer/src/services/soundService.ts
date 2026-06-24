/**
 * soundService.ts
 * ----------------
 * Lightweight, dependency-free sound effect player for the futuristic UI.
 *
 * Design goals:
 * - Subtle, short, professional cues only (no loops, no music).
 * - Never throws or blocks the UI if an audio file is missing or autoplay
 *   is blocked by the browser/OS — every failure is swallowed silently.
 * - A single localStorage-backed on/off switch, exposed via Settings.
 *
 * OPTIONAL AUDIO ASSETS
 * ---------------------
 * This build does not ship binary audio files. Drop short (under ~600ms),
 * quiet, professional .mp3 or .wav files at the paths below and they will
 * be picked up automatically — no code changes required:
 *
 *   src/renderer/public/sounds/app-open.mp3        App / boot sequence open
 *   src/renderer/public/sounds/click.mp3           Button click
 *   src/renderer/public/sounds/success.mp3         License activation success
 *   src/renderer/public/sounds/error.mp3           Error / invalid license
 *
 * Recommended source: a CC0 UI-sound pack (e.g. from freesound.org or
 * Anthropic's design team's preferred internal library). Keep each file
 * under ~80KB so the app stays fast to boot.
 */

export type SoundName = "open" | "click" | "success" | "error";

const SOUND_FILES: Record<SoundName, string> = {
  open: "./sounds/app-open.mp3",
  click: "./sounds/click.mp3",
  success: "./sounds/success.mp3",
  error: "./sounds/error.mp3",
};

const VOLUME: Record<SoundName, number> = {
  open: 0.35,
  click: 0.18,
  success: 0.32,
  error: 0.3,
};

const STORAGE_KEY = "cra-pro:sound-enabled";

let cache: Partial<Record<SoundName, HTMLAudioElement>> = {};
let warnedMissing = new Set<SoundName>();

export function isSoundEnabled(): boolean {
  if (typeof localStorage === "undefined") return true;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return true; // default: on, but unobtrusive
  return raw === "true";
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, String(enabled));
}

function getAudio(name: SoundName): HTMLAudioElement | null {
  if (typeof Audio === "undefined") return null;
  let el = cache[name];
  if (!el) {
    try {
      el = new Audio(SOUND_FILES[name]);
      el.preload = "auto";
      el.volume = VOLUME[name];
      cache[name] = el;
    } catch {
      return null;
    }
  }
  return el;
}

/**
 * Play a short UI sound. Always safe to call — does nothing if sounds are
 * disabled, the asset is missing, or the browser blocks playback (e.g. no
 * user gesture yet). Never throws.
 */
export function playSound(name: SoundName): void {
  if (!isSoundEnabled()) return;
  const audio = getAudio(name);
  if (!audio) return;
  try {
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        // Missing file, blocked autoplay, or unsupported format.
        // Silently ignored — sound is a non-critical enhancement.
        if (!warnedMissing.has(name)) {
          warnedMissing.add(name);
          // eslint-disable-next-line no-console
          console.info(
            `[soundService] "${name}" sound not played (file missing or playback blocked). ` +
              `Place an audio file at ${SOUND_FILES[name]} to enable it.`
          );
        }
      });
    }
  } catch {
    // No-op: sound is never allowed to break the app.
  }
}
