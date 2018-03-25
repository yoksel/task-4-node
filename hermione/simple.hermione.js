const {assert} = require('chai');

// ------------------------------

describe('1.3. title страницы соответствует ожидаемому', () => {
  it('Должен быть GitFace', function () {
    return this.browser
      .url('/')
      .getText('h1')
      .then((title) => {
        assert.equal(title, 'GitFace');
      });
  });
});

// ------------------------------

describe('3.1. Отображение ветки по умолчанию', () => {
  it('3.1.2. Проверить, что из списка всех веток отображается ветка по умолчанию', function () {
    return this.browser
      .url('/')
      // 3.1.2. Проверить, что из списка всех веток отображается ветка по умолчанию
      .getText('.branches__item > .current')
      .then(name => {
        assert.equal(name, 'master');
      })
      // 3.1.3. Проверить, что для ветки отображается список коммитов
      .getText('.logs__item:first-child .logs__title')
      .then(text => {
        assert.equal(text, 'Add js');
      })
      .waitForVisible('.files__list', 20000)
      // 3.1.4. Проверить, что для ветки отображается корректный список файлов и папок
      .getText('.files__link')
      .then(text => {
        assert.deepEqual(text, ['css/', 'js/', 'index.html', 'README.md']);
      });
  });
});

// ------------------------------

describe('3.2. Работа с деревом файлов в ветке по умолчанию', () => {
  it('Сходить на уровень ниже и вернуться наверх', function () {
    return this.browser
      .url('/')
      // 3.2.3. Перейти в один из каталогов
      .click('.files__link--folder[href*="folder=css&branch=master"]')
      .waitForVisible('.files__list', 10000)
      // 3.2.4. Проверить, что отображается корректный список файлов и папок
      .getText('.files__link')
      .then(text => {
        assert.deepEqual('styles.css', text);
      })
      // 3.2.5. Вернуться на каталог выше
      .click('.files__parent-folder')
      .waitForVisible('.files__list', 50000)
      // 3.2.6. Проверить, что отображается корректный список файлов и папок
      .getText('.files__link')
      .then(text => {
        assert.deepEqual(text, ['css/', 'js/', 'index.html', 'README.md']);
      });
  });
});

// ------------------------------

describe('3.3. Отображение содержимого файла в ветке по умолчанию', () => {
  it('Открыть файл', function () {
    const cssContent = 'BODY{margin:0;padding:20px;font:16px/1.4Arial,sans-serif;}H1,H2,H3{color:teal;}';


    return this.browser
      .url('/')
      // 3.3.2. Перейти в каталог, содержащий файлы
      .click('.files__link--folder[href*="folder=css"]')
      .waitForVisible('.files__list', 10000)
      // 3.3.3. Открыть файл
      .click('.files__link--file')
      .waitForVisible('pre', 10000)
      // 3.3.4. Проверить, что содержимое файла отображается
      .getText('pre')
      .then(text => {
        assert.equal(text.replace(/\n| /g,''), cssContent);
      })
      // 3.3.6. Проверить, что отображается корректный список файлов и папок
      .getText('.files__link')
      .then(text => {
        assert.deepEqual(text, 'styles.css');
      });
  });
});

// ------------------------------

describe('3.4. Работа с деревом файлов для коммита из ветки по умолчанию', () => {
  it('Зайти в коммит, походить по дереву', function () {
    return this.browser
      .url('/')
      // 3.4.2. Перейти в коммит из ветки
      .click('a[href*="?commit=96392ff"]')
      .waitForVisible('.files__list', 50000)
      // 3.4.3. Проверить, что в корне дерева файлов коммита отображается корректный список файлов и папок
      .getText('.files__link')
      .then(text => {
        assert.deepEqual(text, ['css/', 'index.html', 'README.md']);
      })
      // 3.4.4. Перейти в один из каталогов
      .click('.files__link--folder')
      .waitForVisible('.files__list', 50000)
      // 3.4.5. Проверить, что отображается корректный список файлов и папок
      .getText('.files__link')
      .then(text => {
        assert.deepEqual('styles.css', text);
      })
      // 3.4.6. Вернуться на каталог выше
      .click('.files__parent-folder')
      .waitForVisible('.files__list', 50000)
      // 3.4.7. Проверить, что отображается корректный список файлов и папок
      .getText('.files__link')
      .then(text => {
        assert.deepEqual(text, ['css/', 'index.html', 'README.md']);
      });
  });
});

