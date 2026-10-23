npm run dev
starts the fastify API

npm.cmd run test:kubernetes
renders and checks the Kubernetes manifests without deploying anything (requires kubectl)

kubectl kustomize deploy/kubernetes/overlays/demo
renders the private demonstration stack; follow deploy/kubernetes/README.md before applying to a cluster

docker compose --env-file .env -f deploy/docker-compose.yml -f deploy/docker-compose.app.yml up -d --build --wait
builds and starts the whole application in Docker, including migrations; stop host API/worker first

docker compose --env-file .env -f deploy/docker-compose.yml -f deploy/docker-compose.app.yml run --rm seed
loads reference data using the compiled container (run explicitly after startup)

docker compose --env-file .env -f deploy/docker-compose.yml -f deploy/docker-compose.app.yml logs -f api worker
follows the container application logs; open http://127.0.0.1:3000/ for the frontend

docker compose --env-file .env -f deploy/docker-compose.yml -f deploy/docker-compose.app.yml stop
stops the full stack without deleting persistent data

npm run build:runtime
compiles application and database code only, as used in the Docker build

npm run test:runtime
checks source/compiled MCP subprocess selection

npm run test:containers
tests the compiled stack; first follow the isolated Postman simulation setup in docs/deployment.md


npm run build
runs the typescript compiler

npm run seed
loads the resources relationships and sample changes

npm run test:ranking
tests deterministic ranking

npm run mcp:dev
starts teh stdio MCP server directly

npm run mcp:inspect
starts a client interface for manually calling and inspecting MCP tools

docker compose --env-file .env -f deploy/docker-compose.yml up -d
starts PostgreSQL and persistent development Temporal (stop any manually running Temporal server first)

npm run migrate
applies all pending database migrations; use for fresh and existing databases before starting the worker

npm run test:database
tests migration setup, upgrades, checksums, integrity, and rollback

npm run test:e2e
tests the complete HTTP, Temporal, LangGraph, MCP, and real PostgreSQL lifecycle; Docker Desktop must be running, no live model is used

docker compose --env-file .env -f deploy/docker-compose.yml ps
checks whether it is runing

docker compose --env-file .env -f deploy/docker-compose.yml exec postgres pg_isready -U manifest_user -d manifest_db
checks whether it is ready to accept connections
expected manifest_db:5432 - accepting connections

docker compose --env-file .env -f deploy/docker-compose.yml exec postgres psql -U manifest_user -d manifest_db
open postgreSQL for psql commands

\q to exit out of the container psql

docker compose --env-file .env -f deploy/docker-compose.yml stop
stop the container without deleting data

docker compose --env-file .env -f deploy/docker-compose.yml restart
restart the container 

docker compose --env-file .env -f deploy/docker-compose.yml logs -f postgres
view the postgre logs
