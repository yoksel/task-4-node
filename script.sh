#!/bin/bash
echo "Bash start -----------"
echo "NODE_ENV: ($NODE_ENV)"
echo "PRBUILD: $PRBUILD"
echo "PRODFLAG: $PRODFLAG"

if [ NODE_ENV == "production" ]
then
npm i --production;
else
npm i;
npm run build;
fi

echo "Bash end -----------"
