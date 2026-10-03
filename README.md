# Breach Party

**[Play the public game](https://breach-party.vreddy0802.chatgpt.site)**

A server-backed cybersecurity party game for 2–8 players. Create a room, share its six-character code, and answer ten timed scenarios. The host chooses a shared difficulty in the lobby: Standard uses everyday cyber dilemmas with 25-second answers (about 6–7 minutes); Hard uses technical questions with 45-second answers (about 9–10 minutes). Each mode has 18 questions. Hard covers SQL injection, SSRF, object authorization, JWT validation, DNS tunneling, credential theft, cloud permissions, token revocation, password storage, segmentation, phishing-resistant MFA, and mutual TLS.

Each game draws three scenarios from each category, plus one extra from a randomly chosen category: Spot the trap, Stop the breach, and Build the shield. Questions do not repeat within a game. Correct responses earn 1,000 points plus up to 500 for speed, scaled to the chosen mode's answer window. Answers and round score changes stay hidden until everyone responds or time runs out. Reveals explain the security concept and remain visible for 15 seconds before the server automatically advances everyone. The host can move on sooner with Next round. Replay returns the same crew to the lobby with scores reset and the selected difficulty preserved. The host can change modes before starting again.

The Spy Dossier design opens in Dark Ink: tan surfaces, dark text, serif case headings, and red accents. A light/dark toggle is available on every screen. It remembers the device's preference in localStorage, applies it before the first paint on reload, and never changes the shared room state. Dark mode uses charcoal surfaces with light text. If browser storage is unavailable, the toggle still works for the current visit.

## Shared state

Cloudflare D1 stores room state. Version-checked updates serialize simultaneous joins and answers. The server owns difficulty, question order, deadlines, scoring, host handoff, and phase transitions. Only the host can change difficulty, and only in the lobby. Stored rooms without a difficulty field default to Standard. Clients poll once per second and retain only their session capability in sessionStorage to reconnect after a refresh. Inactive rooms expire after 24 hours. No game account is required. The hosted game is publicly accessible; players join using nicknames.

## Run locally

Use Node.js 22.13 or newer and the package manager declared in package.json (pnpm 11.25.0). Open a terminal in the repository folder and run:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_nifty_ultron.sql --yes
pnpm start
```

The database initialization command is for a fresh local database; run it once. Open the local URL printed by the server. To test two players on one computer, use separate browser sessions, such as a normal window and a private window. Shared-device tabs can otherwise inherit a player's session.

## Validation

The deployed snapshot passed TypeScript checking and 368 multiplayer integration checks in both modes with eight clients. Coverage includes concurrent joins and answers, shared questions and deadlines, host permissions, hidden answers, scoring, ten unique rounds, replay, reconnect, timeouts, host handoff, and the 15-second explanation interval.

After building, rerun checks from the repository folder with:

```sh
pnpm exec tsc --noEmit
node tests/multiplayer.mjs
```

The integration tests use an isolated local D1 database.

## Technical question references

Questions are original scenarios reviewed against primary guidance: [OWASP cheat sheets](https://cheatsheetseries.owasp.org/), [MITRE ATT&CK](https://attack.mitre.org/), [AWS IAM best practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html), [S3 Block Public Access](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html), [CISA StopRansomware](https://www.cisa.gov/stopransomware/ransomware-guide), [CISA MFA guidance](https://www.cisa.gov/MFA), [JWT security (RFC 8725)](https://www.rfc-editor.org/rfc/rfc8725.html), [token revocation (RFC 7009)](https://www.rfc-editor.org/rfc/rfc7009.html), and [TLS 1.3 (RFC 8446)](https://www.rfc-editor.org/rfc/rfc8446.html).

## Project layout

| Path | Purpose |
| --- | --- |
| `app/` | Game screens, CSS, and room API routes |
| `lib/` | Rules, question banks, protocol, and room storage |
| `components/` and `hooks/` | Shared interface components and hooks |
| `db/` and `drizzle/` | D1 schema and database migration |
| `public/` | B browser-tab icon |
| `build/` and `scripts/` | Build and runtime support |
| `tests/` | Multiplayer integration checks |
| `.openai/hosting.json` | Sites project identity and logical database binding |
| `pnpm-lock.yaml` | Reproducible dependency versions |

## GitHub and hosting

Built with ChatGPT Work and Sites for the AI Skills Studio multiplayer game challenge. The playable game is hosted through Sites; this repository stores its source. Uploading the source to GitHub does not enable automatic deployment. The multiplayer server requires its Worker runtime and D1 database. GitHub Pages provides static hosting and cannot run this backend by itself.

See [the upload guide](docs/GITHUB_UPLOAD.md) to add this project to an existing repository. Bundled third-party license notices are retained in `build/` and `vendor/`.

Application snapshot: `fcc3246a86fc307ec2e616307d4c155973ae1ab4`. This package updates documentation; the application files match the public release.
