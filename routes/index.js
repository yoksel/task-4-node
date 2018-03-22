const express = require('express');
const router = express.Router();
const { spawn, exec } = require('child_process');
const fs = require('fs');
let pageResponse = null;
const WebSocketServer = new require('ws');
var hbs = require("hbs");

var config = require('../config.js');
const dirPath = config.path;

let filesList = [];

const globalData = {
  branches: [],
  currentBranch: '',
  gitContext: '',
  files: [],
  file: '',
  logs: [],
  templates: {}
};

// ------------------------------

// подключенные клиенты
var clients = {};

// WebSocket-сервер на порту 8081
var webSocketServer = new WebSocketServer.Server({
  port: 8081
});
webSocketServer.on('connection', function(ws) {
  var id = Math.random();
  clients[id] = ws;
  console.log("новое соединение " + id);

  Promise.all(prepareTemplates())
    .then((response => {
      console.log('Templates is ready');

      ws.on('message', function(message) {
        console.log('\nполучено сообщение ');
        const queriesObj = parseQueries(message);

        // If file
        if (queriesObj['file']) {
          getFileContentByHash(queriesObj)
            .then(response => {
              resultData = fillTemplate('file_viewer', {file: response});
              const result = {
                command: 'file',
                data: resultData
              };

              for (var key in clients) {
                clients[key].send(JSON.stringify(result));
              }
            })
            .catch(error => {
              console.log(`\nError in getFileContentByHash(): ${error}`);
            });
        }
        // If logs
        else if (queriesObj['logs']) {
          getLogs()
          .then(response => {
            const commitsData = fillTemplate('logser', {logs: response});

            const result = {
              command: 'logs',
              data: commitsData
            };

            for (var key in clients) {
              clients[key].send(JSON.stringify(result));
            }
          })
          .catch(error => {
            console.log(`\nPromises failed in execGitCmd(): ${error}`);
          });
        }
        // If branch
        else if (queriesObj['branch']) {
          globalData.currentBranch = queriesObj['branch'];
          globalData.gitContext = globalData.currentBranch;

          if (queriesObj.commit && queriesObj.commit !== '') {
            globalData.gitContext = queriesObj.commit;
          }

          Promise.all([getBranches(), getFilesTree()])
            .then(([branchesList, filesList]) => {
              const branches = fillTemplate('branches', {branches: branchesList})
              const files = fillTemplate('files', {files: filesList})
              const result = {
                command: 'branch',
                data: {
                  branches: branches,
                  files: files
                }
              };

              console.log(queriesObj);

              for (var key in clients) {
                clients[key].send(JSON.stringify(result));
              }

            })
            .catch(error => {
              console.log(`\nPromises failed in execGitCmd(): ${error}`);
            });
        }
      });
    }));

  ws.on('close', function() {
    console.log('соединение закрыто ' + id);
    delete clients[id];
  });

});

// ------------------------------

function parseQueries(message) {
  let queries = message.split('&')
  queries = queries.reduce((obj, query) => {
    const [command, value] = query.split('=');
    obj[ command ] = value;
    return obj;
  }, {});

  return queries;
}

// ------------------------------

function handleRequest (req, res) {

  pageResponse = res;
  const query = req.query;
  globalData.file = '';

  if (Object.keys(req.query).length > 0 ) {
    console.log('\n=== req.query: \n', req.query);
    console.log('-------------------');

    if (query.file) {
      getFileContentByHash(req.query)
        .then(response => {
          globalData.file = response;

          execCommands();
        })
        .catch(error => {
          console.log(`\nPromises failed in getFileContentByHash(): ${error}`);
        });
    }

    else if (query.branch && query.branch !== '') {
      globalData.currentBranch = query.branch;
      globalData.gitContext = globalData.currentBranch;

      if (query.commit && query.commit !== '') {
        globalData.gitContext = query.commit;
      }

      execCommands();
    }

    else {
      execCommands();
    }
    return;
  }

  console.log('hello');

  execCommands();
}

