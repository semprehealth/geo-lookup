FROM node:5.10.1
MAINTAINER Swaraj Banerjee "swaraj@semprehealth.com"

# This is will be cached until package.json is changed
COPY package.json /tmp/package.json
RUN npm config set registry http://registry.npmjs.org/
WORKDIR /tmp
RUN npm install

RUN mkdir -p /usr/src/app
RUN cp -a /tmp/node_modules /usr/src/app
WORKDIR /usr/src/app
COPY . /usr/src/app

EXPOSE 8081

CMD node index.js
