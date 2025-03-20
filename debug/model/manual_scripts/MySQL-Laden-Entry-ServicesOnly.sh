#!/bin/bash

# trap 'kill -TERM $PID' TERM INT

# /usr/bin/entrypoint.sh --bind-addr "0.0.0.0:8080" . &

# PID=$!

# sleep 2

service mariadb restart

# wait $PIDj
# trap - TERM INT
# wait $PID
# EXIT_STATUS=$?
# echo "Service exited with status ${EXIT_STATUS}"

# /root/.nvm/nvm.sh
sleep 2

source /root/.bashrc
npm install
npm start

cd debug
node Harness.js

