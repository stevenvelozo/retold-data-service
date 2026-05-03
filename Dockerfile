FROM node:20-bookworm AS base
MAINTAINER steven velozo <steven@velozo.com>

RUN apt-get update && apt-get -y --force-yes install curl vim nano less \
	tmux uuid-runtime

ADD package.json /service_root/package.json
RUN cd /service_root && npm install --omit=dev

ADD source /service_root/source
ADD bin    /service_root/bin

WORKDIR /service_root

RUN rm -rf package-lock.json .git test

FROM base AS production

RUN date -u +"%Y-%m-%dT%H:%M:%SZ" > ./build.date

CMD ["node", "bin/retold-data-service-clone.js"]
