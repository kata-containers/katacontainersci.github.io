$(document).ready(function () {

  var icons_path = 'img';
  var icons = [
      'sunny.svg',
      'partially-sunny.svg',
      'cloudy.svg',
      'rainy.svg',
      'stormy.svg',
  ];

  function get_weather_icon(stat) {
    // for simplicity, skips are considered fails here
    // failure rates for the icons are:
    //   stormy: .8 <= x
    //   rainy:  .6 <= x < .8
    //   cloudy: .4 <= x < .6
    //   partially-sunny: .2 <= x < .4
    //   sunny:  x < .2
    var fail_rate = (stat['fails'] + stat['skips']) / stat['runs'];
    var idx = Math.floor(fail_rate * 10 / 2); // e.g. failing 3/9 runs is .33, or idx=1
    if (idx == icons.length) {
        // edge case: if 100% failures, then we go past the end of icons[]
        // back the idx down by 1
        console.assert(fail_rate == 1.0);
        idx -= 1;
    }
    var icon = icons[idx];
    img_tag = '<img src="' + icons_path + '/' + icon + '" width="35%" height="35%"></img>'
    sort_val = "image-"+idx;
    return [img_tag, sort_val];
  }

  function populate_table(job_stats) {
    for (var [name, stat] of Object.entries(job_stats)) {
      re = new RegExp('kata-containers-ci-on-push / run-.*-tests.*');
      if (re.test(name)) {
        var [img_tag, img_sort] = get_weather_icon(stat);
        var urls = stat['urls'].join(' ');
        var results = stat['results'].join(' ');
        var run_nums = stat['run_nums'].join(' ');
        $('#weather-table tbody').append(
          '<tr data-urls="'+urls+'" data-results="'+results+'" data-run-nums="'+run_nums+'">' +
            '<td class="dt-left dt-control">'+name+'</td>' +
            '<td>'+stat['runs']+'</td>' +
            '<td>'+stat['fails']+'</td>' +
            '<td>'+stat['skips']+'</td>' +
            '<td data-sort="'+img_sort+'">'+img_tag+'</td>' +
            '<td>aadam@redhat.com</td>' +
          '</tr>'
        );
      }
    }
    // Hard-code for now...could dynamically set the table name or something
    // more sophisticated later if we have want more tables, etc.
    $('#weather-table-name').append(
      '<a href="https://github.com/kata-containers/kata-containers/actions/workflows/ci-nightly.yaml">'
    + 'Kata Containers CI Nightly'
    + '</a>'
    );
  }

  // Create the hyperlinks that will show up when we click a name for more
  // details. Each <tr> should have a data-urls and data-results attribute
  // with space-separated urls and pass/fail results, respectively. Create
  // and return the appropriate HTML string from them.
  function format_tr_job_urls(tr) {
    var job_urls = '';
    var urls = $(tr).data('urls').split(' ');
    var results = $(tr).data('results').split(' ');
    var run_nums = $(tr).data('run-nums').split(' ');
    var result_to_color = {
        'Pass': '&#128994;', // green
        'Skip': '&#128993;',    // yellow
        'Fail': '&#128308;',    // red
    }
    for (var i = 0; i < urls.length; i++) {
        job_urls += '' + result_to_color[results[i]]
                       + '<a href="'
                       + urls[i]
                       + '">'
                       + run_nums[i]
                       + '</a><span class="p-2"></span>';
    }
    return job_urls;
  }

  function set_datatable_options() {
    var table = new DataTable('#weather-table', {
      order: [[2, 'desc']],
      paging: false
    });
    table.on('click', 'td.dt-control', function (e) {
      let tr = e.target.closest('tr');
      let row = table.row(tr);
      if (row.child.isShown()) {
          row.child.hide();
      } else {
          row.child(format_tr_job_urls(tr)).show();
      }
    });
  }

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
        console.log('dumping jobs_request');
        console.log(jobs_request);
        console.log('entry[jobs].length before '+entry['jobs'].length);
        for (const job of jobs_request['jobs']) {
          entry['jobs'].push({
            'name': job['name'],
            'run_id': job['run_id'],
            'html_url': job['html_url'],
            'conclusion': job['conclusion'],
          });
        }
        console.log('entry[jobs].length after '+entry['jobs'].length);
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
    console.log('main');
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
    console.log("Dumping runs_map");
    console.log(runs_map);
    console.log("Done dumping runs_map");

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

    console.log("Dumping job_stats");
    console.log(job_stats);
    console.log("Done dumping job_stats");

    populate_table(job_stats);
    set_datatable_options();
    console.log('main end');
  }

  function foo_test_branch_data() {
    console.log('foo_test_branch_data');
    populate_table(ci_nightly_data);
    set_datatable_options();
  }

  function foo_main() {
    console.log('foo_main');
    populate_table(test9_job_stats);
    set_datatable_options();
  }

  foo_test_branch_data();
  //foo_main();
  //main();
});
