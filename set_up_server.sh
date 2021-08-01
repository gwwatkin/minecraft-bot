#!/bin/bash


if [[ ! -d server ]]
then
  echo "No server found";
  mkdir server
  echo "Please paste the URL of a 1.16.5 server";
  read server_url
  curl -o server/server.jar $server_url
  echo "eula=true" > server/eula.txt
  echo "Running a set up server lunch, terminate the server once it's done generating files"
  java -Xmx1024M -Xms1024M -jar server.jar server/set_up.log
  sed -i "s/online-mode=true/online-mode=false/g" server/server.properties
  echo "Set up the server."
fi


echo "Launching server"
cd server
java -Xmx1024M -Xms1024M -jar server.jar > server.last_run.log &

