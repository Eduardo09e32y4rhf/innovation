import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { UpdateApplicationStatusDto } from '../../apps/api/src/modules/jobs/dto/hire-candidate.dto';

describe('Jobs workflow security', () => {
  it('forbids bypassing admission by moving directly to HIRED through PATCH', async () => {
    const dto = plainToInstance(UpdateApplicationStatusDto, { status: 'HIRED' });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('accepts normal funnel transitions before admission', async () => {
    for (const status of ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'REJECTED']) {
      const dto = plainToInstance(UpdateApplicationStatusDto, { status });
      expect(await validate(dto)).toHaveLength(0);
    }
  });
});
