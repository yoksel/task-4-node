#  Docker, Heroku, Travis

## Docker

### 1. Создать образ по докерфайлу:

  ```docker build -t <имя образа> .```

  `-t` — флаг для задания имени образа

### 2. Запустить образ в контейнере:

  ```docker run -d -p 3000:3000 --rm <имя образа>```

  `-d` — запуск в фоновом режиме. В консоли выведется хеш, после этого можно открыть проект в браузере

  `-p` — добавление портов. Порты должны быть как в конфиге

  `--rm` — удаление контейнера после остановки

  Если нужен второй порт, он дописывается после первого, перед каждым портом нужен свой флаг -p, то есть будет так:

  `docker run -d -p 3000:3000 -p 8081:8081 --rm -it <имя образа>`

На этой стадии в браузере должно открываться работающее приложение, запущенное из локального контейнера.

### Полезные команды:

  Посмотреть информацию о текущем контейнере:

  ```docker ps```

  Остановить контейнер:

  ```docker container stop <id контейнера из предыдущей команды>```

  Посмотреть все контейнеры:

  ```docker container ls -a```

  При запуске контейнера с флагом `--rm` и последующей остановке, остановленного контейнера в этом списке не будет.

  Удалить образ:

  ```docker image rm <имя образа>```

  При запуске `docker build` с тем же именем образ перезаписывается.

## Heroku

Для корректной работы с портами на хероку порт в приложении нужно задавать так:

```process.env.PORT || config.port```

Если окружении не задан, берётся из конфига.

### 1. На хероку создать pipeline и подключить в него репозиторий с приложением.

  При подключении разрешить автоматическое создание ревью при коммитах в пулреквест.

### 2. Установить инструменты хероку:

  ```npm install -g heroku-cli```

  ```heroku plugins:install heroku-container-registry```

  Подробнее: https://devcenter.heroku.com/articles/heroku-cli

  Залогиниться в хероку:

  ```heroku container:login```

### 3. В папке с приложением запустить:

  ```heroku create```

  Затем нужно проверить докер-образ на хероку.

####   1. Создаём образ:

  ```docker build -t <имя образа> .```

####  2. Пушим образ в хероку:

  ```heroku container:push web --app <имя образа>```

  После этого приложение появится в дашборде хероку в колонке STAGING.

  Открыть браузере:

  ```heroku open --app <имя образа>```

  Посмотреть логи:

  ```heroku logs --app  <имя образа>```

Таким образом можно убедиться, что созданный образ запускается локально и на хероку.

[Heroku Logging](https://devcenter.heroku.com/articles/logging)
[Container Registry & Runtime (Docker Deploys)](https://devcenter.heroku.com/articles/container-registry-and-runtime)
[Using Docker in Builds](https://docs.travis-ci.com/user/docker/)

## Travis

__Полезное:__<br>
Параметр ```skip_cleanup: true``` говорит тревису не удалять то, что получилось после ```npm run build```.
[Deployment: Uploading Files and skip_cleanup](https://docs.travis-ci.com/user/deployment#Uploading-Files-and-skip_cleanup)

Команды для деплоя в travis.yml:<br>
[Heroku Deployment](https://docs.travis-ci.com/user/deployment/heroku/)

Последовательный запуск нескольких команд:<br>
[Build Stages](https://docs.travis-ci.com/user/build-stages/)

Пример конфига для деплоя на хероку:<br>
[Build Stages: Deploying to Heroku](https://docs.travis-ci.com/user/build-stages/deploy-heroku/)

Условия для запуска команд:<br>
[Conditional Builds, Stages, and Jobs](https://docs.travis-ci.com/user/conditional-builds-stages-jobs/)

Переиспользование кусков кода:<br>
[Build Stages: Defining steps using YAML aliases](https://docs.travis-ci.com/user/build-stages/using-yaml-aliases/)

---

[How to Run Dockerized Apps on Heroku… and it’s pretty sweet](https://medium.com/travis-on-docker/how-to-run-dockerized-apps-on-heroku-and-its-pretty-great-76e07e610e22)
