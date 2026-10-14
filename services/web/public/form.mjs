export function incidentBody(fields) {
  // datetime-local may omit zero seconds. Interpret the UTC-labelled field
  // explicitly as UTC, then emit the complete ISO timestamp required by the API.
  const detectedAt = new Date(`${fields.detected_at}Z`);
  if (!Number.isFinite(detectedAt.getTime())) {
    throw new Error("Enter a valid detection date and time (UTC).");
  }

  return {
    incident_id: fields.incident_id.trim(),
    service: fields.service.trim(),
    environment: fields.environment,
    symptom: fields.symptom.trim(),
    detected_at: detectedAt.toISOString()
  };
}
