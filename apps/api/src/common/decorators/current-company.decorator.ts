import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentCompany = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  return ctx.switchToHttp().getRequest().user?.companyId;
});
