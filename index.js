#!/usr/bin/env node

var program = require('commander');
var spawn = require('child_process').spawn;
var execSync = require('child_process').execSync;
var chalk = require('chalk');
var path = require('path');

program
  .allowUnknownOption(true)
  .version(require('./package.json').version)
  .usage('[options] <command...>')
  .option('-c, --childrenOnly', 'Run children only')
  .option('-p, --parallel', 'Run each child parallel')
  .parse(process.argv);

function exec(command, cwd) {
  if (!~process.platform.indexOf('win')) {
    return spawn('cmd', ['/s', '/c', command], {
      stdio: ['ignore', process.stdout, process.stderr],
      cwd: cwd || process.cwd()
    })
  } else {
    return spawn('/bin/sh', ['-c', command], {
      stdio: ['ignore', process.stdout, process.stderr],
      cwd: cwd || process.cwd()
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

  var childCommand = __filename + (program.parallel ? ' -p ' : ' ') + encodeURIComponent(command);
  if (program.parallel) {
    String(execSync('git submodule status'))
      .trim()
      .split('\n')
      .forEach(function (a) {
        var parts = a.trim().split(' ');
        if (parts.length === 3) {
          var submodulepath = path.join(process.cwd(), parts[1]);
          exec(childCommand, submodulepath);
        }
      });

    console.log('Execute: ' + chalk.yellow(command) + ' ' + chalk.gray('(' + process.cwd() + ')'));
    exec(command);
  } else {
    var child = exec('git submodule foreach \'' + childCommand + '\' || :');

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
