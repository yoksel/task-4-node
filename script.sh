#!/bin/bash
echo "Bash start -----------"
echo "NODE_ENV: ($NODE_ENV)"

if [ NODE_ENV == "production" ]
then
echo "--->production: npm i"
npm i --production;
else
echo "--->dev: npm i"
npm i;
echo "--->dev: npm run build"
npm run build;
fi

echo "Bash end -----------"
