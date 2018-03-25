/* eslint new-cap: [0, {capIsNewExceptions: ["S"]}] */
const express = require('express');
const router = express.Router();
const {spawn, exec} = require('child_process');
const fs = require('fs');
let pageResponse = null;
const WebSocketServer = new require('ws');
var hbs = require('hbs');

var config = require('../config.js');
const dirPath = config.path;
const hashLength = 10;

const globalData = {
  branches: [],
  currentBranch: '',
  commit: '',
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
webSocketServer.on('connection', function (ws) {
  var id = Math.random();
  clients[id] = ws;

  Promise.all(prepareTemplates())
    .then(response => {
      ws.on('message', function (message) {
        const queriesObj = parseQueries(message);
        clearContext();

        globalData.currentBranch = queriesObj.branch;
        globalData.gitContext = globalData.currentBranch;

        if (queriesObj.folder) {
          globalData.filesTreeContext.currentType = 'folder';
          globalData.filesTreeContext.folder = queriesObj.folder;
        }

        if (queriesObj.commit && queriesObj.commit !== '') {
          globalData.gitContext = queriesObj.commit;
          globalData.commit = queriesObj.commit;
        }

        // If file
        if (queriesObj.file) {
          getFileContentByHash(queriesObj)
            .then(file => {
              resultData = fillTemplate('file_viewer', {file: file});
              const result = {
                command: 'file',
                data: resultData
              };
              let key = null;

              sendResult(result);
            })
            .catch(error => {
              console.log(`\nError in getFileContentByHash():\n\t${error}`);
            });
        } else if (queriesObj.folder) {
          getHashFromUrl(queriesObj.folder)
            .then(hash => {
              globalData.filesTreeContext.currentHash = hash;
              globalData.filesTreeContext.currentType = 'folder';
              globalData.filesTreeContext.folder = queriesObj.folder;

              getFilesTree()
                .then(filesList => {
                  const files = fillTemplate('files', {
                    filesNav: filesList.nav,
                    files: filesList.list
                  });
                  let key;

                  const result = {
                    command: 'folder',
                    data: {
                      files: files
                    }
                  };

                  sendResult(result);
                })
                .catch(error => {
                  console.log(`\nPromises failed in socket in getFilesTree():\n\t${error}`);
                });
            })
            .catch(error => {
              console.log(`\nPromises failed in queriesObj.folder:\n\t${error}`);
            });
        } else if (queriesObj.branch) {
          Promise.all([getBranches(), getLogs(), getFilesTree()])
            .then(([branchesList, logs, filesList]) => {
              const result = getDataForBranches(branchesList, logs, filesList);

              sendResult(result);
            })
            .catch(error => {
              console.log(`\nPromises failed in get branches data:\n\t${error}`);
            });
        }
      });
    });

  ws.on('close', function () {
    console.log('\nConnection closed ' + id);
    delete clients[id];
  });
});

// ------------------------------

function getDataForBranches(branchesList, logs, filesList) {
  branchesList.forEach(branch => {
    if (branch.class) {
      branch.logs = logs;
    }
  });
  const branches = fillTemplate('branches', {branches: branchesList});
  let key;

  const files = fillTemplate('files', {
    filesNav: filesList.nav,
    files: filesList.list
  });

  const result = {
    command: 'branch',
    data: {
      branches: branches,
      files: files
    }
  };

  return result;
}

// ------------------------------

function getHashFromUrl(url) {
  const hashProm = new Promise((resolve, request) => {
    execGitCmd({
      command: `git ls-tree --abbrev=${hashLength} ${globalData.gitContext} ${url}`,
      cwd: dirPath
    })
      .then(urlSrc => {
        const dataSrc = urlSrc.split('\t');
        const hash = dataSrc[0].split(' ')[2];

        resolve(hash);
      })
      .catch(error => {
        console.log(`\nPromises failed in getHashFromUrl():\n\t${error}`);
        reject(error);
      });
  });

  return hashProm;
}

// ------------------------------

function sendResult(result) {
  for (key in clients) {
    clients[key].send(JSON.stringify(result));
  }
}

// ------------------------------

function parseQueries(message) {
  let queries = message.split('&');
  queries = queries.reduce((obj, query) => {
    const [command, value] = query.split('=');
    obj[ command ] = value;
    return obj;
  }, {});

  return queries;
}

// ------------------------------

function clearContext() {
  globalData.file = '';
  globalData.filesTreeContext = {};
  globalData.gitContext = '';
}

// ------------------------------

function handleRequest(req, res) {
  pageResponse = res;
  const query = req.query;
  clearContext();

  if (Object.keys(req.query).length > 0) {
    if (query.branch && query.branch !== '') {
      globalData.currentBranch = query.branch;
      let context = query.branch;

      if (!globalData.gitContext) {
        globalData.gitContext = globalData.currentBranch;
      }
      if (query.commit && query.commit !== '') {
        globalData.gitContext = query.commit;
        globalData.commit = query.commit;
        context = query.commit;
        globalData.filesTreeContext.currentHash = query.commit;
      }
      if (query.folder) {
        globalData.filesTreeContext.currentType = 'folder';
        globalData.filesTreeContext.folder = query.folder;
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

            getHashFromUrl(folder)
              .then(hash => {
                globalData.filesTreeContext.currentHash = hash;
                execCommands();
              })
              .catch(error => {
                console.log(`\nPromises failed in getHashFromUrl():\n\t${error}`);
                execCommands();
              });
          })
          .catch(error => {
            console.log(`\nPromises failed in getFileContentByHash():\n\t${error}`);
          });
      } else if (query.folder && query.folder !== '') {
        getHashFromUrl(query.folder)
          .then(hash => {
            globalData.filesTreeContext.currentHash = hash;

            execCommands();
          })
          .catch(error => {
            console.log(`\nPromises failed in getHashFromUrl():\n\t${error}`);
            execCommands();
          });
      } else {
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
          branch.logs = logs;
        }
      });

      getFilesTree()
        .then(files => {
          globalData.files = files;
          renderPage();
        })
        .catch(error => {
          console.log(`\nPromises failed in execCommands() in getFilesTree():\n\t${error}`);
          renderPage();
        });
    })
    .catch(error => {
      console.log(`\nPromises failed in execCommands():\n\t${error}`);
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
      if (error) {
        reject(`Error ${error}`);
      }
      if (stderr) {
        reject(stderr);
      }

      resolve(stdout);
    });
  });

  return promise;
}

