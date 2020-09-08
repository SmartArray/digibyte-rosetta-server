# This dockerfile provides an image that installs the official Rosetta CLI
# https://github.com/coinbase/rosetta-cli

FROM node:12
USER root

ARG data_path=/data
ENV DATA_PATH $data_path
WORKDIR ${DATA_PATH}

RUN mkdir -p /tmp/npm_install

# Copy and install rosetta implementation
COPY package.json package-lock.json /tmp/npm_install/
RUN cd /tmp/npm_install && \
  npm set progress=false && \
  npm config set depth 0 && \
  npm install
RUN cp -a /tmp/npm_install/node_modules "$data_path/node_modules"

# Copy the source to rosetta node directory
COPY . "$data_path"

# Copy the entrypoint file to data path
COPY test/test-runner/docker-entrypoint.sh $data_path/docker-entrypoint.sh

ENTRYPOINT ["./docker-entrypoint.sh"]
