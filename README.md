# dsh-plugin-lanes

A self-contained DeepSeek Harness bundle for **role-only subagent lanes**.

It installs the `lanes` agent preset, configures
[`dsh-plugin-subagent-director`](https://www.npmjs.com/package/dsh-plugin-subagent-director)
with the checked-in roles, and injects the lanes policy from this package. No
external `AGENTS.md` policy is required for lanes sessions.

## What a lane is

A lane is a **long-lived, continuable subagent with a role and usually a model
binding**. Start it with `subagent_role`, then reuse the same durable child id
with `send_message`. Its warm context and prompt cache are the point: the first
task orients it, later tasks are deltas. The bundle sets the director's
`backgroundMode: continuable`, so a lane is the default shape of a role
delegation.

The `lanes` preset is the shipped `standard` preset minus the built-in
`subagent`, `subagent_fork`, and `workflow` tools. Delegation in a lanes session
therefore goes only through the director's role lanes: `subagent_role`,
`send_message`, `close_subagent`, `interrupt_agent`, and `list_agents`. A model
cannot bypass a role's model binding by reaching for a built-in delegation tool.

## Lanes vs sub-agent orchestration

| | Lanes | Sub-agent orchestration |
|---|---|---|
| Unit | A role-bound continuable child kept for the session | A fresh child created for a task |
| Context | Warm; reused through `send_message` and delta briefs | Cold; each child knows only its brief |
| Dispatch | `subagent_role`, then `send_message` on the same id | Built-in `subagent` / `subagent_fork`, `workflow`, or the director's spawn-per-task `/orchestrate` |
| Parent role | Can work inline; delegates the slices that fit a lane | Often a pure orchestrator that only dispatches |
| Cost | Cold prefix once per lane, then mostly cache reads | Cold prefix and tool catalog for every fresh child |
| Best for | Recurring work in an area, a standing planner/verifier, iterative review, implementation relay | Independent fan-out, one-off specialists, scripted multi-agent workflows |
| This preset | Built-in delegation tools are removed; policy comes from this package | Use the `standard` preset deliberately when you want built-ins or workflows |

A lane is **not** a replacement for every subagent. Use the built-in tools or a
workflow when the task is genuinely independent fan-out. Use a lane when the
same worker will receive several tasks and its accumulated context is valuable.

The director's `/orchestrate` mode is a separate spawn-per-task contract. It is
not the lanes workflow, and this package's policy tells the model not to use it.
The lanes preset also omits `workflow-ptc`/`tool-workflow`.

## What this bundle owns

- the `subagent-director` and `subagent-director-bridge` rows (inserted);
- the director roles and defaults from `cordis.patch.yml`;
- the `agent-preset-registry` default of `lanes`;
- the generated `preset-lanes` row;
- a `lanes-policy` row inside the preset, backed by this package's `index.js`
  and `policy.md`.

The policy plugin is mounted **inside** the `lanes` preset, so its system-prompt
section is scoped to lanes agents; a session on `standard` does not receive it.

`package.json` depends on `dsh-plugin-subagent-director@^0.6.0`. Do **not** also
select the director bundle in the same profile: this bundle inserts its rows, so
selecting both duplicates them.

The preset still includes `@deepseek-ai/dsh-agent-instructions` for project and
user-global instruction files. The old lanes policy in `~/.dsh/AGENTS.md` must be
removed or trimmed; otherwise the model receives the lanes policy twice.

## Prerequisites

- DSH `0.2.2-rc.1`. The preset is generated from that release's `standard`
  preset; `engines.dsh` pins it.
- `pnpm` on the PATH of the process running `dsh web`. Match the pnpm major to
  the profile's existing store; this machine's profile uses the v11 store.
- Provider routes and the `subagent-model-selection` allowlist used by the
  checked-in roles: `opencode-go` with `deepseek-v4.1-flash` and `glm-5.3`.
  Adjust the roles or the allowlist if your routes differ.
- The package dependency supplies the director code. Do not also select the
  `dsh-plugin-subagent-director` bundle.

## Install

In the Harness Web UI, open **Settings → Plugins → Add plugin** and give the
absolute path to this package. Then restart `dsh web` and reload the page.

### Migrating from the home_config patch

If the profile already uses the `home_config` lanes setup, do this first:

1. Back up `~/.dsh/profiles/web/cordis.patch.yml`.
2. Remove these entries from the live patch (and from
   `home_config/dsh/web-cordis.patch.yml` if you want the change to persist):
   - the `subagent-director` config override;
   - the `agent-preset-registry` default override;
   - the `- insert:` entry holding `preset-lanes`.
3. Remove `dsh-plugin-subagent-director` from `dsh.profile.bundles` so its own
   bundle patch does not insert the same director rows. Keeping it as a normal
   dependency is fine; this bundle also depends on it.
4. Remove or trim the old lanes policy in `~/.dsh/AGENTS.md` / the
   `home_config/dsh/AGENTS.md` symlink. Keep project-level instruction files.
5. Install this bundle, restart `dsh web`, and open a new session.

Keep the provider/model/theme rows (`agent-default-model`, `llm-pi-ai`,
`subagent-model-selection-settings`, `ui-theme`, and so on) in the profile patch.

The volatile *Settings → Agent presets → set as new task default* control still
outranks `default: lanes`; leave it unset if lanes should be the default.

## Regenerate after a DSH upgrade

The `lanes` preset is a copy because a later patch layer cannot remove nested
preset rows. After changing DSH versions, refresh it against the installed
`@deepseek-ai/dsh-web-app`:

```bash
./gen-lanes-preset.py --target cordis.patch.yml
git diff -- cordis.patch.yml
```

The generator also appends the `lanes-policy` child row. The diff should contain
only changed plugin rows, and must never re-add `tool-subagent`,
`tool-subagent-fork`, `workflow-ptc`, or `tool-workflow`. Update `engines.dsh`
and the package version in the same change.

## What `lane mode:` means

`lane mode:` is a **policy trigger**, not a slash command. A message beginning
with it makes the current task orchestration-only: plan, cast or reuse lanes,
dispatch one task per lane where independent, and synthesize. `lane mode off`
ends it. Without the prefix, the main agent may work inline and delegate the
slices that benefit from a lane.

A real `/lanes` command would need a command + per-session projection + prompt
section. This package deliberately does not add one; the policy section already
defines the behavior, and avoiding a new session event type keeps old sessions
loadable.

## Verify

Compose a copy of the profile and check:

- exactly one `subagent-director` row, enabled, with the `verifier` role;
- exactly one `subagent-director-bridge` row;
- exactly one `preset-lanes` row declaring `id: lanes`;
- the preset has no `tool-subagent`, `tool-subagent-fork`, `workflow-ptc`, or
  `tool-workflow` row, and keeps `tool-subagent-control`;
- a `lanes-policy` row names this package;
- `agent-preset-registry` defaults to `lanes`.

Do not use the `home_config` verifier with its live profile unchanged: the live
profile selects the director bundle, so the candidate patch's inserted director
rows would duplicate. Verify against a profile copy with that bundle selection
removed.

## Files

- `cordis.patch.yml` — director rows/config, registry default, generated lanes
  preset, and policy row.
- `index.js` — Host half registering the preset-scoped system prompt section.
- `policy.md` — lanes policy text.
- `gen-lanes-preset.py` — refreshes the preset from the installed DSH.
- `locale/en.json`, `locale/zh.json` — bundle display metadata.
- `icon.svg` — bundle artwork.
