# Nexus TypeScript SDK

[![CI](https://github.com/nexus-rpc/sdk-typescript/actions/workflows/ci.yml/badge.svg)](https://github.com/nexus-rpc/sdk-typescript/actions/workflows/ci.yml)
[![API Docs](https://img.shields.io/badge/API_docs-blue)](https://nexus-rpc.github.io/sdk-typescript/)

**This SDK is currently at an experimental release stage. Backwards-incompatible changes are anticipated until a stable release is announced.**

TypeScript SDK for working with [Nexus RPC](https://github.com/nexus-rpc/api). See
[API documentation](https://nexus-rpc.github.io/sdk-typescript/).

## What is Nexus?

Nexus is a synchronous RPC protocol. Arbitrary duration operations are modeled on top of a set of pre-defined
synchronous RPCs.

A Nexus caller calls a handler. The handler may respond inline (synchronous response) or return a token referencing the
ongoing operation (asynchronous response). The caller can cancel an asynchronous operation, check for its outcome, or
fetch its current state. The caller can also specify a callback URL, which the handler uses to deliver the result of an
asynchronous operation when it is ready.

This SDK provides the core primitives for defining and implementing Nexus services in TypeScript.

## Protocol Implementations

- [Temporal](https://docs.temporal.io/nexus) — builds on this SDK to provide a full implementation of the Nexus protocol, backed by Durable Execution.

## Installation

```shell
npm install nexus-rpc
```

## Usage

### Define a Service

Use the `service` and `operation` helpers to define a typed service contract. Operations are generic in their input and
output types.

```typescript
import { service, operation } from "nexus-rpc";

interface MyInput {
  name: string;
}

interface MyOutput {
  greeting: string;
}

const myService = service("my-service", {
  sayHello: operation<MyInput, MyOutput>(),
});
```

### Implement a Sync Operation

A sync operation handler is a function that receives a context and an input, and returns the output directly.

```typescript
import { serviceHandler } from "nexus-rpc";

const handler = serviceHandler(myService, {
  async sayHello(ctx, input) {
    return { greeting: `Hello, ${input.name}!` };
  },
});
```

### Implement an Async Operation

For operations that may take an arbitrary amount of time, return a `HandlerStartOperationResult.async` with a token
that can be used to track, cancel, or deliver the result of the operation later.

```typescript
import { HandlerStartOperationResult, serviceHandler } from "nexus-rpc";

const handler = serviceHandler(myService, {
  sayHello: {
    async start(ctx, input) {
      const token = await startBackgroundWork(input);
      return HandlerStartOperationResult.async(token);
    },
    async cancel(ctx, token) {
      await cancelBackgroundWork(token);
    },
  },
});
```

### Resolve an Operation as Failed

Throw an `OperationError` from a start handler to indicate that the operation completed unsuccessfully.

```typescript
import { OperationError } from "nexus-rpc";

// Failed operation
throw new OperationError("failed", "Not enough inventory");

// Canceled operation
throw new OperationError("canceled", "User canceled the operation");
```

### Fail a Handler Request

Throw a `HandlerError` to fail a request with a specific error type. Returning an unrecognized error from any handler
method will result in a generic internal server error response.

```typescript
import { HandlerError } from "nexus-rpc";

// Bad request
throw new HandlerError("BAD_REQUEST", "Invalid input");

// Retryable internal error
throw new HandlerError("INTERNAL", "Database unavailable", {
  retryableOverride: true,
});
```

## Contributing

### Prerequisites

- [Node.js >= 20](https://nodejs.org/)

### Build

```shell
pnpm install --frozen-lockfile
pnpm run build
```

### Test

```shell
pnpm test
```

### Lint

```shell
pnpm run lint
```

### Format

```shell
pnpm run format
```