// ------------------------------

function execCommands() {
  const promisesList = [
    getBranches(),
    getLogs(),
    getFilesTree()
  ];

  Promise.all(promisesList)
    .then(([branches, logs, files]) => {
      globalData.branches = branches;
      globalData.files = files;

      globalData.branches.forEach(branch => {
        if (branch.class) {
          branch.logs = logs
        }
      });

      renderPage();
    })
    .catch(error => {
      console.log(`\nPromises failed in execCommands(): ${error}`);
      renderPage();
    });
}

// ------------------------------

function execGitCmd(params) {
  const options = {
    cwd: params.cwd,
    maxBuffer: 1024 * 2000
  };

  let promise = new Promise((resolve, reject) => {
    exec(params.command, options, (error, stdout, stderr) => {

      if(error) {
        reject(`Error ${error}`);
      }
      if(stderr) {
        reject(stderr);
      }

      resolve(stdout);
    })
  });

  return promise;
}

// ------------------------------

function getLogs() {
  const logsPromise = new Promise((resolve, reject) => {

    execGitCmd({
      command: `git log ${globalData.currentBranch} --pretty=format:"%h|%an|%ae|%ar|%s"`,
      cwd: dirPath
    })
    .then(response => {
      let commitsList = response.split('\n');



      commitsList = commitsList.map(commit => {
        let commitClass = '';
        const [hash, author, email, time, title] = commit.split('|');

        if (hash.indexOf(globalData.gitContext) > -1) {
          commitClass = 'current';
        }
        const result = {
          hash: hash,
          branch: globalData.currentBranch,
          author: author,
          email: email,
          time: time,
          title: title,
          class: commitClass
        };

        return result;
      });

      // console.log(commitsList);
      resolve(commitsList);
    })
    .catch(error => {
      console.log(`\nPromises failed in getLogs(): ${error}`);
      reject(error);
    });
  });
  return logsPromise;
}

// ------------------------------

function getFilesTree() {
  const context = globalData.gitContext || 'HEAD';

  console.log('=== getFilesTree');
  console.log(globalData);

  const filesPromise = new Promise((resolve, reject) => {

    execGitCmd({
      command: `git ls-tree -r ${context}`,
      cwd: dirPath
    })
      .then(response => {
        const filesList = response.split('\n');
        const fileListTree = [];

        let parent = '';

        filesList.forEach(fileDataSrc => {
          if (fileDataSrc) {
            const [fileData, filePath] = fileDataSrc.split('\t');
            const fileDataArr = fileData.split(' ');
            const fileHash = fileDataArr[2];
            const filePathArr = filePath.split('/');
            const fileName = filePathArr.splice(filePathArr.length - 1, 1)[0];
            const prefix = filePathArr;

            fileListTree.push({
              path: filePath,
              hash: fileHash,
              name: fileName,
              prefix: prefix.join('/')
            });
          }
        });

        resolve(fileListTree);
      })
      .catch(error => {
        console.log(`\nPromises failed in getFilesTree(): ${error}`);
        reject(error);
      });
  });

  return filesPromise;
}

// ------------------------------

// Get all branches list
function getBranches() {
  const branchesPromis = new Promise((resolve, reject) => {

    execGitCmd({
      command: 'git branch',
      cwd: dirPath
    })
      .then(response => {
        let dataList = response.split('\n').filter(item => {
          if (item) {
            return item;
          }
        });

        dataList = dataList.map(item => {
          const strParts = item.split(' ');
          const name = strParts[strParts.length - 1];
          let branchClass = '';

          if(name === globalData.currentBranch) {
            branchClass = 'current';
          }
          else if (!globalData.currentBranch && item.indexOf('*') > -1) {
            branchClass = 'current';
            globalData.currentBranch = name;
            globalData.gitContext = globalData.currentBranch;
          }

          return {
            name: name,
            class:branchClass
          };
        });

        resolve(dataList);
      })
      .catch(error => {
        console.log(`\nPromises failed in getLogs(): ${error}`);
        reject(error);
      })
  });

  return branchesPromis;
}

