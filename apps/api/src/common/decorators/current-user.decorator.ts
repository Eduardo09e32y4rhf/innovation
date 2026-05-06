import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtUser } from '../types/auth.types';

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): JwtUser => {
  return ctx.switchToHttp().getRequest().user;
});
