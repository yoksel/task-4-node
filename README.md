[![Build Status](https://travis-ci.org/yoksel/task-4-node.svg?branch=master)](https://travis-ci.org/yoksel/task-4-node)

# Запуск приложения

1. Сборка: `npm run build`
2. Запуск: `npm start`

Запуск с вотчером: `npm run dev`

Параметры запуска задаются в config.js.

# Тестирование

Модульные тесты: `npm test`
Интеграционные: `npm run hermione`

В модульных сделана проверка всех функций, которые внутри себя не получают данные с помощью гит-команд.

Интеграционные отрабатывают все, но обычно часть из них падает с ошибкой с указанием на getText. Если одновременно запускать только часть тестов, всё работает.

Репозиторий для тестов: https://github.com/yoksel/test-git
