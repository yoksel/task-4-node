module.exports = {
  baseUrl: 'http://localhost:3000',
  gridUrl: 'http://0.0.0.0:4444/wd/hub',

  browsers: {
    chrome: {
      desiredCapabilities: {
        browserName: 'chrome',
        waitTimeout: 10000,
        debug: true,
        workers: 5,
      }
    },
    firefox: {
      desiredCapabilities: {
        browserName: 'firefox',
        waitTimeout: 10000,
        debug: true,
        workers: 5,
      }
    }
  },
  plugins: {
    'html-reporter/hermione': {
      path: 'hermione-html-reporter'
    }
  }
};
