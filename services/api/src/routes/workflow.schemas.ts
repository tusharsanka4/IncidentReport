export const incidentParametersSchema = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", minLength: 1, maxLength: 200, pattern: "\\S" }
  }
} as const;

export function decisionBodySchema(
  identityField: "approved_by" | "rejected_by"
) {
  return {
    type: "object",
    additionalProperties: false,
    required: [identityField],
    properties: {
      [identityField]: {
        type: "string",
        minLength: 1,
        maxLength: 200,
        pattern: "\\S"
      },
      comment: { type: "string", maxLength: 2000 }
    }
  };
}
