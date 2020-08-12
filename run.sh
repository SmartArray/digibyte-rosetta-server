#!/bin/bash

source ~/env

set -e

DATA_DIR="$ROOTDATADIR"
NODE_DIR="$ROSETTADIR"

wait_for_digibyted()
{
	set +e

	echo "Connecting to RPC with "\
		"rpcuser=$RPC_USER" \
		"rpcpassword=$RPC_PASS" \
		"rpcport=$RPC_PORT"

	while true; do
		digibyte-cli \
			-rpcuser="$RPC_USER" \
			-rpcpassword="$RPC_PASS" \
			-rpcport="$RPC_PORT" \
			getblockhash 0

		rc=$?

		if [ "$rc" = 0 ]
		then
			break
		else
			echo "Waiting another 30 seconds"
			sleep 30
		fi
	done
	set -e
}

if [ ! -d "$DATA_DIR" ]; then
	echo "Error: $DATA_DIR does not exist. Quitting."
	exit 1
fi

#if [ ! -f "$DATA_DIR/rosetta-config.json" ]; then
#	echo "Error: $DATA_DIR/rosetta-config.json not found. Please ensure it exists. Quitting."
#	exit 2
#fi

echo "digibyte.conf contents"
cat "${DATA_DIR}/digibyte.conf"

echo "Starting digibyted..."
digibyted \
	-conf="${DATA_DIR}/digibyte.conf" \
	-datadir="${DATA_DIR}/.digibyte"

sleep 2

echo "Waiting for digibyted to be ready..."
wait_for_digibyted

echo "Starting Rosetta-Node..."
cd "${NODE_DIR}"
npm run start
