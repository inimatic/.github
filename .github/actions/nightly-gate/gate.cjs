'use strict';

module.exports = async function gate({github, context, core, force}) {
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
  const qualified = runs.find(run => run.id !== context.runId &&
    run.head_sha === context.sha && run.head_branch === current.head_branch &&
    ['schedule', 'workflow_dispatch'].includes(run.event));
  core.setOutput('run', qualified ? 'false' : 'true');
  if (qualified) {
    core.info(`Source ${context.sha} already qualified by ${qualified.html_url}; retaining that result.`);
    await core.summary.addRaw(`Regression reused for unchanged source \`${context.sha}\`: ${qualified.html_url}\n`).write();
  } else {
    core.info(`No successful qualification of ${context.sha}; running the complete regression.`);
  }
};
