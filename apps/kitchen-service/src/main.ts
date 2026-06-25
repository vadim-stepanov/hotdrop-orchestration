import "./tracing";
import "./load-env";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { GrpcOptions, MicroserviceOptions, Transport } from "@nestjs/microservices";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { HOTDROP_EXCHANGE, Queue } from "@hotdrop/contracts";
import { AppModule } from "./app.module";
import { configureApp } from "./app.setup";
import { AppConfigService } from "./config/config.service";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  configureApp(app);

  const config = app.get(AppConfigService);

  // Hybrid app: HTTP (health + gRPC reads later) + RMQ consumer of saga commands. Its
  // durable queue binds to the shared topic exchange by each @EventPattern routing key.
  app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.RMQ,
      options: {
        urls: [config.rabbitmqUrl],
        exchange: HOTDROP_EXCHANGE,
        exchangeType: "topic",
        wildcards: true,
        queue: Queue.KitchenCommands,
        queueOptions: { durable: true },
        noAck: false,
      },
    },
    { inheritAppConfig: true },
  );

  // gRPC server for the gateway's synchronous drop reads.
  app.connectMicroservice<GrpcOptions>({
    transport: Transport.GRPC,
    options: {
      package: "hotdrop",
      protoPath: require.resolve("@hotdrop/contracts/proto"),
      url: config.grpcUrl,
      loader: { keepCase: true },
    },
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle("HotDrop — kitchen-service (internal)")
    .setDescription("Internal service API. The public contract is exposed by the gateway.")
    .setVersion("1.0")
    .build();
  SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, swaggerConfig));

  await app.startAllMicroservices();
  await app.listen(config.port);
  Logger.log(`kitchen-service listening on http://localhost:${config.port}`, "Bootstrap");
}

void bootstrap();