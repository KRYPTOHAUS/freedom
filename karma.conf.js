/*jslint node:true */
module.exports = function (config) {
  'use strict';
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine'],
    
    // web server port
    port: 9876,
    proxies:  {'/': 'http://localhost:8000/'},

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['Chrome', 'Firefox'],

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false,

    // Set timeouts to avoid DISCONNECTED messages
    captureTimeout: 180000,  // default 60000
    browserDisconnectTimeout: 36000, // default 2000
    browserDisconnectTolerance: 1, // default 0
    browserNoActivityTimeout: 180000, //default 10000
    
    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress', 'story', 'html', 'junit', 'coverage', 'saucelabs', 'unicorn'],
    
    // Coverage report options
    coverageReporter: {
      reporters: [ {
        type: 'lcovonly',
        dir: 'build/coverage/',
        file: 'lcov.info'
      }, {
        type: 'cobertura',
        dir: 'shippable/codecoverage',
        file: 'test-coverage.xml'
      } ]
    },

    // JUnit report options (for Shippable)
    junitReporter: { outputFile: 'shippable/testresults/test-results.xml', suite: '' },

    // SauceLabs config that gets overwritten in Gruntfile.js
    sauceLabs: {},
    customLaunchers: {}
  });
};
