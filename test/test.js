const assert = require('assert');
const {expect} = require('chai');
const index = require('../routes/index');
const git = require('./gitStab');

describe('Разбор строки запроса из сокета', function () {
  it('parseQueries() разбирает строку запроса в объект', function () {
    const query = '?folder=css&branch=add-menu&commit=8e348c9';
    const parsedQuery = index.parseQueries(query);
    const waitFor = {
      '?folder': 'css',
      branch: 'add-menu',
      commit: '8e348c9'
    };
    expect(parsedQuery).to.deep.equal(waitFor);
  });
});

describe('Разбор гитовых логов', function () {
  it('parseLogsData() возвращает список объектов', function () {
    const logsSrc = git.exec('git log');
    const commitsList = index.parseLogsData(logsSrc);
    const waitFor = [
      {
        hash: 'be1bf29',
        branch: '',
        author: 'yokselzok',
        email: 'yokselzok@gmail.com',
        time: '15 hours ago',
        title: 'Change header level in readme',
        class: ''
      },
      {
        hash: '96392ff',
        branch: '',
        author: 'yokselzok',
        email: 'yokselzok@gmail.com',
        time: '15 hours ago',
        title: 'Add styles',
        class: ''
      }
    ];

    expect(commitsList).to.deep.equal(waitFor);
  });
});

describe('Разбор списка файлов', function () {
  it('parseBlobsList() возвращает список объектов', function () {
    const currentFolder = 'img/svg';
    const blobsListSrc = '100644 blob ed40a2062b\tcar.jpeg\n' +
                         '100644 blob 227b78f167\tsunset.jpeg\n' +
                         '040000 tree cb50942d0c\tsvg';
    const blobsList = index.parseBlobsList(blobsListSrc, currentFolder);

    const waitFor = [
      {
        type: 'file',
        name: 'car.jpeg',
        prefix: '—&nbsp;',
        url: 'file=img/svg/car.jpeg&branch='
      },
      {
        type: 'file',
        name: 'sunset.jpeg',
        prefix: '—&nbsp;',
        url: 'file=img/svg/sunset.jpeg&branch='
      },
      {
        type: 'folder',
        name: 'svg/',
        prefix: '—&nbsp;',
        url: 'folder=img/svg/svg&branch='
      }
    ];

    expect(blobsList).to.deep.equal(waitFor);
  });
});

describe('Сортировка содержимого директории по типу', function () {
  it('sortBlobsByType() возвращает сортированный список', function () {
    const blobListBefore = [
      {
        type: 'file',
        name: 'README.md',
        prefix: '—&nbsp;',
        url: 'file=README.md&branch=pictures'
      },
      {
        type: 'folder',
        name: 'css/',
        prefix: '—&nbsp;',
        url: 'folder=css&branch=pictures'
      },
    ];

    const blobListAfter = blobListBefore.slice();
    blobListAfter.sort(index.sortBlobsByType);

    const waitFor = [
      {
        type: 'folder',
        name: 'css/',
        prefix: '—&nbsp;',
        url: 'folder=css&branch=pictures'
      },
      {
        type: 'file',
        name: 'README.md',
        prefix: '—&nbsp;',
        url: 'file=README.md&branch=pictures'
      }
    ];

    expect(blobListAfter).to.deep.equal(waitFor);
  });
});

describe('Разбор гитовых веток', function () {
  it('parceBranchesData() возвращает список объектов', function () {
    const branches = git.exec('git branch');
    let branchesList = index.parceBranchesData(branches);
    const waitFor = [
      {
        name: 'add-menu',
        hash: '8e348c9',
        class: ''
      },
      {
        name: 'master',
        hash: 'be1bf29',
        class: 'current'
      },
      {
        name: 'pictures',
        hash: '79e141f',
        class: ''
      }
    ];

    expect(branchesList).to.deep.equal(waitFor);
  });
});


describe('Получение навигации по дереву файлов', function () {
  it('getFilesNav() возвращает объект с навигацией', function () {

    const nav = index.getFilesNav('img');
    const waitFor = {
      parent: {
        name: '..',
        url: 'branch=master',
        type: 'branch'
      },
      current: {
        name: 'img',
        hash: undefined,
        type: 'folder'
      }
    };

    expect(nav).to.deep.equal(waitFor);
  });
});
