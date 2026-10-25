# Cloud deployment: decisions and acceptance checklist

Cloud hosting is not complete until a real environment is deployed and its
hosted incident lifecycle is verified. The repository currently supplies a
Docker image, Kubernetes manifests, and CI checks; these alone are not hosting.

## Decisions required before provisioning

- Provider and region: DigitalOcean Kubernetes follows the tutorial, but this
  has not been selected or provisioned. Other providers require their own
  current setup instructions.
- Budget and explicit approval for billable cluster nodes, persistent volumes,
  registry/storage, networking/load balancers, and optional managed services.
- Provider account access and image-registry ownership. Use local/provider
  authentication or a secret store; never put tokens in source files or chat.
- Domain and HTTPS/access-control approach. The current console and approval
  endpoints trust caller-supplied identities. Publishing the API unprotected
  would expose incident data and model-triggering operations.
- PostgreSQL/Temporal hosting and backup plan. The current Temporal SQLite dev
  server is suitable for a private demo, not a highly available production
  cluster. Temporal Cloud requires TLS/auth support not configured in the
  application's current client/worker setup.

No paid resources, registry pushes, DNS records, public endpoints, or cloud
credentials are created by the new CI workflow. CI intentionally does not
perform continuous deployment.

## Implementation sequence after those choices

1. Confirm the selected provider's current cluster and registry requirements.
2. Build and publish a versioned application image to the selected registry.
3. Create a dedicated cluster/environment with an agreed budget. Configure
   kubectl explicitly; do not assume its current context is the target.
4. Add a provider-specific overlay for the image, storage, service endpoints,
   resource sizing, registry access, and approved exposure method. Reuse the
   existing base rather than replacing application logic.
5. Configure database/provider secrets privately; do not commit generated
   Secret manifests. Review storage permissions and backup/restore procedures.
6. Run server-side validation, deploy, wait for migrations/rollouts, and seed
   reference data only when intended.
7. Put access control and HTTPS in place before publishing the console/API.
   Keep database, Temporal gRPC, and Temporal UI off the public Internet.
8. Verify `/health`, `/ready`, worker polling, and a complete fresh incident
   flow: creation, candidates, analysis, approval/rejection, outcome, audit.
9. Test pod replacement/recovery and document the hosted walkthrough, URL,
   limitations, cost controls, backups, and teardown/data-retention procedure.

The provider selection, provisioning authority, and hosted acceptance evidence
are still required. See [Kubernetes runbook](../deploy/kubernetes/README.md) and
[CI setup](ci.md) for the completed repository foundations.
