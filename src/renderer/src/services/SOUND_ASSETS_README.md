# Sound assets

Drop short, quiet, professional sound effects here with these exact filenames.
They are wired up automatically by `src/renderer/src/services/soundService.ts` —
no code changes required.

| File             | Used for                          | Suggested length |
|------------------|------------------------------------|-------------------|
| `app-open.mp3`   | App boot / loading screen start    | 300–700ms |
| `click.mp3`      | Button clicks                      | 60–150ms |
| `success.mp3`    | Successful license activation      | 300–600ms |
| `error.mp3`      | Errors / invalid license           | 200–400ms |

Guidelines:
- Keep everything subtle — short, clean "UI chime" style sounds, not music.
- Normalize volume so nothing is jarring; the app also applies its own
  per-sound volume scaling.
- `.mp3` or `.wav` both work. Keep files small (well under 100KB each) so
  app boot stays fast.
- If a file is missing, the app simply skips that sound — nothing breaks.

A good source for free, license-friendly UI sounds is a CC0 sound effect
pack (e.g. from freesound.org, filtered to CC0 license).
