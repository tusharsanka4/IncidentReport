# Implemented architecture decisions

1. **LangGraph inside Temporal activities.** Graph retries cover bounded model
   analysis; Temporal separately retries activities and owns long-lived waits.
   The graph does not replace durable orchestration.
2. **MCP operational boundary.** Analysis gets incident/change data and records
   its result through stdio tools. Lifecycle approval/remediation repositories
   remain transactional worker/API code. MCP is not a general shell tool.
3. **Deterministic evidence before confidence.** Ranking scores are heuristics,
   not probabilities. A supported candidate must pass the explicit score/margin,
   environment, relationship, and timing policy before model confidence matters.
4. **First durable human decision wins.** PostgreSQL commits the decision before
   signaling Temporal. Identical retries reuse it; conflicting decisions fail.
   There is no automatic delivery outbox yet. A caller must retry failed delivery.
5. **Audit failure is not invisible success.** Thrown/returned tool errors are
   audited; audit-write failure returns an MCP error. Analysis and its mandatory
   persistence audit share a transaction. Outer protocol trace auditing is
   separate, so an error can still follow a committed operation; retries must
   retain the workflow ID.
6. **Private demonstration deployment first.** Remediation is simulated and
   user identities are caller-supplied. Development Temporal remains single-node.
   Public hosting requires explicit auth/TLS, production infrastructure choices,
   backup/restore verification, and secret management.
