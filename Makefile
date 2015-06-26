
SHELL := bash

export PORT=1999
export MONGODB=localhost/klouds
export ASSETS=../client/dist
export JWT_KEY=klouds_is_so_secure
export STRIPE_SK=sk_test_Z34c2IRtyypD4EIQjdowKeLd

all: dev
.PHONY: all

node_modules: package.json
	# Installing node modules
	@ npm install
	@ touch node_modules

dev:
	# Starting development server
	@ nodemon bootstrap.js

.PHONY: dev
