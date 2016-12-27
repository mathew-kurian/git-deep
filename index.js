#!/usr/bin/env node

var program = require('commander');
var spawn = require('child_process').spawn;
var execSync = require('child_process').execSync;
var chalk = require('chalk');

program
  .allowUnknownOption(true)
  .version(require('./package.json').version)
  .usage('[options] <command...>')
  .option('-c, --childrenOnly', 'Run children only')
  .option('-p, --parallel', 'Run each child parallel')
  .parse(process.argv);

function exec(command) {
  if (!~process.platform.indexOf('win')) {
    return spawn('cmd', ['/s', '/c', command], {
      stdio: ['ignore', process.stdout, process.stderr],
      cwd: process.cwd()
    })
  } else {
    return spawn('/bin/sh', ['-c', command], {
      stdio: ['ignore', process.stdout, process.stderr],
      cwd: process.cwd()
    })
  }
}

var optionMap = { '-c': true, '--only-children': true, '-p': true, '--parallel': true };

function stripStart(rawArgs) {
  if (optionMap.hasOwnProperty(rawArgs[0])) {
    rawArgs.splice(0, 1);
    return stripStart(rawArgs);
  }

  return rawArgs;
}

var rawArgs = stripStart(program.rawArgs.slice(2));

var command = rawArgs.map(function (a) {
  return decodeURIComponent(a.split(' ').length > 1 ? a : a);
}).join(' ');

try {
  execSync('git status');

  var child = exec('git submodule foreach \'' + __filename +
    (program.parallel ? ' -p ' : ' ') + encodeURIComponent(command) + '\' || :');

  if (program.parallel) {
    console.log('Execute: ' + chalk.yellow(command) + ' ' + chalk.gray('(' + process.cwd() + ')'));
    exec(command);
  } else {
    child.on('exit', function (code) {
      if (code !== 0 || program.childrenOnly) {
        return process.exit(code)
      }

      console.log('Execute: ' + chalk.yellow(command) + ' ' + chalk.gray('(' + process.cwd() + ')'));
      exec(command);
    });
  }
} catch (e) {
  console.error(chalk.red('Error: `git-deep` will not work a non-git directory - ' + process.cwd()));
  process.exit(1);
}
