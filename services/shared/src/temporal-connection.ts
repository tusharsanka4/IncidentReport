/** Shared by the HTTP client, CLI, readiness checks, and native worker. */
export function temporalConnectionOptions(
  environment: NodeJS.ProcessEnv = process.env
) {
  const tlsSetting = environment.TEMPORAL_TLS ?? "false";
  if (tlsSetting !== "true" && tlsSetting !== "false") {
    throw new Error("TEMPORAL_TLS must be true or false");
  }

  const tls = tlsSetting === "true";
  const apiKey = environment.TEMPORAL_API_KEY || undefined;
  if ((apiKey || environment.VERCEL === "1") && !tls) {
    throw new Error("Remote Temporal access requires TEMPORAL_TLS=true");
  }

  return {
    address: environment.TEMPORAL_ADDRESS ?? "localhost:7233",
    tls,
    apiKey
  };
}
