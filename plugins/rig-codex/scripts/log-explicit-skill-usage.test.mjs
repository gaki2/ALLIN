import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  createUsageEntries,
  getExplicitSkillNames,
} from './log-explicit-skill-usage.mjs';

test('extracts unique explicit skill mentions', () => {
  const input = {
    hook_event_name: 'UserPromptSubmit',
    prompt: 'Use $skill-creator, then $plugin-name:review and $skill-creator.',
  };

  assert.deepEqual(getExplicitSkillNames(input), [
    'skill-creator',
    'plugin-name:review',
  ]);
});

test('ignores escaped, monetary, and non-prompt values', () => {
  assert.deepEqual(
    getExplicitSkillNames({
      hook_event_name: 'UserPromptSubmit',
      prompt: String.raw`Explain \$skill-creator and a $100 budget.`,
    }),
    [],
  );
  assert.deepEqual(
    getExplicitSkillNames({
      hook_event_name: 'PostToolUse',
      prompt: 'Use $skill-creator.',
    }),
    [],
  );
});

test('creates privacy-minimal explicit entries', () => {
  const entries = createUsageEntries(
    {
      hook_event_name: 'UserPromptSubmit',
      prompt: '$CAVEMAN-COMMIT write a message for secret details',
      session_id: 'session-1',
      cwd: '/workspace',
    },
    '2026-08-02T00:00:00.000Z',
  );

  assert.deepEqual(entries, [
    {
      source: 'codex',
      skillName: 'caveman-commit',
      usedAt: '2026-08-02T00:00:00.000Z',
      trackingMode: 'explicit',
      sessionId: 'session-1',
      cwd: '/workspace',
    },
  ]);
  assert.equal(JSON.stringify(entries).includes('secret details'), false);
});

test('appends hook output in the format Rig reads', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'rig-codex-hook-'));
  const logPath = join(directory, 'usage.jsonl');
  const scriptPath = fileURLToPath(
    new URL('./log-explicit-skill-usage.mjs', import.meta.url),
  );
  const input = JSON.stringify({
    hook_event_name: 'UserPromptSubmit',
    prompt: 'Use $skill-creator and $caveman-commit.',
    session_id: 'session-2',
    cwd: '/workspace',
  });

  await runHook(scriptPath, input, logPath);

  const records = (await readFile(logPath, 'utf8'))
    .trim()
    .split('\n')
    .map(line => JSON.parse(line));

  assert.deepEqual(
    records.map(record => [record.source, record.skillName]),
    [
      ['codex', 'skill-creator'],
      ['codex', 'caveman-commit'],
    ],
  );
});

const runHook = (scriptPath, input, logPath) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      env: { ...process.env, RIG_USAGE_LOG_PATH: logPath },
      stdio: ['pipe', 'ignore', 'pipe'],
    });
    let errorOutput = '';

    child.stderr.on('data', chunk => {
      errorOutput += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(errorOutput || `Hook exited with ${code}`));
    });
    child.stdin.end(input);
  });
