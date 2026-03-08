# ⬛ Pixel Office — AI Team HQ

A VSCode extension that turns your editor into a live pixel art office scene — staffed by your own crew of AI characters.

When Claude Code is active, your team snaps to work: monitors light up, keyboards clatter, task bubbles pop. When it goes idle, they kick back. The window outside changes with real time of day — sunrise, midday blue sky, sunset, or a twinkling night skyline.

Keep the crew as it comes, or customize it to fit your vibe — swap names, colors, types, and task bubbles to staff your office however you like.

---

## Installation

No marketplace listing yet — install manually in ~30 seconds:

1. Clone or download this repo
2. Copy the folder into your VSCode extensions directory:
   ```
   # macOS / Linux
   cp -r pixel-office ~/.vscode/extensions/pixel-office-welcome-1.0.0

   # Windows
   xcopy /E pixel-office %USERPROFILE%\.vscode\extensions\pixel-office-welcome-1.0.0\
   ```
3. Reload VSCode (`Cmd+Shift+P` → **Developer: Reload Window**)

The HQ panel opens automatically on startup.

---

## How It Works

The extension watches `~/.claude/` for two signal files:

| File | Trigger | Effect |
|------|---------|--------|
| `hq-active` | Touched when Claude starts working | Crew goes active — VIBE: SHIPPING |
| `hq-done` | Touched when Claude finishes | Crew relaxes — VIBE: CHILLING |

It also falls back to watching workspace file changes, so it works without hooks too (just less precise timing).

### Wiring Up Claude Code Hooks

For live status updates, add these hooks to `~/.claude/settings.json`. Each tool type maps to a distinct status:

| Tools | Status shown |
|-------|-------------|
| Read, Grep, Glob, WebSearch, WebFetch, Agent | RESEARCHING |
| Edit, Write, NotebookEdit | BUILDING |
| Bash | SHIPPING |
| AskUserQuestion, ExitPlanMode | WAITING |
| *(turn ends)* | CHILLING |

```json
{
  "hooks": {
    "UserPromptSubmit": [
      { "hooks": [{ "type": "command", "command": "touch ~/.claude/hq-researching" }] }
    ],
    "PreToolUse": [
      {
        "matcher": "Read|Grep|Glob|WebSearch|WebFetch|Agent",
        "hooks": [{ "type": "command", "command": "touch ~/.claude/hq-researching" }]
      },
      {
        "matcher": "Edit|Write|NotebookEdit",
        "hooks": [{ "type": "command", "command": "touch ~/.claude/hq-building" }]
      },
      {
        "matcher": "Bash",
        "hooks": [{ "type": "command", "command": "touch ~/.claude/hq-shipping" }]
      },
      {
        "matcher": "AskUserQuestion|ExitPlanMode",
        "hooks": [{ "type": "command", "command": "touch ~/.claude/hq-waiting" }]
      }
    ],
    "Stop": [
      { "hooks": [{ "type": "command", "command": "touch ~/.claude/hq-done" }] }
    ]
  }
}
```

---

## Meet the Team

These are the characters the extension ships with — five elemental types, each one wired differently. Use them as a starting point or swap in your own crew entirely.

| Name | Type | Color | Active | Idle |
|------|------|-------|--------|------|
| **BLAZE** | Fire | `#FF5533` | Building prod, hot deploy | Coffee break, vibing |
| **TIDE** | Water | `#44AAFF` | Analyzing logs, code review | Flow state, hydrating |
| **GROVE** | Grass | `#44CC44` | Writing code, green tests | Touch grass, daydreaming |
| **BOLT** | Electric | `#FFEE00` | Running CI, benchmarks | Recharging, standby |
| **MYSTIC** | Psychic | `#CC44FF` | Designing UI, manifesting | Astral plane, crystal ball |

Each type gets its own monitor visualization (fire = scrolling code flames, water = analytics bars, grass = terminal output, electric = CI pipeline, psychic = orbiting particles), unique desk items, and a type-specific glow.

---

## Staff Your Own Office

The whole crew lives in the `CHARS` array at the top of `extension.js`. Swap anyone out:

```js
const CHARS = [
  {
    id:     'blaze',       // internal id — used for hair shape selection
    name:   'BLAZE',       // display name on the name tag
    type:   'fire',        // fire | water | grass | electric | psychic
    nc:     '#FF5533',     // name/accent color
    skin:   '#F5C884',     // skin tone
    hair:   '#CC1100',     // primary hair color
    hair2:  '#FF4400',     // highlight hair color
    shirt:  '#FF6622',     // shirt primary
    shirt2: '#BB3300',     // shirt shadow / sleeve
    eye:    '#2A0A00',     // eye color
    deskX:  14,            // horizontal position (14 / 70 / 128 / 186 / 242 for 5 chars)
    animOff: 0,            // animation phase offset — spread these out so chars move independently
  },
  // ... 4 more
];
```

### Customizing Task Bubbles

The `TASKS` object maps each type to chat bubble messages — shown above characters while active or idle. Keep strings at 14 characters (pad with spaces) for clean alignment:

```js
const TASKS = {
  fire: {
    active: ['Building prod...', 'Hot deploy!  ', 'On it!        ', 'Generating... '],
    idle:   ['Coffee break  ', 'Warming up...', 'Chilling...   ', 'Vibing...     '],
  },
  // water | grass | electric | psychic
};
```

### Want More or Fewer Characters?

Remove entries from `CHARS` to shrink the team, or duplicate and modify entries to add more. If you change the count, redistribute `deskX` values to keep characters evenly spaced across the 300-unit canvas width.

---

## Features

- Live pixel art animation at 30fps
- Time-of-day sky: morning orange → midday blue → evening sunset → night with twinkling stars + moon
- Real-time clock on the wall
- Steam rising from the coffee machine
- Monitor screens with type-specific visualizations (active mode only)
- Notification badges that flash when Claude is shipping
- Radial vignette + CRT scanline overlay for that retro feel

---

## License

MIT — fork it, staff it, ship it.
