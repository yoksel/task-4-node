const express = require('express');
const router = express.Router();
const { spawn, exec } = require('child_process');
const fs = require('fs');
let pageResponse = null;
const WebSocketServer = new require('ws');
var hbs = require("hbs");

var config = require('../config.js');
const dirPath = config.path;
const hashLength = 10;

const globalData = {
  branches: [],
  currentBranch: '',
  gitContext: '',
  files: [],
  file: '',
  templates: {},
  filesTreeContext: {}
};

// ------------------------------

var clients = {};

// WebSocket-server on port 8081
var webSocketServer = new WebSocketServer.Server({
  port: 8081
});
webSocketServer.on('connection', function(ws) {
  var id = Math.random();
  clients[id] = ws;

  Promise.all(prepareTemplates())
    .then((response => {

      ws.on('message', function(message) {
        console.log('\nMessage resived ');
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
              console.log(`\nError in prepareTemplates(): ${error}`);
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
            console.log(`\nPromises failed in getLogs(): ${error}`);
          });
        }
        // If branch
        else if (queriesObj['branch']) {
          globalData.currentBranch = queriesObj['branch'];
          globalData.gitContext = globalData.currentBranch;

          if (queriesObj.commit && queriesObj.commit !== '') {
            globalData.gitContext = queriesObj.commit;
          }

          Promise.all([getBranches(), getLogs(), getFilesTree()])
            .then(([branchesList, logs, filesList]) => {
              branchesList.forEach(branch => {
                if (branch.class) {
                  branch.logs = logs
                }
              });
              const branches = fillTemplate('branches', {branches: branchesList})
              const files = fillTemplate('files', {files: filesList})
              const result = {
                command: 'branch',
                data: {
                  branches: branches,
                  files: files
                }
              };

              for (var key in clients) {
                clients[key].send(JSON.stringify(result));
              }

            })
            .catch(error => {
              console.log(`\nPromises failed in get branches data: ${error}`);
            });
        }
      });
    }));

  ws.on('close', function() {
    console.log('\nConnection closed ' + id);
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
  globalData.filesTreeContext = {};
  globalData.gitContext = '';

  if (Object.keys(req.query).length > 0 ) {
    console.log('\n=== req.query: \n', req.query);
    console.log('-------------------');

    if (query.branch && query.branch !== '') {
      globalData.currentBranch = query.branch;
      let context = query.branch;

      if (!globalData.gitContext) {
        globalData.gitContext = globalData.currentBranch;
      }
      if (query.commit && query.commit !== '') {
        globalData.gitContext = query.commit;
        let context = query.commit;
      }

      // Get file
      if (query.file) {
        getFileContentByHash(req.query)
          .then(response => {
            globalData.file = response;

            const pathArr = query.file.split('/');
            const folder = pathArr.slice(0, pathArr.length - 1).join('/');
            globalData.filesTreeContext.currentType = 'folder';
            globalData.filesTreeContext.folder = folder;

            execGitCmd({
              command: `git ls-tree --abbrev=${hashLength} ${globalData.currentBranch} ${folder}`,
              cwd: dirPath
            })
            .then(response => {
              const dataSrc = response.split('\t');
              const hash = dataSrc[0].split(' ')[2];
              globalData.filesTreeContext.currentHash = hash;
              execCommands();
            })
            .catch(error => {
              console.log(`\nPromises failed in execGitCmd() with ls-tree: ${error}`);
              execCommands();
            });
          })
          .catch(error => {
            console.log(`\nPromises failed in getFileContentByHash(): ${error}`);
          });
      }
      // Get folder
      else if (query.folder && query.folder != '') {
        globalData.filesTreeContext.currentType = 'folder';
        globalData.filesTreeContext.folder = query.folder;

        execGitCmd({
          command: `git ls-tree --abbrev=${hashLength} ${globalData.currentBranch} ${query.folder}`,
          cwd: dirPath
        })
        .then(response => {
          const dataSrc = response.split('\t');
          const hash = dataSrc[0].split(' ')[2];
          globalData.filesTreeContext.currentHash = hash;
          execCommands();
        })
        .catch(error => {
          console.log(`\nPromises failed in handleRequest(): ${error}`);
          execCommands();
        });
      }
      else {
        execCommands();
      }
    }

    return;
  }

  execCommands();
}

// ------------------------------

function execCommands() {
  const promisesList = [
    getBranches(),
    getLogs()
  ];

  Promise.all(promisesList)
    .then(([branches, logs]) => {
      globalData.branches = branches;
      globalData.branches.forEach(branch => {
        if (branch.class) {
          branch.logs = logs
        }
      });

      getFilesTree()
        .then(files => {
          globalData.files = files;
          renderPage();
        })
        .catch(error => {
          console.log(`\nPromises failed in getFilesTree(): ${error}`);
          renderPage();
        });
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

        if (globalData.gitContext && hash.indexOf(globalData.gitContext) > -1) {
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
  let context = 'HEAD';
  if (globalData.filesTreeContext.currentHash && globalData.filesTreeContext.currentHash !== '') {
    context = globalData.filesTreeContext.currentHash;
  }
  else if (globalData.filesTreeContext.gitContext && globalData.filesTreeContext.gitContext !== '') {
    context = globalData.filesTreeContext.gitContext;
  }

  const filesPromise = new Promise((resolve, reject) => {
    const treeContext = globalData.filesTreeContext;
    const treePromise = execGitCmd({
      command: `git ls-tree --abbrev=${hashLength} ${context}`, // -r
      cwd: dirPath
    });

    treePromise
      .then(tree => {
        const blobsListSrc = tree.split('\n')
          .filter(item => {
            if(item) {
              return item;
            }
          });

        const blobsList = [];
        let nav = {};
        const currentFolder = treeContext.folder;

        if (currentFolder) {
          const pathParts = currentFolder.split('/');
          const navItems = pathParts.slice(pathParts.length - 2);

          if (pathParts.length > 1) {
            nav.parent = {
              name: navItems[0],
              url: `folder=${navItems[0]}&branch=${globalData.currentBranch}`,
              type: 'folder'
            };
          }
          else {
            nav.parent = {
              name: '..',
              url: `branch=${globalData.currentBranch}`,
              type: 'branch'
            };
          }

          nav.current = {
            name: navItems[navItems.length - 1],
            hash: treeContext.hash,
            type: 'folder'
          };
        }

        blobsListSrc.forEach(blobDataSrc => {
          if (blobDataSrc) {
            let [blobData, blobPath] = blobDataSrc.split('\t');
            const blobDataArr = blobData.split(' ');
            const blobPathArr = blobPath.split('/');
            let blobName = blobPathArr.splice(blobPathArr.length - 1, 1)[0];
            let prefix = '— ';
            const blobHash = blobDataArr[2];
            let blobType = blobDataArr[1];

            if (currentFolder) {
              blobPath = [currentFolder, blobPath].join('/');
            }

            if (blobType === 'blob') {
              blobType = 'file';
            }
            else if (blobType === 'tree' || blobType === 'commit') {
              blobType = 'folder';
              blobName += '/';
            }

            let urlParts = [
              `${blobType}=${blobPath}`,
              `hash=${blobHash}`
            ];
            let currentData = {
              folder: treeContext.folder,
              hash: treeContext.currentHash,
              type: 'folder'
            };

            if (!currentData.hash) {
              currentData.folder = globalData.currentBranch;
              currentData.hash = globalData.gitContext;
              currentData.type = 'commit';
            }

            if (currentData.hash){
              const currentUrlParams = [
                `branch=${globalData.currentBranch}`
              ];
              urlParts = urlParts.concat(currentUrlParams);
            }

            blobsList.push({
              type: blobType,
              name: blobName,
              prefix: prefix,
              url: urlParts.join('&')
            });
          }
        });

        blobsList.sort(sortBlobsByType);

        resolve({
          nav: nav,
          list: blobsList,
        });
      })
      .catch(error => {
        console.log(`\nPromises failed in getFilesTree(): ${error}`);
        reject(error);
      });
  });

  return filesPromise;
}

// ------------------------------

function sortBlobsByType(a, b) {
  if (a.type === 'folder') {
    return -1;
  }
  return 1;
}

// ------------------------------

function getBranches() {
  const branchesPromis = new Promise((resolve, reject) => {

    execGitCmd({
      command: 'git branch -v',
      cwd: dirPath
    })
      .then(response => {
        let dataList = response.split('\n').filter(item => {
            if(item) {
              return item;
            }
        });

        dataList = dataList.map(item => {
          let currentBranchInTree = false;
          if (item.indexOf('*') > -1) {
            currentBranchInTree = true
            item = item.split('*')[1];
          }
          let strParts = item.split(' ');

          strParts = strParts.filter(item => {
            if (item) {
              return item;
            }
          });

          const [name, hash] = strParts;
          let branchClass = '';

          if(name === globalData.currentBranch) {
            branchClass = 'current';
          }
          else if (!globalData.currentBranch && currentBranchInTree) {
            branchClass = 'current';
            globalData.currentBranch = name;

            if (!globalData.gitContext) {
              globalData.gitContext = hash;
            }
          }

          return {
            name: name,
            hash: hash,
            class:branchClass
          };
        });

        resolve(dataList);
      })
      .catch(error => {
        console.log(`\nPromises failed in getBranches(): ${error}`);
        reject(error);
      })
  });

  return branchesPromis;
}

// ------------------------------

function getFileContentByHash(queriesObj) {
  const hash = queriesObj.hash;
  const filePath = queriesObj.file;
  const fullFilePath = `${config.path}/${filePath}`;

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
  const template = globalData.templates[templateName];
  return template(data);
}

// ------------------------------

function renderPage() {
  pageResponse.render('index', {
    title: 'GitFace',
    config: config,
    configData: JSON.stringify(config),
    branches: globalData.branches,
    files: globalData.files.list,
    filesNav: globalData.files.nav,
    file: globalData.file,
  });
}

// ------------------------------

module.exports.index = handleRequest;
