'use strict';
var fs = require('fs');
var path = require('path');
var dox = require('dox');
var _ = require('lodash');
var commentParser = require('./comment-parser');
var util = require('./util');

/**
 * Runs jsdoctests in some file, and reports the results to the command-line.
 */

exports.run = function jsdoctest$run(filename) {
  require('should');
  var content = fs.readFileSync(filename, 'utf8');

  var jsdocTests = exports.getJsdoctests(content);
  content += _.map(jsdocTests, exports.toJsdocRegister).join('');

  global.__registerTest = exports.registerTest;
  module._compile(util.stripBOM(content), filename);
  delete global.__registerTest;

  return exports.runRegistered();
};

/**
 * Parses "jsdoctests" out of a file's contents and returns them. These are
 * `dox` outputted `comment` nodes, overloaded with an `examples` field which
 * adds `testCase` and `expectedResult` pairs to them.
 */

exports.getJsdoctests = function jsdoctest$getJsdoctests(content) {
  var functionComments = _.filter(dox.parseComments(content), function(c) {
    return c.ctx && (c.ctx.type === 'method' || c.ctx.type === 'function');
  });

  var comments = _.map(functionComments, function(comment) {
    var exampleNodes = _.where(comment.tags, { type: 'example' });
    var examples = _.flatten(_.map(exampleNodes, function(exampleNode) {
      return commentParser.run(exampleNode.string);
    }));

    comment.examples = examples;
    return examples.length ? comment : undefined;
  });

  return _.compact(comments);
};

var tests = [];

/**
 * Registers a test case to be run by the runner
 */

exports.registerTest = function jsdoctest$registerTest(id, fn) {
  tests.push({ 
    id: id,
    fn: fn,
  });
};

/**
 * Runs test cases accumulated in the `tests` array.
 */

exports.runRegistered = function() {
  var failed = false;

  _.each(tests, function(test) {
    console.log(test.id);
    try {
      test.fn();
    } catch(err) {
      console.error(err.toString());
      failed = true;
    }
  });

  return failed;
};

/**
 * Compiles a jsdoc comment `dox` comment overloaded with the `examples` node to
 * the internal test suite registering code.
 */

exports.toJsdocRegister = function jsdoctest$toJsdocRegister(comment) {
  var baseId = comment.ctx.name + ' - ';
  var compiled = _.map(comment.examples, function(example) {
    var id = baseId + example.testCase + ' => ' + example.expectedResult;
    var fn = 'function() {' +
      example.testCase + '.should.equal(' + example.expectedResult + ');' +
    '}';
    return '__registerTest(\'' + id + '\', ' + fn + ');';
  }).join('');

  return '\n' + compiled;
};

// Mocha `--require` support:
if(path.basename(process.argv[1]) === '_mocha') {
  var mocha = require('./mocha');
  mocha.toggleDoctestInjection();
}
