#!/usr/bin/env bash

pwd=$(pwd)
find $pwd -print | sed -e "s;$pwd;\.;g;s;[^/]*\/;|__;g;s;__|; |;g"
