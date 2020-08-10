FROM ubuntu:xenial

ARG VERSION=7.17.2
ARG ARCH=x86_64
ARG RPCUSERNAME=user
ARG RPCPASSWORD=password
ARG ROOTDATADIR=/data
ARG RUN_AS_DAEMON=0

# Set to 1 for running it in testnet mode
ARG TESTNET=0

# Set to 1 for running it in regtest mode,
# only one of these options can be set to 1 simultaneously
ARG REGTEST=0

# Do we want any blockchain pruning to take place? Set to 4096 for a 4GB blockchain prune.
# Alternatively set size=1 to prune with RPC call 'pruneblockchainheight <height>'
# Must have txindex=0 if set
ARG PRUNESIZE=0
ARG TX_INDEX=0

# Install and clean again
RUN apt-get update && \
    apt-get install --yes software-properties-common wget && \
    rm -rf /var/lib/apt/lists

# Download DigiByte Binary
RUN wget -c https://github.com/DigiByte-Core/DigiByte/releases/download/v${VERSION}/digibyte-${VERSION}-${ARCH}-linux-gnu.tar.gz -O - | tar xz

RUN mv ./digibyte-${VERSION} "${ROOTDATADIR}"
RUN chmod +x "${ROOTDATADIR}/bin/digibyted"
RUN chmod +x "${ROOTDATADIR}/bin/digibyte-cli"
RUN ln -s "${ROOTDATADIR}/bin/digibyte-cli" "/usr/bin/digibyte-cli"
RUN ln -s "${ROOTDATADIR}/bin/digibyted" "/usr/bin/digibyted"
RUN export ROOTDATADIR="${ROOTDATADIR}"

# Generate config
RUN mkdir -p "/root/.digibyte"
RUN bash -c 'echo -e "server=1\n\
prune=${PRUNESIZE}\n\
maxconnections=300\n\
rpcallowip=127.0.0.1\n\
daemon=${RUN_AS_DAEMON}\n\
rpcuser=${RPCUSERNAME}\n\
rpcpassword=${RPCPASSWORD}\n\
txindex=${TX_INDEX}\n\
addresstype=bech32\n\
# Uncomment below if you need Dandelion disabled for any reason but it is left on by default intentionally\n\
#disabledandelion=1\n\
testnet=${TESTNET}\n\
regtest=${REGTEST}\n\
\n\
[regtest]\n\
rpcallowip=0.0.0.0/0\n\
rpcbind=0.0.0.0\n\
daemon=${RUN_AS_DAEMON}\n"' > "/root/.digibyte/digibyte.conf"

ENV DGB_VERSION $VERSION

# Export RPC_PORT as ENV VAR
RUN if [ "$TESTNET" == "0" ] && [ "$REGTEST" == "0" ]; \
	then export RPC_PORT=14022; \
	else if [ "$TESTNET" == "1" ] && [ "$REGTEST" == "0" ]; \
	then export RPC_PORT=14024; \
	else if [ "$TESTNET" == "0" ] && [ "$REGTEST" == "1" ]; \
	then export RPC_PORT=18443; \
	else export RPC_PORT=""; \
fi

COPY --from=build ../run.sh /run.sh
RUN chmod u+x /run.sh

# Allow Mainnet RPC
EXPOSE 14022

# Allow Testnet RPC
EXPOSE 14023

# Allow Regtest RPC
EXPOSE 18443

ENTRYPOINT ["/run.sh"]
