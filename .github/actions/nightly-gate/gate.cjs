'use strict';

module.exports = async function gate({github, context, core, force, environment = '', mode = 'check', image = process.env.ImageVersion}) {
  const identity = environment && image ? require('node:crypto').createHash('sha256')
    .update(JSON.stringify({environment, image, source: context.sha})).digest('hex') : '';
  const receipt = identity ? `adaos-qualification-${identity}` : '';
  if (mode === 'record') {
    if (receipt) {
      const path = require('node:path').join(process.env.RUNNER_TEMP, 'adaos-qualification-receipt.json');
      require('node:fs').writeFileSync(path, JSON.stringify({source: context.sha, environment, image, run: context.runId}));
      core.setOutput('receipt', receipt);
    }
    return;
  }
  if (force || context.eventName !== 'schedule') {
    core.setOutput('run', 'true');
    core.info('Explicit qualification: running the complete regression.');
    return;
  }
  const repo = {...context.repo};
  const {data: current} = await github.rest.actions.getWorkflowRun({...repo, run_id: context.runId});
  const runs = await github.paginate(github.rest.actions.listWorkflowRuns, {
    ...repo, workflow_id: current.workflow_id, head_sha: context.sha,
    status: 'success', per_page: 100,
  });
  const candidates = runs.filter(run => run.id !== context.runId &&
    run.workflow_id === current.workflow_id && run.conclusion === 'success' &&
    run.head_sha === context.sha && run.head_branch === current.head_branch &&
    ['push', 'schedule', 'workflow_dispatch'].includes(run.event));
  let qualified;
  for (const candidate of candidates) {
    if (!environment) { qualified = candidate; break; } // Existing consumers retain their explicit policy.
    if (!receipt) break; // Unknown runner image cannot prove an equivalent environment.
    const artifacts = await github.paginate(github.rest.actions.listWorkflowRunArtifacts,
      {...repo, run_id: candidate.id, per_page: 100});
    if (artifacts.some(item => item.name === receipt && !item.expired)) { qualified = candidate; break; }
  }
  core.setOutput('run', qualified ? 'false' : 'true');
  if (qualified) {
    core.info(`Source ${context.sha} already qualified by ${qualified.html_url}; retaining that result.`);
    await core.summary.addRaw(`Regression reused for unchanged source \`${context.sha}\`: ${qualified.html_url}\n`).write();
  } else {
    core.info(`No successful qualification of ${context.sha}; running the complete regression.`);
  }
};
