#!/bin/bash
echo "Bash start -----------"

echo "TESTVAR: ($TESTVAR)"

if [ NODE_ENV == "production" ]
then
echo " ***> production: npm i"
# npm i --production;
else
echo " ***> dev: npm i"
# npm i --production;
echo " ***> dev: npm run"
# npm run build;
fi

echo "Bash end -----------"
