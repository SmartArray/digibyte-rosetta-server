# This dockerfile provides an image that installs the official Rosetta CLI
# https://github.com/coinbase/rosetta-cli

FROM golang
USER root

WORKDIR /data
ARG rootdatadir=/data
ARG version_tag=4bb48b24a794deb3635973e32d1ea806e5b30729

ENV OFFLINE_HOST=digibyte_offline
ENV ONLINE_HOST=digibyte_online        
ENV OFFLINE_PORT=1337
ENV ONLINE_PORT=1338

RUN curl -sSfL https://raw.githubusercontent.com/coinbase/rosetta-cli/$version_tag/scripts/install.sh | sh -s

COPY test/rosetta-cli/docker-entrypoint.sh /data/docker-entrypoint.sh

ENTRYPOINT ["./docker-entrypoint.sh"]
