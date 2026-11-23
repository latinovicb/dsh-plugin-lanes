/**
 * Lanes policy section for the lanes agent preset.
 *
 * The policy lives in this package so a lanes profile does not depend on an
 * external AGENTS.md file. The preset mounts this plugin; the section is
 * therefore scoped to lanes agents and their children.
 */

import { readFileSync } from 'node:fs';

export const name = 'lanes-policy';
export const inject = ['systemPrompt'];

const POLICY = readFileSync(new URL('./policy.md', import.meta.url), 'utf8');

export function apply(ctx) {
  ctx.effect(
    () =>
      ctx.systemPrompt.section({
        name: 'lanes:policy',
        order: 55,
        text: POLICY,
        interpolate: false,
      }),
    'lanes: policy section',
  );
}
