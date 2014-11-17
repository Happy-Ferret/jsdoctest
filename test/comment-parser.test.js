'use strict'; /* global describe, it */
require('should');
var commentParser = require('../lib/comment-parser');

describe('comment-parser', function() {
  describe('.parseComments(input)', function() {
    it('differentiates code blocks from comments', function() {
      commentParser.parseComments(
        'function something() {'                  +
        '/* multi-line comment here\n'            +
        '                          */\n'          +
        '}\n'                                     +
        '\n'                                      +
        'something() // single-line comment here'
      ).should.eql([
        { type: 'code', string: 'function something() {', },
        { type: 'comment', string: 'multi-line comment here', },
        { type: 'code', string: '}\n\nsomething()', },
        { type: 'comment', string: 'single-line comment here', },
      ]);
    });
  });

  describe('.parseExamples(parsedComments)', function() {
    it('extracts examples out of parsed comments', function() {
      commentParser.parseExamples(commentParser.parseComments(
        'a()\n' +
        '// ignored\n'  +
        'b()\n' +
        '// => 20'
      )).should.eql([
        { testCase: 'b()', expectedResult: '20', },
      ]);
    });
  });
});
