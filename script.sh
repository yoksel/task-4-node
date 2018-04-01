#!/bin/bash
# It doesn't work. Just keep it

echo "Bash start -----------"

echo "TESTVAR: ($TESTVAR)"

if [ NODE_ENV == "production" ]
then
echo " ***> production: npm i"
npm i --production;
else
echo " ***> dev: npm i"
npm i;
echo " ***> dev: npm run build"
npm run build;
fi

echo "Bash end -----------"
