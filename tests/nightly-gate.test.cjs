'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const gate = require('../.github/actions/nightly-gate/gate.cjs');

function harness(runs = [], eventName = 'schedule', force = false) {
  const output = {};
  const github = {
    rest: {actions: {
      getWorkflowRun: async () => ({data: {workflow_id: 11, head_branch: 'main'}}),
      listWorkflowRuns: () => {},
    }},
    paginate: async (_method, options) => {
      assert.equal(options.head_sha, 'abc');
      assert.equal(options.workflow_id, 11);
      return runs;
    },
  };
  const core = {
    setOutput: (key, value) => { output[key] = value; }, info: () => {},
    summary: {addRaw() { return this; }, async write() {}},
  };
  const context = {repo: {owner: 'inimatic', repo: 'example'}, runId: 5, sha: 'abc', eventName};
  return gate({github, context, core, force}).then(() => output.run);
}
const passed = {id: 4, head_sha: 'abc', head_branch: 'main', event: 'schedule', html_url: 'https://example.test/run/4'};
test('new source runs the full regression', async () => assert.equal(await harness(), 'true'));
test('identical qualified source is reused', async () => assert.equal(await harness([passed]), 'false'));
test('a PR result cannot replace full qualification', async () => assert.equal(await harness([{...passed, event: 'pull_request'}]), 'true'));
test('a result from another branch cannot qualify main', async () => assert.equal(await harness([{...passed, head_branch: 'topic'}]), 'true'));
test('another source cannot qualify this source', async () => assert.equal(await harness([{...passed, head_sha: 'old'}]), 'true'));
test('an explicit rerun is never skipped', async () => assert.equal(await harness([passed], 'workflow_dispatch'), 'true'));
test('force bypasses reuse', async () => assert.equal(await harness([passed], 'schedule', true), 'true'));
test('API failures fail closed instead of silently skipping', async () => {
  await assert.rejects(gate({github: {rest: {actions: {getWorkflowRun: async () => {throw new Error('unavailable');}}}},
    context: {repo: {}, runId: 5, eventName: 'schedule'}, core: {setOutput() {}}, force: false}), /unavailable/);
});
