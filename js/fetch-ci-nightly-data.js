

async function fetch_workflow_runs() {
    var workflow_runs_url = 'https://api.github.com/repos/kata-containers/kata-containers/actions/workflows/ci-nightly.yaml/runs?per_page=10';
    return fetch(workflow_runs_url, {
        headers: {
          "Accept": "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
    }).then(function(response) { return response.json(); });
}

function process_a_run(run) {
    async function fetch_page(which_page) {
        var page_size = 100;
        var jobs_url = run['jobs_url']+'?per_page='+page_size+'&page='+which_page;
        return fetch(jobs_url, {
            headers: {
              "Accept": "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28",
            },
        }).then(function(response) { return response.json(); });
    }
    function fetch_pages(p) {
        return fetch_page(p).then(function(jobs_request) {
            //console.log('dumping jobs_request');
            //console.log(jobs_request);
            //console.log('entry[jobs].length before '+entry['jobs'].length);
            for (const job of jobs_request['jobs']) {
                entry['jobs'].push({
                  'name': job['name'],
                  'run_id': job['run_id'],
                  'html_url': job['html_url'],
                  'conclusion': job['conclusion'],
                });
            }
            //console.log('entry[jobs].length after '+entry['jobs'].length);
            //old code:
            //  total_count = Math.max(total_count, jobs_request['total_count']);
            //  if entry['jobs'].length >= total_count:
            // FIXME... dont hard-code 100 here... also may need to verify
            // that entry is correct through all of this; scope was originally
            // wrong which prompted this changed if-check to at least not
            // spam the github api
            if (p * 100 >= jobs_request['total_count']) {
                return entry;
            }
            return fetch_pages(p+1);
        });
    }
    var entry = {
        'id': run['id'],
        'run_number': run['run_number'],
        'created_at': run['created_at'],
        'conclusion': null,
        'jobs': []
    };
    if (run['status'] == "in_progress") {
        return new Promise((resolve) => { resolve(entry); });
    }
    entry['conclusion'] = run['conclusion'];
    return fetch_pages(1);
}

async function main() {
    //console.log('main');
    var workflow_runs = await fetch_workflow_runs();
    //console.log(workflow_runs);

    // execution reaches here when we have workflow_runs in hand.

    var promises_buf = [];
    for (const run of workflow_runs['workflow_runs']) {
        promises_buf.push(process_a_run(run));
    }
    runs_map = await Promise.all(promises_buf);


    // execution reaches here when all remote requests are completed and
    // runs_map holds everything.
    //console.log("Dumping runs_map");
    //console.log(runs_map);
    //console.log("Done dumping runs_map");

    var job_stats = {};
    for (const run of runs_map) {
        for (const job of run['jobs']) {
            var job_stat = job_stats[job['name']] ?? {
                'runs': 0,
                'fails': 0,
                'skips': 0,
                'urls': [],
                'results': [],
                'run_nums': []
            };
            job_stat['runs'] += 1;
            job_stat['run_nums'].push(run['run_number']);
            if (job['conclusion'] != 'success') {
                if (job['conclusion'] == 'skipped') {
                    job_stat['skips'] += 1;
                    job_stat['results'].push('Skip');
                } else { // failed and cancelled
                    job_stat['fails'] += 1;
                    job_stat['results'].push('Fail');
                }
            } else {
                job_stat['results'].push('Pass');
            }
            job_stat['urls'].push(job['html_url']); // fixme ... weird way to do this but it works
            job_stats[job['name']] = job_stat;
        }
    }

    //console.log("Dumping job_stats");
    //console.log(job_stats);
    console.log('var ci_nightly_data = ');
    console.log(job_stats)
    console.log(';');

    //console.log("Done dumping job_stats");

    //populate_table(job_stats);
    //set_datatable_options();
    //console.log('main end');
}


main();
