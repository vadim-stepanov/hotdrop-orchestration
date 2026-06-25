import "./tracing";
import "./load-env";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { HOTDROP_EXCHANGE, Queue } from "@hotdrop/contracts";
import { AppModule } from "./app.module";
import { configureApp } from "./app.setup";
import { AppConfigService } from "./config/config.service";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  configureApp(app);

  const config = app.get(AppConfigService);

  // RMQ consumer feeding the WebSocket tracking gateway: order status changes arrive here
  // and are pushed to subscribed clients. (socket.io shares the HTTP server / port.)
  app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.RMQ,
      options: {
        urls: [config.rabbitmqUrl],
        exchange: HOTDROP_EXCHANGE,
        exchangeType: "topic",
        wildcards: true,
        queue: Queue.GatewayTracking,
        queueOptions: { durable: true },
        noAck: false,
      },
    },
    { inheritAppConfig: true },
  );

  // The PUBLIC contract Swagger (frozen here). The contract test diffs this /docs-json
  // against docs/openapi.json.
  const swaggerConfig = new DocumentBuilder()
    .setTitle("HotDrop API")
    .setDescription("HotDrop — Orchestration Saga. The canonical REST contract (frozen here).")
    .setVersion("1.0")
    .addBearerAuth({ type: "http", scheme: "bearer", description: "Emulated auth token." })
    .addApiKey({ type: "apiKey", name: "X-User-Id", in: "header" }, "X-User-Id")
    .build();
  SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, swaggerConfig));

  await app.startAllMicroservices();
  await app.listen(config.port);
  Logger.log(`gateway listening on http://localhost:${config.port}`, "Bootstrap");
}

void bootstrap();