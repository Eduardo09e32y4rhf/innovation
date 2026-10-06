type StageLike = { kind?: string | null };

/** RH - R&S conduz o processo seletivo, mas nao efetiva: a etapa "Contratado" nao e oferecida a ele (a API tambem recusa). */
export function selectableStages<T extends StageLike>(role: string | null | undefined, stages: T[]): T[] {
  return String(role ?? '').toUpperCase() === 'RH_RS' ? stages.filter((stage) => stage.kind !== 'HIRED') : stages;
}

export function canHire(role: string | null | undefined): boolean {
  return ['DEV', 'ADMIN', 'RH', 'GESTOR'].includes(String(role ?? '').toUpperCase());
}