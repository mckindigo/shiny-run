# Shiny Run

A Marbles-on-Stream-style chat racing game for Kick, made as a 1920x1080 OBS browser source (60 fps, no facecam needed). Chat types `!play`, gets a little trinket racer, and real 2D physics sends everyone tumbling down a scrolling track while a giant crow tries to snatch the shiniest ones.

**Live:** https://mckindigo.github.io/shiny-run/

## The loop (runs by itself)
1. **Lobby** (40s, countdown; Settings can change it to 20-90s): chat types `!play` to join. Each racer gets a random trinket (bottle cap, coin, ring or gem), or picks one with `!play cap` / `!play coin` / `!play ring` / `!play gem`. Every trinket has **identical physics**: the type is cosmetic only. Your Kick name color tints your trinket. The lobby also announces the crow's mood and the next track.
2. **Race** (about 65-85s; the winner usually crosses at 40-55s): 3-2-1, then racers drop in staggered waves and roll down one of 3 tracks (picked at random, never the same twice in a row):
   - **Rooftop Gutter Run**, **Neon City Sewer**, **Junkyard**: zigzag slopes, peg + bumper fields, spinners, funnels, a big drop, then the finish.
   - The camera follows the leaders. Name tags show only for the top 5 (and briefly for anyone whose owner just chatted). A live top-5 panel sits on the right.
   - **The giant crow**: its mood is announced before each race. **Lazy** = 1 slow snatch, **Greedy** = 1 snatch, gems only, **Furious** = 2 snatches. Before each snatch there is a big shadow and **CAW!** about 2s early, then it swoops (usually at a racer near the front, sometimes a random one). A **SNATCHED** card and a slow-mo instant-replay picture-in-picture follow.
   - **Crow's Nest rescue**: the snatched racer sits in the nest for 10s. If enough *different* chatters type `!caw` (max(3, 15% of the racers)), the crow drops it back onto the track. Otherwise it's out.
   - **Chaos vote** (rare: at most once per race, about half of races, with a 75s cooldown): 10s to vote `!wind` (sideways gust) or `!quake` (track shake). Needs max(3, 8% of the racers) votes or nothing happens.
   - The race ends when everyone is done, 34s after the winner, or at 100s.
3. **Results** (14s): podium for the top 3, then the stream-long points leaderboard. **10 / 6 / 4** points for the podium, **+1** for every finisher. Wins only add **bling**: a gold rim after 1 win, sparkles after 2, an aura after 4. Bling is cosmetic, is saved on this PC, and shows on that chatter's trinket in later races. Then back to the lobby.

There are no subscriber or follower perks of any kind. Everyone's trinket races exactly the same.

## Chat commands
| command | when | what |
|---|---|---|
| `!play` | lobby | join the next race (random trinket) |
| `!play cap` / `coin` / `ring` / `gem` | lobby | join with (or switch to) that trinket |
| `!caw` | someone is in the Crow's Nest | help rescue them (one per chatter counts) |
| `!wind` / `!quake` | during a chaos vote | vote for the chaos effect (latest vote counts) |

## OBS
Browser source, URL above, 1920x1080, 60 fps. Keys (use Interact in OBS): **S** settings, **P** pause/resume (there's also a small pause button bottom-right), **N** skip (lobby: start now; race: call it now; results: next lobby).

Settings: Kick channel and chatroom id (default `croww` / `962037`, with Look up; it reads the public chat socket only, no login), lobby length, Test mode (fake chat bots, bot count; Off removes every bot racer, vote and leaderboard row), Theme, Reset leaderboard, Reset bling.

URL options: `?theme=neutral` (no branding; saved), `?test=1`, `?bots=150`, `?transparent=1` (see-through background; the default is opaque), `?channel=<slug>&room=<id>`, `?connect=0`.

## Themes
`croww` (default: cream/maroon/olive/tan, the neon CROWW sign and the hooded mascot) and `neutral` (Art's slate/teal palette and the Pip mascot, with no "Croww" text except the small credit). See `src/1b-theme.js`.

## Dev
- `npm i`, then `node tools/build.js` concatenates `src/` into the single `index.html`, inlining Matter.js 0.20 (MIT, `vendor/`), the Oswald font and the art in `assets/`.
- `node tools/verify.js` runs the headless checks (puppeteer-core + Chrome at /usr/bin/google-chrome). It writes test screenshots to `shots/test/` (gitignored) and refreshes the reference shots in `shots/`.
- `node tools/tune.js 150 2` simulates races per track and prints timings.

made by Croww · kick.com/croww
