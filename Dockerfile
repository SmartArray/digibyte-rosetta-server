FROM ubuntu:focal
USER root
WORKDIR /data

ARG rootdatadir=/data
ARG rpc_username=user
ARG rpc_password=pass
ARG dgb_version=7.17.2
ARG arch=x86_64

ARG main_p2p_port=12024
ARG main_rpc_port=14022
ARG test_p2p_port=12026
ARG test_rpc_port=14023

ARG listening_port=8080

# You can confirm your timezone by setting the TZ database name field from:
# https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
ARG local_timezone=Europe/Berlin

# Set to 1 for running it in testnet mode
ARG use_testnet=0

# OR set this to 1 to enable Regtest mode.
# Note: Only one of the above can be set exclusively.
ARG use_regtest=0

# Do we want any blockchain pruning to take place? Set to 4096 for a 4GB blockchain prune.
# Alternatively set size=1 to prune with RPC call 'pruneblockchainheight <height>'
ARG prunesize=0

# Use multiple processors to build DigiByte from source.
# Warning: It will try to utilize all your systems cores, which speeds up the build process,
# but consumes a lot of memory which could lead to OOM-Errors during the build process.
# Recommendation: Enable this on machines that have more than 16GB RAM.
ARG parallize_build=0

# Update apt cache and set tzdata to non-interactive or it will fail later.
# Also install essential dependencies for the build project.
RUN DEBIAN_FRONTEND="noninteractive" apt-get update \
  && apt-get -y install tzdata \
  && ln -fs /usr/share/zoneinfo/${local_timezone} /etc/localtime \
  && dpkg-reconfigure --frontend noninteractive tzdata \
  && apt-get install -y wget git build-essential libtool autotools-dev automake \
  && apt-get install -y nodejs npm \
  pkg-config libssl-dev libevent-dev bsdmainutils python3 libboost-system-dev \
  libboost-filesystem-dev libboost-chrono-dev libboost-test-dev libboost-thread-dev \
  libdb-dev libdb++-dev && \
  apt-get clean

# Clone the Core wallet source from GitHub and checkout the version.
RUN git clone https://github.com/DigiByte-Core/digibyte/ --branch ${dgb_version} --single-branch

# Determine how many cores the build process will use.
RUN export CORES=1 && [ $parallize_build -ne 0 ] && export CORES=$(nproc); \
  echo "Using $CORES core(s) for build process."

# Prepare the build process
RUN cd ${rootdatadir}/digibyte && ./autogen.sh \
  && ./configure --without-gui --with-incompatible-bdb

# Start the build process
RUN cd ${rootdatadir}/digibyte \
  && make \
  && make install

# Delete source
RUN rm -rf ${rootdatadir}/digibyte

RUN mkdir -vp \
  "/root/rosetta-node" \
  "${rootdatadir}/.digibyte" \
  "${rootdatadir}/utxodb" \
  "/tmp/npm_install"

# Copy and install rosetta implementation
COPY package.json package-lock.json /tmp/npm_install/
RUN cd /tmp/npm_install && \
  npm set progress=false && \
  npm config set depth 0 && \
  npm install --only=production 
RUN cp -a /tmp/npm_install/node_modules "/root/rosetta-node/"

# Copy the source to rosetta node directory
COPY . "/root/rosetta-node/"

# Create digibyte.conf file
RUN bash -c 'echo -e "\
server=1\n\
prune=${prunesize}\n\
maxconnections=300\n\
rpcallowip=127.0.0.1\n\
daemon=1\n\
rpcuser=${rpc_username}\n\
rpcpassword=${rpc_password}\n\
txindex=0\n\
# Uncomment below if you need Dandelion disabled for any reason but it is left on by default intentionally\n\
#disabledandelion=1\n\
addresstype=bech32\n\
testnet=${use_testnet}\n\
regtest=${use_regtest}\n" | tee "${rootdatadir}/digibyte.conf"'

# Set some environment variables
ENV ROOTDATADIR "$rootdatadir"
ENV ROSETTADIR "/root/rosetta-node"
ENV DGB_VERSION "$dgb_version"
ENV PORT $listening_port
ENV DATA_PATH "${rootdatadir}/utxodb"
ENV RPC_USER "$rpc_username"
ENV RPC_PASS "$rpc_password"

RUN if [ "$use_testnet" = "0" ] && [ "$use_regtest" = "0" ]; \
    then \
      echo 'export RPC_PORT="14022"' >> ~/env; \
      echo 'export DGB_NETWORK="livenet"' >> ~/env; \
    elif [ "$use_testnet" = "1" ] && [ "$use_regtest" = "0" ]; \
    then \
      echo 'export RPC_PORT="14023"' >> ~/env; \
      echo 'export DGB_NETWORK="testnet"' >> ~/env; \
    elif [ "$use_testnet" = "0" ] && [ "$use_regtest" = "1" ]; \
    then \
      echo 'export RPC_PORT="18443"' >> ~/env; \
      echo 'export DGB_NETWORK="regtest"' >> ~/env; \
    else \
      echo 'export RPC_PORT=""' >> ~/env; \
      echo 'export DGB_NETWORK=""' >> ~/env; \
    fi

# Allow Communications:
#         p2p mainnet   rpc mainnet   rpc testnet   p2p testnet
EXPOSE    12024/tcp     14022/tcp     14023/tcp     12026/tcp

# Create symlinks shouldn't be needed as they're installed in /usr/local/bin/
#RUN ln -s /usr/local/bin/digibyted /usr/bin/digibyted
#RUN ln -s /usr/local/bin/digibyte-cli /usr/bin/digibyte-cli

RUN echo "${ROOTDATADIR}"
COPY run.sh "${ROOTDATADIR}/docker_entrypoint.sh"

ENTRYPOINT ["./docker_entrypoint.sh"]