// ------------------------------

describe('3.5. Отображение содержимого файла для коммита из ветки по умолчанию', () => {
  it('Открыть файл', function () {
    const cssContent = 'BODY{margin:0;padding:20px;font:16px/1.4Arial,sans-serif;}H1,H2,H3{color:teal;}';

    return this.browser
      .url('/')
      // 3.5.2. Перейти в коммит из ветки
      .click('.logs__hash[href*="?commit=96392ff&branch=master"]')
      .waitForVisible('.files__list', 10000)
      // 3.5.3. Перейти в каталог, содержащий файлы
      .click('.files__link--folder')
      .waitForVisible('.files__list', 10000)
      // 3.5.4. Открыть файл
      .click('.files__link--file')
      .waitForVisible('pre', 10000)
      // 3.5.5. Проверить, что содержимое файла отображается
      .getText('pre')
      .then(text => {
        assert.equal(text.replace(/\n| /g,''), cssContent);
      })
      // 3.5.7. Проверить, что отображается корректный список файлов и папок
      .getText('.files__link--file')
      .then(text => {
        assert.deepEqual('styles.css', text);
      });
  });
});

// ------------------------------

describe('3.6. Отображение ветки отличной от ветки по умолчанию', () => {
  it('Открыть ветку', function () {
    return this.browser
      .url('/')
      // 3.6.2. Выбрать ветку отличную от ветки по умолчанию
      .click('a[href*="?branch=pictures"]')
      .waitForVisible('.files__list', 10000)
      // 3.6.3. Проверить, что в списке всех веток теперь отображается выбранная
      .getText('.branches__item > .current')
      .then(name => {
        assert.equal(name, 'pictures');
      })
      // 3.6.4. Проверить, что для ветки отображается список коммитов
      .getText('.logs__item:first-child .logs__title')
      .then(text => {
        assert.equal(text, 'Add home icon');
      })
      .waitForVisible('.files__list', 10000)
      // 3.6.5. Проверить, что для ветки отображается корректный список файлов и папок
      .getText('.files__link')
      .then(text => {
        assert.deepEqual(text, ['css/', 'img/', 'index.html', 'README.md']);
      });
  });
});

// ------------------------------

describe('3.7. Работа с деревом файлов в ветке отличной от ветки по умолчанию', () => {
  it('Открыть ветку', function () {
    return this.browser
      .url('/')
      // 3.7.2. Выбрать ветку отличную от ветки по умолчанию
      .click('a[href*="?branch=pictures"]')
      .waitForVisible('.files__list', 10000)
      // 3.7.3. Перейти в один из каталогов
      .click('a[href*="?folder=img&branch=pictures"]')
      .waitForVisible('.files__list', 10000)
      // 3.7.4. Проверить, что отображается корректный список файлов и папок
      .getText('.files__link')
      .then(text => {
        assert.deepEqual(['svg/','sunset.jpeg', 'car.jpeg'], text);
      })
      // 3.7.5. Вернуться на каталог выше
      .click('.files__parent-folder')
      .waitForVisible('.files__list', 50000)
      // 3.7.6. Проверить, что отображается корректный список файлов и папок
      .getText('.files__link')
      .then(text => {
        assert.deepEqual(text, ['css/', 'img/', 'index.html', 'README.md']);
      });
  });
});

// ------------------------------