// ------------------------------

function getLogs() {
  const logsPromise = new Promise((resolve, reject) => {
    execGitCmd({
      command: `git log --pretty=format:"%h|%an|%ae|%ar|%s" ${globalData.currentBranch}`,
      cwd: dirPath
    })
      .then(logsSrc => {
        let commitsList = parseLogsData(logsSrc);

        resolve(commitsList);
      })
      .catch(error => {
        console.log(`\nPromises failed in getLogs():\n\t${error}`);
        reject(error);
      });
  });
  return logsPromise;
}

// ------------------------------

function parseLogsData(logsSrc) {
  let commitsList = [];

  if (logsSrc) {
    commitsList = logsSrc.split('\n');
  }

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

  return commitsList;
}

// ------------------------------

function getFilesTree() {
  let context = 'HEAD';

  if (globalData.filesTreeContext.currentHash && globalData.filesTreeContext.currentHash !== '') {
    context = globalData.filesTreeContext.currentHash;
  } else if (globalData.gitContext && globalData.gitContext !== '') {
    context = globalData.gitContext;
  }

  const filesPromise = new Promise((resolve, reject) => {
    const treeContext = globalData.filesTreeContext;

    let currentFolder = '';
    if (treeContext && treeContext.folder) {
      currentFolder = treeContext.folder;
    }

    const treePromise = execGitCmd({
      command: `git ls-tree --abbrev=${hashLength} ${context}`,
      cwd: dirPath
    });

    treePromise
      .then(blobsDataSrc => {
        const nav = getFilesNav(currentFolder);
        const blobsList = parseBlobsList(blobsDataSrc, currentFolder);

        blobsList.sort(sortBlobsByType);

        resolve({
          nav: nav,
          list: blobsList
        });
      })
      .catch(error => {
        console.log(`\nPromises failed in getFilesTree():\n\t${error}`);
        reject(error);
      });
  });

  return filesPromise;
}

// ------------------------------

