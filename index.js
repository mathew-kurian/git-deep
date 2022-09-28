#!/usr/bin/env node

var program = require('commander');
var spawn = require('child_process').spawn;
var execSync = require('child_process').execSync;
var chalk = require('chalk');
var fs = require('fs');
var path = require('path');
var async = require('async');
var escape = require('escape-quotes');

program
  .allowUnknownOption(true)
  .version(require('./package.json').version)
  .usage('[options] <command...>')
  .option('-c, --childrenOnly', 'Run children only')
  .option('-p, --parallel', 'Run each child parallel')
  .parse(process.argv);

function exec(command, cwd) {
  if (~process.platform.indexOf('win')) {
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

try {
  rawArgs = JSON.parse(decodeURIComponent(rawArgs)) || [];
} catch (e) {
  // ignore
}

rawArgs = rawArgs.map(function (arg) {
  if (arg.indexOf(' ') > -1) {
    return '\'' + escape(arg) + '\'';
  }
  return arg;
});

if (rawArgs.length === 1 && rawArgs[0].charAt(0) === '\'') {
  rawArgs[0] = rawArgs[0].substring(1, rawArgs[0].length - 1);
}

var command = rawArgs.join(' ');

try {
  execSync('git status');

  var submodulePaths =
    String(execSync('git submodule foreach \'pwd\''))
      .trim()
      .split('\n')
      .filter(function (a) {
        if (fs.existsSync(a)) {
          return true;
        }
      });

  var childCommand = __filename + (program.parallel ? ' -p ' : ' ') + encodeURIComponent(JSON.stringify(rawArgs));
  if (program.parallel) {
    for (var i = 0; i < submodulePaths.length; i++) {
      exec(childCommand, submodulePaths[i]);
    }

    if (program.childrenOnly) {
      return;
    }

    console.log('Execute: ' + chalk.yellow(command) + ' ' + chalk.gray('(' + process.cwd() + ')'));
    exec(command);
  } else {
    async.each(submodulePaths, function (path, callback) {
      var child = exec(childCommand, path);
      child.on('exit', callback);
    }, function (code) {
      if (program.childrenOnly) {
        process.exit(code);
        return;
      }

      console.log('Execute: ' + chalk.yellow(command) + ' ' + chalk.gray('(' + process.cwd() + ')'));
      exec(command);
    });
  }
} catch (e) {
  console.error(chalk.red('Error: `git-deep` will not work a non-git directory - ' + process.cwd()));
  process.exit(1);
}