// ------------------------------

function getFileContentByHash(queriesObj) {
  console.log('=== GETFILECONTENTBYHASH');
  const hash = queriesObj.hash;
  const filePath = queriesObj.file;
  const fullFilePath = `${config.path}/${filePath}`;

  console.log('\nqueriesObj');
  console.log(queriesObj);

  console.log(globalData);

  const filePromise = new Promise((resolve, reject) => {
    const checkNoSupported = filePath.toLowerCase().match(/mp3|mp4|ogg|ico$/);
    const checkIfImage = filePath.toLowerCase().match(/png|jpg|jpeg|gif|webp/);
    let isImg = false;
    let command = `git show ${globalData.gitContext}:${filePath}`;
    let ext = null;

    if (checkNoSupported !== null) {
      result = 'Невозможно отобразить содержимое';
      const file = {
          path: filePath,
          fullPath: fullFilePath,
          content: result,
          isImg: isImg
        };

      // Leave without reading file
      resolve(file);
    }
    else if (checkIfImage !== null) {
      console.log('IMAGE');
      isImg = true;
      let ext = checkIfImage[0];
      command += ' | base64';
    }

    const contentPromise = execGitCmd({
      command: command,
      cwd: dirPath
      });

    contentPromise
      .then((content) => {
        result = content;

        if (isImg) {
          result = `data:image/${ext};base64,${content}`;
        }

        const file = {
          path: filePath,
          fullPath: fullFilePath,
          content: result,
          isImg: isImg
        };

        resolve(file);
      })
      .catch(error => {
        console.log(`\nPromises failed in getFileContentByHash(): ${error}`);
      });
  });

  return filePromise;
}


// ------------------------------

function getFileContentByPath(filePath) {
  const filePromise = new Promise((resolve, reject) => {
    const fullFilePath = `${config.path}/${filePath}`;
    let isImg = false;

    const checkNoSupported = filePath.toLowerCase().match(/mp3|mp4|ogg|ico/);
    if (checkNoSupported !== null) {
      result = 'Невозможно отобразить содержимое';

      const file = {
        path: filePath,
        fullPath: fullFilePath,
        content: result,
        isImg: isImg
      };

      resolve(file);
    }

    fs.readFile(fullFilePath, (err, data) => {
      if (err) {
        reject(err);
      }

      let result = data.toString();
      const checkIfImage = filePath.toLowerCase().match(/png|jpg|jpeg|gif|webp/);

      if (checkIfImage !== null) {
        isImg = true;
        const ext = checkIfImage[0];
        result = `data:image/${ext};base64,${data.toString('base64')}`;
      }

      const file = {
        path: filePath,
        fullPath: fullFilePath,
        content: result,
        isImg: isImg
      };

      resolve(file);
    });
  });

  return filePromise;
}

// ------------------------------

function prepareTemplates() {
  const tmplList = ['branches', 'files', 'file_viewer', 'logs'];
  const tmplPromisesList = tmplList.map(tmplName => {
    const tmplPromise = new Promise((resolve, reject) => {
      const templatePath = `views/partials/${tmplName}.hbs`;

      fs.readFile(templatePath, (err, data) => {
        if (err) {
          reject(err);
        }

        var template = hbs.handlebars.compile(data.toString());

        globalData.templates[tmplName] = template;
        resolve();
      });
    });

    return tmplPromise;
  });

  return tmplPromisesList;
}

// ------------------------------

function fillTemplate(templateName, data) {
  console.log(globalData.templates);
  const template = globalData.templates[templateName];
  console.log('template');
  console.log(template);
  return template(data);
}

// ------------------------------

function renderPage() {
  console.log('\n====== renderPage ======');

  pageResponse.render('index', {
    title: 'GitFace',
    config: config,
    branches: globalData.branches,
    files: globalData.files,
    file: globalData.file
  });
}

// ------------------------------

module.exports.index = handleRequest;
