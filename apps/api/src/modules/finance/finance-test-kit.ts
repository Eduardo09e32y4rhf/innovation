/** Utilitarios de teste (so specs): prisma em memoria com o minimo para os fluxos de webhook/conciliacao. */
export function matches(row: Record<string, any>, where: Record<string, any> = {}): boolean {
  return Object.entries(where).every(([key, cond]) => {
    if (key === 'OR') return (cond as any[]).some((w) => matches(row, w));
    if (key === 'AND') return (cond as any[]).every((w) => matches(row, w));
    const value = row[key];
    if (cond === null) return value === null || value === undefined;
    if (cond instanceof Date) return value instanceof Date && value.getTime() === cond.getTime();
    if (typeof cond === 'object') {
      if ('in' in cond && !cond.in.includes(value)) return false;
      if ('not' in cond && (cond.not instanceof Object ? false : value === cond.not)) return false;
      if ('lt' in cond && !(value !== null && value !== undefined && value < cond.lt)) return false;
      if ('gt' in cond && !(value > cond.gt)) return false;
      return true;
    }
    return value === cond;
  });
}
