import { condition, defineQuery, defineSignal, setHandler } from "@temporalio/workflow";

export async function dockerPersistenceWorkflow(): Promise<string> {
  let decision: string | undefined;
  setHandler(defineSignal<[string]>("approve"), value => { decision = value; });
  setHandler(defineQuery<string>("status"), () => decision ?? "AWAITING_APPROVAL");
  await condition(() => decision !== undefined);
  return decision!;
}