describe('3.8. Отображение содержимого файла в ветке отличной от ветки по умолчанию', () => {
  it('Открыть файл', function () {
    const cssContent = 'BODY{margin:0;padding:20px;font:16px/1.4Arial,sans-serif;}H1,H2,H3{color:teal;}';

    return this.browser
      .url('/')
      // 3.8.2. Выбрать ветку отличную от ветки по умолчанию
      .click('a[href*="?branch=pictures"]')
      .waitForVisible('.files__list', 10000)
      // 3.8.3. Перейти в каталог, содержащий файлы
      .click('.files__link--folder[href*="css"]')
      .waitForVisible('.files__list', 10000)
      // 3.8.4. Открыть файл
      .click('.files__link--file')
      .waitForVisible('pre', 10000)
      // 3.8.5. Проверить, что содержимое файла отображается
      .getText('pre')
      .then(text => {
        assert.equal(text.replace(/\n| /g,''), cssContent);
      })
      // 3.8.7. Проверить, что отображается корректный список файлов и папок
      .getText('.files__link--file')
      .then(text => {
        assert.deepEqual('styles.css', text);
      });
  });
});

// ------------------------------

describe('3.9. Работа с деревом файлов для коммита из ветки отличной от ветки по умолчанию', () => {
  it('Открыть файл', function () {
    return this.browser
      .url('/')
      // 3.9.2. Выбрать ветку отличную от ветки по умолчанию
      .click('a[href*="?branch=pictures"]')
      .waitForVisible('.files__list', 10000)
      // 3.9.3. Перейти в коммит из ветки
      .click('.logs__hash[href*="?commit=a32337d&branch=pictures"]')
      .waitForVisible('.files__list', 10000)
      // 3.9.4. Проверить, что в корне дерева файлов коммита отображается корректный список файлов и папок
      .getText('.files__link')
      .then(text => {
        assert.deepEqual(text, ['css/', 'img/', 'index.html', 'README.md']);
      })
      // 3.9.5. Перейти в один из каталогов
      .click('.files__link[href*="?folder=img&branch=pictures&commit=a32337d"]')
      .waitForVisible('.files__list', 10000)
      // 3.9.6. Проверить, что отображается корректный список файлов и папок
      .getText('.files__link')
      .then(text => {
        assert.deepEqual(text, ['sunset.jpeg', 'car.jpeg']);
      })
      // 3.9.7. Вернуться на каталог выше
      .click('.files__parent-folder')
      .waitForVisible('.files__list', 50000)
      // 3.9.8. Проверить, что отображается корректный список файлов и папок
      .getText('.files__link')
      .then(text => {
        assert.deepEqual(text, ['css/', 'img/', 'index.html', 'README.md']);
      });
  });
});


// ------------------------------

describe('3.10. Отображение содержимого файла для коммита из ветки отличной от ветки по умолчанию', () => {
  it('Открыть файл', function () {
    const cssContent = 'BODY{margin:0;padding:20px;font:16px/1.4Arial,sans-serif;}H1,H2,H3{color:teal;}';

    return this.browser
      .url('/')
      // 3.10.2. Выбрать ветку отличную от ветки по умолчанию
      .click('a[href*="?branch=pictures"]')
      .waitForVisible('.files__list', 10000)
      // 3.10.3. Перейти в коммит из ветки
      .click('.logs__hash[href*="?commit=a32337d&branch=pictures"]')
      .waitForVisible('.files__list', 10000)
      // 3.10.4. Перейти в каталог, содержащий файлы
      .click('.files__link[href*="?folder=css&branch=pictures&commit=a32337d"]')
      .waitForVisible('.files__list', 10000)
      // 3.10.5. Открыть файл
      .click('.files__link--file')
      .waitForVisible('pre', 10000)
      // 3.10.6. Проверить, что содержимое файла отображается
      .getText('pre')
      .then(text => {
        assert.equal(text.replace(/\n| /g,''), cssContent);
      })
      // 3.10.8. Проверить, что отображается корректный список файлов и папок
      .getText('.files__link--file')
      .then(text => {
        assert.deepEqual('styles.css', text);
      });
  });
});
