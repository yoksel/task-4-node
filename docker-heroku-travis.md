# Docker

Создать образ по докерфайлу:

`docker build -t <имя образа> .`

`-t` — флаг для задания имя образа

Запустить образ в контейнере:

`docker run -d -p 3000:3000 --rm <имя образа>`

`-d` — запуск в фоновом режиме. В консоли выведется хеш, после этого можно открыть проект в браузере

`-p` — добавление портов. Порты должны быть как в конфиге

`--rm` — удаление контейнера после остановки

Если нужен второй порт, он дописывается после первого, перед каждым портом нужен свой флаг -p, то есть:

`docker run -d -p 3000:3000 -p 8081:8081 --rm -it <имя образа>`

На этой стадии в браузере должно открываться работающее приложение, запущенное из локального контейнера.

Посмотреть мнформацию о текущем контейнере:

`docker ps`

Остановить контейнер:

`docker container stop <id контейнера из предыдущей команды>`

Посмотреть все контейнеры:

`docker container ls -a`

При запуске контейнера с флагом `--rm` и последующей остановке, остановленного контейнера в этом списке не будет.

Удалить образ:

`docker image rm <имя образа>`

При запуске `docker build` с тем же именем образ перезаписывается.

# Heroku

1. На хероку создать pipeline и подключить в него репозиторий с приложением. При подключении разрешить автоматическое создание ревью при коммитах в пулреквест.

2. Установить инструменты хероку:

`npm install -g heroku-cli`
`heroku plugins:install heroku-container-registry`

Подробнее: https://devcenter.heroku.com/articles/heroku-cli

Залогиниться в хероку:

`heroku container:login`

3. В папке с приложением запустить:

`heroku create`

Затем для проверки образа на хероку:

Создаём образ:

`docker build -t <имя образа> .`

Запушить образ в хероку:

`heroku container:push web --app task-4-node`

После этого приложение появится в дашборде хероку в колонке STAGING.

Открыть браузере:

`heroku open --app <имя образа>`

Посмотреть логи:

`heroku logs --app  <имя образа>`

Таким образом можно убедиться, что созданный образ запускается локально и на хероку.

---

[How to Run Dockerized Apps on Heroku… and it’s pretty sweet](https://medium.com/travis-on-docker/how-to-run-dockerized-apps-on-heroku-and-its-pretty-great-76e07e610e22)

**Heroku**
[Heroku Logging](https://devcenter.heroku.com/articles/logging)
[Container Registry & Runtime (Docker Deploys)](https://devcenter.heroku.com/articles/container-registry-and-runtime)
[Using Docker in Builds](https://docs.travis-ci.com/user/docker/)

**Travis**
[Build Stages](https://docs.travis-ci.com/user/build-stages/)
[Build Stages: Defining steps using YAML aliases](https://docs.travis-ci.com/user/build-stages/using-yaml-aliases/)
[Heroku Deployment](https://docs.travis-ci.com/user/deployment/heroku/)
