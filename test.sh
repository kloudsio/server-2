#!/bin/bash

BASE=localhost:1999


apps=`curl -s \
  -H "Content-Type: application/json" \
  localhost:1999/apps`
echo 'Apps:'
iojs -e "console.log($apps.map(function(v){ return v.name } ).join(', '))"
echo

disabled=`curl -s \
  -H "Content-Type: application/json" \
  localhost:1999/disabled`
echo 'Disabled Apps:'
iojs -e "console.log($disabled.map(function(v){ return v.name } ).join(', '))"
echo

curl -i \
  -H "Content-Type: application/json" \
  -d '{
  "email": "'$(date +%s)'@klouds.io",
  "password": "TEST123"
}' \
  http://localhost:1999/register \
  http://localhost:1999/login


# echo -n -e "\nPOST /login:    \t--\t"
# curl --silent -i localhost:1999/login \
#   -d email=test@klouds.io \
#   -d password=test \
#   --header "Content-Type:application/json"
#   # | head -1
#
# echo -n -e "\nGET /subscribe: \t--\t"
# curl --silent -i localhost:1999/subscribe\
# | head -1
