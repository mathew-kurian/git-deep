#!/usr/bin/env node

var program = require('commander');
var spawn = require('child_process').spawn;

program
  .version('0.0.1')
  .option('-c, --only-children', 'Run children only')
  .option('-p, --parallel', 'Run each child parallel')
  .parse(process.argv);

function exec(command) {
  if (!~process.platform.indexOf('win')) {
    return spawn('cmd', ['/s', '/c', command], { stdio: ['ignore', process.stdout, process.stderr] })
  } else {
    return spawn('/bin/sh', ['-c', command], { stdio: ['ignore', process.stdout, process.stderr] })
  }
}

var command = program.args.map(function (a) {
  return decodeURIComponent(a.split(' ').length > 1 ? a : a);
}).join(' ');

var child = exec('git submodule foreach \'' + __filename +
  (program.parallel ? ' -p ' : ' ') + encodeURIComponent(command) + '\' || :');

if (program.parallel) {
  exec(command);
} else {
  child.on('exit', function (code) {
    if (code !== 0 || process.onlyChildren) {
      return process.exit(code)
    }

    exec(command);
  });
}
