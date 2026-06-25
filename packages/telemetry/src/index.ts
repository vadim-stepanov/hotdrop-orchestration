import { context, propagation, ROOT_CONTEXT, trace } from "@opentelemetry/api";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

// Start OpenTelemetry tracing for a service. MUST be called before the instrumented
// libraries (http, grpc, amqplib, pg) are imported — services call it from the very first
// line of main.ts. Auto-instrumentation propagates context across gRPC and RabbitMQ, so a
// single saga is traceable across services in Jaeger.
let sdk: NodeSDK | undefined;

export function startTracing(serviceName: string): void {
  if (sdk) {
    return;
  }
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318";
  sdk = new NodeSDK({
    resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: serviceName }),
    traceExporter: new OTLPTraceExporter({ url: `${endpoint}/v1/traces` }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // fs spans are noise for this workload.
        "@opentelemetry/instrumentation-fs": { enabled: false },
      }),
    ],
  });
  sdk.start();

  const shutdown = (): void => {
    void sdk?.shutdown();
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}

// Continue a trace carried over an async hop: extract the W3C traceparent stored in
// the message, open a child span for the saga step, and run the handler within it — so the
// step's DB spans and any outbox messages it writes stay part of the originating trace.
export async function runWithTraceparent<T>(
  traceparent: string | undefined,
  spanName: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (!traceparent) {
    return fn();
  }
  const parent = propagation.extract(ROOT_CONTEXT, { traceparent });
  const span = trace.getTracer("hotdrop-saga").startSpan(spanName, undefined, parent);
  try {
    return await context.with(trace.setSpan(parent, span), fn);
  } finally {
    span.end();
  }
}
