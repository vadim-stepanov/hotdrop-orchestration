import "./tracing";
import "./load-env";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { GrpcOptions, Transport } from "@nestjs/microservices";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { configureApp } from "./app.setup";
import { AppConfigService } from "./config/config.service";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  configureApp(app);

  const config = app.get(AppConfigService);

  // gRPC server for the gateway's ratings + support calls.
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
    .setTitle("HotDrop — ratings-service (internal)")
    .setDescription("Internal service API. The public contract is exposed by the gateway.")
    .setVersion("1.0")
    .build();
  SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, swaggerConfig));

  await app.startAllMicroservices();
  await app.listen(config.port);
  Logger.log(`ratings-service listening on http://localhost:${config.port}`, "Bootstrap");
}

void bootstrap();