function getFilesNav(currentFolder) {
  const nav = {};
  const treeContext = globalData.filesTreeContext;

  if (currentFolder) {
    const pathParts = currentFolder.split('/');
    const navItems = pathParts.slice(pathParts.length - 2);
    let parentType = 'branch';
    let parentName = '..';

    const parentUrlParts = [
      `branch=${globalData.currentBranch}`
    ];

    if (pathParts.length > 1) {
      parentName = navItems[0];
      parentUrlParts.push(`folder=${navItems[0]}`);
      parentType = 'folder';
    }

    if (globalData.commit) {
      parentUrlParts.push(`commit=${globalData.commit}`);
    }

    nav.parent = {
      name: parentName,
      url: parentUrlParts.join('&'),
      type: parentType
    };

    nav.current = {
      name: navItems[navItems.length - 1],
      hash: treeContext.hash,
      type: 'folder'
    };
  }

  return nav;
}

// ------------------------------

function parseBlobsList(blobsDataSrc, currentFolder) {
  const blobsListSrc = blobsDataSrc.split('\n')
    .filter(item => {
      if (item) {
        return item;
      }
    });

  let blobsList = [];

  blobsListSrc.forEach(blobItemSrc => {
    if (blobItemSrc) {
      let [blobItem, blobPath] = blobItemSrc.split('\t');
      const blobItemArr = blobItem.split(' ');
      const blobPathArr = blobPath.split('/');
      let blobName = blobPathArr.splice(blobPathArr.length - 1, 1)[0];
      let prefix = '—&nbsp;';
      const blobHash = blobItemArr[2];
      let blobType = blobItemArr[1];

      if (currentFolder) {
        blobPath = [currentFolder, blobPath].join('/');
      }

      if (blobType === 'blob') {
        blobType = 'file';
      } else if (blobType === 'tree' || blobType === 'commit') {
        blobType = 'folder';
        blobName += '/';
      }

      let urlParts = [
        `${blobType}=${blobPath}`,
        `branch=${globalData.currentBranch}`
      ];

      if (globalData.commit) {
        urlParts.push(`commit=${globalData.commit}`);
      }

      blobsList.push({
        type: blobType,
        name: blobName,
        prefix: prefix,
        url: urlParts.join('&')
      });
    }
  });

  return blobsList;
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
        let dataList = parceBranchesData(response);

        resolve(dataList);
      })
      .catch(error => {
        console.log(`\nPromises failed in getBranches():\n\t${error}`);
        reject(error);
      });
  });

  return branchesPromis;
}

// ------------------------------

function parceBranchesData(data) {
  let dataList = data.split('\n').filter(item => {
    if (item) {
      return item;
    }
  });

  dataList = dataList.map(dataItem => {
    let currentBranchInTree = false;
    if (dataItem.indexOf('*') > -1) {
      currentBranchInTree = true;
      dataItem = dataItem.split('*')[1];
    }
    let strParts = dataItem.split(' ');

    strParts = strParts.filter(part => {
      if (part) {
        return part;
      }
    });

    const [name, hash] = strParts;
    let branchClass = '';

    if (name === globalData.currentBranch) {
      branchClass = 'current';
    } else if (!globalData.currentBranch && currentBranchInTree) {
      branchClass = 'current';
      globalData.currentBranch = name;

      if (!globalData.gitContext) {
        globalData.gitContext = hash;
      }
    }

    return {
      name: name,
      hash: hash,
      class: branchClass
    };
  });

  return dataList;
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
    } else if (checkIfImage !== null) {
      isImg = true;
      ext = checkIfImage[0];
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
        console.log(`\nPromises failed in getFileContentByHash():\n\t${error}`);
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
        var template = hbs.handlebars.compile(data.toString());

        if (err) {
          reject(err);
        }

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
    file: globalData.file
  });
}

// ------------------------------

module.exports = {
  index: handleRequest,
  getDataForBranches: getDataForBranches,
  getHashFromUrl: getHashFromUrl,
  sendResult: sendResult,
  parseQueries: parseQueries,
  clearContext: clearContext,
  execCommands: execCommands,
  execGitCmd: execGitCmd,
  getLogs: getLogs,
  parseLogsData: parseLogsData,
  getFilesTree: getFilesTree,
  getFilesNav: getFilesNav,
  parseBlobsList: parseBlobsList,
  sortBlobsByType: sortBlobsByType,
  getBranches: getBranches,
  parceBranchesData: parceBranchesData,
  getFileContentByHash: getFileContentByHash,
  prepareTemplates: prepareTemplates,
  fillTemplate: fillTemplate,
  renderPage: renderPage,
};
