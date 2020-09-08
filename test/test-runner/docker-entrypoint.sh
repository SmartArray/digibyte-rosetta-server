#!/bin/sh

# Filename: docker-entrypoint.sh
# Rosetta-CLI testing

# Wait for Rosetta Server to become available
trials=5 # total: 25 sec

wait_for_node() {
    proto=$1
    host=$2
    port=$3
    path=$4

    url="$proto://$host:$port/$path"
    echo "Waiting for Rosetta Node ($url) to become available..."

    #until $(curl --head --fail $url); do
    until $(curl --output /dev/null --silent --head --fail $url); do
        trials=$(( $trials - 1 ))
        printf '.'

        for i in `seq 1 5`; do
            sleep 1
        done

        if [ "$trials" -le 0 ]; then
            echo "Node not reachable. Exiting..."
            exit 1
        fi
    done

    echo " Node available!"
}

wait_for_node http $ONLINE_HOST $ONLINE_PORT "/hello"
wait_for_node http $OFFLINE_HOST $OFFLINE_PORT "/hello"

npx mocha test/construction/*.js
