export function createToolResponse(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data)
      }
    ]
  };
}

export function createToolError(
  code: string,
  message: string
) {
  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          error: {
            code,
            message
          }
        })
      }
    ]
  };
}