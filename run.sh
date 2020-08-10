#!/bin/sh

DATA_DIR="/data"

if [ ! -d "$DATA_DIR" ]; then
	echo "Error: $DATA_DIR does not exist. Quitting."
	exit 1
fi

if [ ! -f "$DATA_DIR/rosetta-config.json" ]; then
	echo "Error: $DATA_DIR/rosetta-config.json not found. Please ensure it exists. Quitting."
	exit 2
fi

digibyted
