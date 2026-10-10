# Database migrations

Run from the project root, with `DATABASE_URL` pointing to the intended database:

```powershell
npm run migrate
```

This is required on both fresh Docker volumes and existing databases. Stop
the API and worker during the upgrade. The command creates `schema_migrations`,
applies pending files in filename order in one transaction, and records SHA-256
checksums. An advisory lock prevents concurrent runners from applying the same
DDL. Rerunning it is a no-op. CRLF and LF checkouts produce the same checksum.

Never edit an applied migration; add another numbered SQL file. Missing or
changed applied files are rejected. Failed migrations roll back the schema and
ledger together. No incidents or historical audit records are deleted.

## Existing databases

Earlier Docker setups ran `001` and `002` directly without a ledger. The runner
adopts `001` only if every expected base table and column exists, then runs the
repeatable `002` before applying `003`. Partial legacy schemas fail with the
missing table/column identified. Schema adoption does not prove that every
historical column type or constraint was never changed; investigate manually
modified databases before upgrading.

`npm run migrate:temporal` is retained for compatibility and now runs the same
full upgrade. The previous Docker SQL initialization mount has been removed;
schema changes now have one tracked entrypoint.

## Schema coverage

- `001`: resources, relationships, incidents, changes, analyses, approval
  requests, and audit events, including foreign keys and confidence constraints.
- `002`: unique workflow/event keys and durable remediation/health results.
- `003`: database status `VERIFYING_HEALTH`, actor/timestamp requirements for
  approved or rejected decisions, and indexes for analysis, approvals,
  remediation, change-time filtering, and incident ordering.

`003` fails if existing approved/rejected records lack an actor or timestamp.
It does not invent approvers or remove bad rows. Investigate the reported
records and correct them explicitly before retrying.

The seed loads reference resources, relationships, and changes—not incidents.
Create incidents through the API. No service-name foreign key is added: an
unknown service should be analysed safely rather than preventing ingestion.

## Backup before upgrading

Choose a unique backup filename, then use the container's existing credentials:

```powershell
New-Item -ItemType Directory -Force backups
docker compose --env-file .env -f deploy/docker-compose.yml exec postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/manifest-backup-20261010.dump'
docker compose --env-file .env -f deploy/docker-compose.yml cp postgres:/tmp/manifest-backup-20261010.dump ./backups/manifest-backup-20261010.dump
```

Backups are ignored by Git. Validate restoration into a separate empty database
using `pg_restore --exit-on-error --no-owner --no-privileges`; never restore over
your active database for a smoke test. PostgreSQL dumps do not contain Temporal
history, which is in its separate Docker volume.

## Automated verification

```powershell
npm run test:database
```

By default tests use embedded PostgreSQL. To test actual PostgreSQL, start the
isolated stack described in [deployment.md](../../docs/deployment.md), then:

```powershell
$env:TEST_DATABASE_URL = "postgresql://manifest_verify:local_verification_only@127.0.0.1:15432/manifest_verification"
npm run test:database
Remove-Item Env:TEST_DATABASE_URL
```

Real PostgreSQL tests require the disposable `manifest_verification` database.
They create and remove only generated test databases on that server. Coverage
includes fresh setup, legacy upgrades, preserved incidents, repeat runs,
checksums, concurrent runners, approval integrity, partial schemas, and rollback.
