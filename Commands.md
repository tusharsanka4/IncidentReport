npm run dev
starts the fastify API


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
starts the postgres Container

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