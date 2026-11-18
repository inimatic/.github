'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const gate = require('../.github/actions/nightly-gate/gate.cjs');

function harness(runs = [], eventName = 'schedule', force = false, evidence = {}) {
  const output = {};
  const github = {
    rest: {actions: {
      getWorkflowRun: async () => ({data: {workflow_id: 11, head_branch: 'main'}}),
      listWorkflowRuns: () => {},
      listWorkflowRunArtifacts: () => {},
    }},
    paginate: async (_method, options) => {
      if (options.run_id) return evidence.artifacts || [];
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
  return gate({github, context, core, force, ...evidence}).then(() => output.run);
}
const passed = {id: 4, workflow_id: 11, conclusion: 'success', head_sha: 'abc', head_branch: 'main', event: 'schedule', html_url: 'https://example.test/run/4'};
test('new source runs the full regression', async () => assert.equal(await harness(), 'true'));
test('identical qualified source is reused', async () => assert.equal(await harness([passed]), 'false'));
test('a successful push already qualifies the same branch and source', async () => assert.equal(await harness([{...passed, event: 'push'}]), 'false'));
test('a failed run never qualifies source', async () => assert.equal(await harness([{...passed, conclusion: 'failure'}]), 'true'));
test('a different workflow cannot qualify source', async () => assert.equal(await harness([{...passed, workflow_id: 12}]), 'true'));
test('the current run cannot qualify itself', async () => assert.equal(await harness([{...passed, id: 5}]), 'true'));
test('main push always receives fresh qualification', async () => assert.equal(await harness([passed], 'push'), 'true'));
test('a PR result cannot replace full qualification', async () => assert.equal(await harness([{...passed, event: 'pull_request'}]), 'true'));
test('a result from another branch cannot qualify main', async () => assert.equal(await harness([{...passed, head_branch: 'topic'}]), 'true'));
test('another source cannot qualify this source', async () => assert.equal(await harness([{...passed, head_sha: 'old'}]), 'true'));
test('an explicit rerun is never skipped', async () => assert.equal(await harness([passed], 'workflow_dispatch'), 'true'));
test('force bypasses reuse', async () => assert.equal(await harness([passed], 'schedule', true), 'true'));

test('environment-qualified consumers require a matching, unexpired receipt', async () => {
  const environment = 'python3.11-node22-locked-v1', image = '20261118.1';
  const hash = require('node:crypto').createHash('sha256').update(JSON.stringify({environment,image,source:'abc'})).digest('hex');
  const name = `adaos-qualification-${hash}`;
  assert.equal(await harness([passed], 'schedule', false, {environment,image}), 'true');
  assert.equal(await harness([passed], 'schedule', false, {environment,image,artifacts:[{name,expired:false}]}), 'false');
  assert.equal(await harness([passed], 'schedule', false, {environment,image,artifacts:[{name,expired:true}]}), 'true');
  assert.equal(await harness([passed], 'schedule', false, {environment,image:'new',artifacts:[{name,expired:false}]}), 'true');
});
test('API failures fail closed instead of silently skipping', async () => {
  await assert.rejects(gate({github: {rest: {actions: {getWorkflowRun: async () => {throw new Error('unavailable');}}}},
    context: {repo: {}, runId: 5, eventName: 'schedule'}, core: {setOutput() {}}, force: false}), /unavailable/);
});
