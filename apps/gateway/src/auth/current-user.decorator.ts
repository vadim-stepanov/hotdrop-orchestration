import { createParamDecorator, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";

// Emulated auth: identity is the X-User-Id header. No passwords/OTP —
// the header is the customer id the gateway propagates downstream.
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<Request>();
  const header = request.headers["x-user-id"];
  const userId = Array.isArray(header) ? header[0] : header;
  if (!userId || userId.length === 0) {
    throw new UnauthorizedException("X-User-Id header is required");
  }
  return userId;
});
