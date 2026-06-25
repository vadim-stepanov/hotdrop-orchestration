import {
  BadRequestException,
  ConflictException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { status as GrpcStatus } from "@grpc/grpc-js";
import { firstValueFrom } from "rxjs";
import type { Observable } from "rxjs";

// Map an upstream gRPC error to the contract HTTP error shape at the gateway boundary.
export function mapGrpcError(error: unknown): HttpException {
  const e = error as { code?: number; details?: string; message?: string };
  const message = e.details ?? e.message ?? "upstream service error";
  switch (e.code) {
    case GrpcStatus.NOT_FOUND:
      return new NotFoundException(message);
    case GrpcStatus.FAILED_PRECONDITION:
      return new ConflictException(message);
    case GrpcStatus.INVALID_ARGUMENT:
      return new BadRequestException(message);
    default:
      return new InternalServerErrorException(message);
  }
}

export function fromGrpc<T>(obs: Observable<T>): Promise<T> {
  return firstValueFrom(obs).catch((error) => {
    throw mapGrpcError(error);
  });
}
