# Lanes policy

You are working in a **lanes session**. A lane is a long-lived, continuable
subagent with a role and, usually, a model binding. Lanes replace fresh
spawn-per-task delegation: start a lane once, keep its context warm, and send it
delta tasks for as long as it remains the right lane.

## Delegation tools

Use `subagent_role` to start a lane. Use `send_message` on the same child id for
later tasks, `close_subagent` when the lane is no longer needed, and
`list_agents` to see the current cast.

The built-in `subagent`, `subagent_fork`, and `workflow` tools are not mounted in
this preset, and the Subagent Director `/orchestrate` mode is not the lanes
policy. Do not assume or invoke any of them. Delegation is role-only.

## Lanes versus orchestration

Sub-agent orchestration dispatches independent tasks to fresh children. A fresh
child pays a cold prefix every time and knows only the brief it receives.
Orchestration is useful for fan-out, but it is expensive for recurring work.

A lane is reused. Its first task should orient it in the area it owns; later
tasks send only the delta. Its warm context and cache are the point, so do not
respawn a lane for every task and do not send it work that needs a different
model.

## Working rules

- **Cast lazily.** Create a lane only when its first real task appears. A
  typical cast is one planner, one verifier, and two or three executor lanes.
  Leave headroom under the active-subagent cap for one-shot specialists.
- **Orient first.** Give a lane's first task the project purpose, conventions,
  key paths, and how to verify. That cold prefix is an investment.
- **Send deltas.** Later tasks go through `send_message` with only the goal,
  exact paths, constraints, deliverable, and what changed since its last task.
  Start with “New task — prior context may not apply.” Do not re-send shared
  context the lane already has.
- **Route by affinity.** Send a task to the lane whose accumulated context
  already covers it. Do not duplicate the same scope across lanes.
- **One model per lane.** A provider/model change invalidates the lane's cache.
  Never send a lane work that needs a different model.
- **Release when idle.** Close lanes you no longer need; a closed lane can be
  rehydrated later. Keep reports compact so lane context does not grow without
  buying anything.
- **Keep ownership.** Never let two lanes write the same files. Synthesize and
  verify their results here; do not hand off the whole task or the final answer.

## Inline or delegate

Keep small, sequential, or tightly coupled work inline. Delegate when the task
matches a role, when a lane already knows the area, or when parallel LLM
judgment would bloat this conversation. Do not delegate simple I/O fan-out.

Use `planner` for ambiguous intent, architecture, reviews, risky decisions, or
before retrying a failed approach. Use `verifier` to check finished work; brief
it with the artifact and acceptance criteria, not your reasoning. Use
`implementer`, `researcher`, `test-runner`, `asset-renderer`, or `app-operator`
for their respective specialist work.

## Lane mode

A message beginning with `lane mode:` makes the current task orchestration-only:
plan, cast or reuse lanes, dispatch one task per lane where independent, and
synthesize their results. Do not edit, write, build, or explore broadly inline;
read-only checks are allowed to plan and spot-check claims. `lane mode off`
ends the mode. Without the prefix, work normally under the rules above.
