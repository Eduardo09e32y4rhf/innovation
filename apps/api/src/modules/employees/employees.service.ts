import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import type { JwtUser, UserRole } from '../../common/types/auth.types';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesRepository } from './employees.repository';
import { AsoService } from '../management/aso.service';
import { assertRoleChangeAllowed, canManageRole } from '../../common/constants/role-hierarchy';
import { isOwnerTargetedByOther } from '../../common/constants/platform-owner';

const EMPLOYEE_ACCESS_ROLES: UserRole[] = ['FUNCIONARIO', 'GESTOR', 'RH', 'ADMIN', 'CONSULTA'];

@Injectable()
export class EmployeesService {
  constructor(private readonly repository: EmployeesRepository, private readonly asoService: AsoService) {}

  async list(companyId: string, actor: JwtUser, page: number = 1, pageSize: number = 50, search?: string, status?: string) {
    const skip = Math.max(0, (page - 1) * pageSize);

    if (actor.role === 'ADMIN' || actor.role === 'RH' || actor.role === 'DEV' || actor.role === 'CONSULTA') {
      const employees = await this.repository.list(companyId, skip, pageSize, search, status);
      return employees.filter((employee: any) => this.canAccessEmployee(actor, employee));
    }
    if (actor.role === 'GESTOR') {
      const managerEmployee = await this.repository.findByUserId(companyId, actor.sub, actor.email);
      if (!managerEmployee || !this.canAccessEmployee(actor, managerEmployee)) return [];
      const team = await this.repository.listByManager(companyId, managerEmployee.id, skip, pageSize, search, status);
      return [managerEmployee, ...team.filter((employee: any) => employee.id !== managerEmployee.id && this.canAccessEmployee(actor, employee))];
    }
    if (actor.role === 'FUNCIONARIO') {
      const employee = await this.repository.findByUserId(companyId, actor.sub, actor.email);
      return employee && this.canAccessEmployee(actor, employee) ? [employee] : [];
    }
    return [];
  }

  async listSwapCandidates(companyId: string, actor: JwtUser) {
    const me = await this.repository.findByUserId(companyId, actor.sub, actor.email);
    if (!me) return [];

    let roleFilter: any = {};
    if (['ADMIN', 'RH', 'DEV'].includes(actor.role)) {
       roleFilter = { status: 'ACTIVE' };
    } else {
       roleFilter = { status: 'ACTIVE', position: me.position };
    }
    
    return this.repository.listSwapCandidates(companyId, roleFilter);
  }

  async get(companyId: string, actor: JwtUser, id: string) {
    const employee = await this.repository.findById(companyId, id);
    if (!this.canAccessEmployee(actor, employee) || !(await this.canViewRecord(companyId, actor, employee))) throw new NotFoundException('Employee not found');
    return employee;
  }

  /**
   * Escopo de leitura de uma ficha: RH/ADMIN/DEV/CONSULTA veem a empresa; GESTOR vê a si e a sua equipe; FUNCIONARIO só a própria.
   * Qualquer outro perfil (ex.: CEO) não lê fichas individuais. Sempre responde 404 para não revelar existência.
   */
  private async canViewRecord(companyId: string, actor: JwtUser, employee: { id?: string; userId?: string | null; managerId?: string | null } | null | undefined) {
    if (!employee) return false;
    if (['DEV', 'ADMIN', 'RH', 'CONSULTA'].includes(actor.role)) return true;
    const mine = await this.repository.findByUserId(companyId, actor.sub, actor.email);
    if (!mine) return false;
    if (actor.role === 'FUNCIONARIO') return mine.id === employee.id;
    if (actor.role === 'GESTOR') return mine.id === employee.id || employee.managerId === mine.id;
    return false;
  }

  async dossier(companyId: string, actor: JwtUser, id: string) {
    const employee = await this.repository.findById(companyId, id);
    if (!this.canAccessEmployee(actor, employee) || !(await this.canViewRecord(companyId, actor, employee))) throw new NotFoundException('Employee not found');
    const dossier = await this.repository.getDossier(companyId, id);
    if (!dossier) throw new NotFoundException('Employee not found');
    return dossier;
  }

  async create(companyId: string, dto: CreateEmployeeDto) {
    if (dto.cpf) {
      const existing = await this.repository.findByCpf(dto.cpf);
      if (existing) throw new ConflictException('CPF already registered');
    }
    await this.ensureRegistrationAvailable(companyId, dto.registration);
    
    const employee = await this.repository.create(companyId, this.toData(dto));
    
    // Automação: Gera ASO Admissional pendente
    await this.asoService.create(companyId, undefined, {
      employeeId: employee.id,
      asoType: 'ADMISSIONAL',
      status: 'PENDING'
    });

    await this.syncPanelAccess(companyId, employee, dto);
    return this.repository.findById(companyId, employee.id);
  }

  async update(companyId: string, actor: JwtUser, id: string, dto: UpdateEmployeeDto) {
    await this.get(companyId, actor, id);
    if (dto.cpf) {
      const existing = await this.repository.findByCpf(dto.cpf);
      if (existing && existing.id !== id) throw new ConflictException('CPF already registered');
    }
    await this.ensureRegistrationAvailable(companyId, dto.registration, id);
    
    const result = await this.repository.update(companyId, id, this.toData(dto));
    if (!result.count) throw new NotFoundException('Employee not found');
    const employee = await this.get(companyId, actor, id);
    
    // Se o status mudou para INATIVO/TERMINATED
    if (dto.status === 'TERMINATED' && employee?.status === 'TERMINATED') {
      const latestAso = await this.asoService.getLatestByEmployee(companyId, id);
      if (!latestAso || latestAso.asoType !== 'DEMISSIONAL') {
        await this.asoService.create(companyId, actor.sub, {
          employeeId: id,
          asoType: 'DEMISSIONAL',
          status: 'PENDING'
        });
      }
    }

    await this.syncPanelAccess(companyId, employee, dto);
    return this.get(companyId, actor, id);
  }

  async terminate(companyId: string, actor: JwtUser, id: string) {
    await this.get(companyId, actor, id);
    const result = await this.repository.update(companyId, id, { status: 'TERMINATED' });
    if (!result.count) throw new NotFoundException('Employee not found');

    // Automação: Gera ASO Demissional pendente
    await this.asoService.create(companyId, actor.sub, {
      employeeId: id,
      asoType: 'DEMISSIONAL',
      status: 'PENDING'
    });

    const employee = await this.get(companyId, actor, id);
    if (employee?.userId) {
      await this.repository.updateUser(companyId, employee.userId, {
        isActive: false,
        forcePasswordChange: true,
      });
    }

    return employee;
  }

  async createAccess(companyId: string, actor: JwtUser, employeeId: string, dto: { email: string; role?: string; name?: string }) {
    assertRoleChangeAllowed(actor.role, dto.role);

    const employee = await this.get(companyId, actor, employeeId);
    if (!employee) throw new NotFoundException('Employee not found');

    const email = dto.email.trim().toLowerCase();
    const role = this.resolveAccessRole(dto.role);

    if (!canManageRole(actor.role, role)) {
      throw new ForbiddenException(`${actor.role} não pode criar usuários com papel ${role}`);
    }

    const existingUser = await this.repository.findUserByEmail(email);
    if (existingUser && existingUser.companyId !== companyId) throw new ConflictException('E-mail already registered in another company');

    let temporaryPassword: string | null = null;

    if (existingUser) {
      const linkedEmployee = await this.repository.findByUserId(companyId, existingUser.id);
      if (linkedEmployee && linkedEmployee.id !== employee.id) throw new ConflictException('User already linked to another employee');

      await this.repository.updateUser(companyId, existingUser.id, {
        name: dto.name ?? employee.name,
        email,
        role,
        isActive: true,
      });
      if (employee.userId !== existingUser.id) {
        await this.repository.updateUserLink(companyId, employeeId, existingUser.id);
      }
    } else {
      const [count, limits] = await Promise.all([
        this.repository.countByCompany(companyId),
        this.repository.getCompanyLimits(companyId),
      ]);
      const contractedSeats = limits?.subscription?.seatQuantity ?? 1;
      if (count >= contractedSeats) {
        throw new ConflictException('SEAT_LIMIT_REACHED: Limite de licenças atingido para a empresa');
      }

      temporaryPassword = this.generateTemporaryPassword();
      const user = await this.repository.createUser({
        companyId,
        name: dto.name ?? employee.name,
        email,
        role,
        passwordHash: await bcrypt.hash(temporaryPassword, 12),
        forcePasswordChange: true,
        isActive: true,
        temporaryPassword: {
          value: temporaryPassword,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      await this.repository.updateUserLink(companyId, employeeId, user.id);

      await this.repository.createAuditLog({
        companyId,
        userId: actor.sub,
        action: 'USER_CREATED',
        entity: 'User',
        entityId: user.id,
        metadata: {
          name: user.name,
          email: user.email,
          role: user.role,
          employeeLinked: employeeId,
        },
      });
    }

    return {
      success: true,
      userId: employee.userId || existingUser?.id,
      temporaryPassword,
      email,
      role,
    };
  }

  async linkAccess(companyId: string, actor: JwtUser, employeeId: string, userId: string) {
    const employee = await this.get(companyId, actor, employeeId);
    if (!employee) throw new NotFoundException('Employee not found');

    const existingUser = await this.repository.findUserById(companyId, userId);
    if (!existingUser) throw new NotFoundException('User not found');

    const linkedEmployee = await this.repository.findByUserId(companyId, userId);
    if (linkedEmployee && linkedEmployee.id !== employeeId) throw new ConflictException('User already linked to another employee');

    await this.repository.updateUserLink(companyId, employeeId, userId);
    return { success: true, employeeId, userId };
  }

  async unlinkAccess(companyId: string, actor: JwtUser, employeeId: string) {
    const employee = await this.get(companyId, actor, employeeId);
    if (!employee) throw new NotFoundException('Employee not found');
    if (!employee.userId) throw new ConflictException('Employee has no linked user');

    await this.repository.updateUserLink(companyId, employeeId, null);
    await this.repository.updateUser(companyId, employee.userId, { isActive: false });
    return { success: true, employeeId };
  }

  async bulkAccess(companyId: string, actor: JwtUser, dto: { employeeIds: string[]; action: string; role?: string }) {
    assertRoleChangeAllowed(actor.role, dto.role);
    const results: any[] = [];

    for (const employeeId of dto.employeeIds) {
      try {
        const employee = await this.repository.findById(companyId, employeeId);
        if (!employee) {
          results.push({ employeeId, success: false, error: 'Employee not found' });
          continue;
        }

        switch (dto.action) {
          case 'create':
            if (!employee.email) {
              results.push({ employeeId, success: false, error: 'Employee has no email' });
              break;
            }
            try {
              const createResult = await this.createAccess(companyId, actor, employeeId, {
                email: employee.email,
                role: dto.role,
                name: employee.name,
              });
              results.push({ employeeId, success: true, temporaryPassword: createResult.temporaryPassword, role: createResult.role });
            } catch (error: any) {
              results.push({ employeeId, success: false, error: error.message });
            }
            break;

          case 'block':
          case 'unblock':
          case 'reset-password': {
            const denied = await this.assertCanActOnLinkedUser(companyId, actor, employee);
            if (denied) {
              results.push({ employeeId, success: false, error: denied });
              break;
            }
            if (dto.action === 'reset-password') {
              const newPassword = this.generateTemporaryPassword();
              const user = await this.repository.findUserById(companyId, employee.userId!);
              const reset = await this.repository.reissueTemporaryPassword(companyId, employee.userId!, {
                passwordHash: await bcrypt.hash(newPassword, 12),
                previousPasswords: [user!.passwordHash, ...(user!.previousPasswords ?? [])].slice(0, 10),
                forcePasswordChange: true,
                passwordChangedAt: new Date(),
                failedLoginAttempts: 0,
              }, newPassword, new Date(Date.now() + 24 * 60 * 60 * 1000));
              results.push(reset.count ? { employeeId, success: true, temporaryPassword: newPassword } : { employeeId, success: false, error: 'Usuario nao encontrado' });
              break;
            }
            const changed = await this.repository.updateUser(companyId, employee.userId!, { isActive: dto.action === 'unblock' });
            results.push(changed.count ? { employeeId, success: true } : { employeeId, success: false, error: 'Usuario nao encontrado' });
            break;
          }
          case 'set-role': {
            const roleDenied = await this.assertCanActOnLinkedUser(companyId, actor, employee);
            if (roleDenied) {
              results.push({ employeeId, success: false, error: roleDenied });
              break;
            }
            const newRole = this.resolveAccessRole(dto.role);
            if (!canManageRole(actor.role, newRole)) {
              results.push({ employeeId, success: false, error: `${actor.role} não pode atribuir papel ${newRole}` });
              break;
            }
            await this.repository.updateUser(companyId, employee.userId!, { role: newRole });
            results.push({ employeeId, success: true, role: newRole });
            break;
          }

          default:
            results.push({ employeeId, success: false, error: 'Invalid action' });
        }
      } catch (error: any) {
        results.push({ employeeId, success: false, error: error.message });
      }
    }

    return results;
  }

  async delete(companyId: string, actor: JwtUser, id: string) {
    const employee = await this.get(companyId, actor, id);
    const deletionImpact = await this.repository.getDeletionImpact(companyId, id);

    if (deletionImpact.total > 0) {
      await this.repository.update(companyId, id, {
        status: 'TERMINATED',
        terminationDate: employee?.terminationDate ? undefined : this.todayInSaoPaulo(),
        observations: this.appendArchiveNote(employee?.observations, actor),
      });
      if (employee?.userId) {
        await this.repository.updateUser(companyId, employee.userId, {
          isActive: false,
          forcePasswordChange: true,
        });
      }
      return {
        deleted: false,
        archived: true,
        employeeId: id,
        message: 'Funcionario com historico foi arquivado com seguranca para preservar trilha operacional.',
        deletionImpact,
      };
    }

    if (employee?.userId) {
      await this.repository.updateUser(companyId, employee.userId, {
        isActive: false,
        forcePasswordChange: true,
      });
    }

    const result = await this.repository.delete(companyId, id);
    if (!result.count) throw new NotFoundException('Employee not found');
    return {
      deleted: true,
      archived: false,
      employeeId: id,
      message: 'Funcionario removido definitivamente porque nao possuia historico vinculado.',
      deletionImpact,
    };
  }

  private async ensureAdmissionAsoApto(companyId: string, dto: CreateEmployeeDto | UpdateEmployeeDto, currentEmployeeId?: string) {
    const employeeId = currentEmployeeId || (dto as any).id;
    if (!employeeId) return;
    
    const admissionAso = await this.asoService.getLatestByEmployee(companyId, employeeId);
    if (!admissionAso || admissionAso.asoType !== 'ADMISSIONAL' || (admissionAso as any).status !== 'COMPLETED') {
      throw new ForbiddenException('Funcionário não possui ASO admissional apto. Finalize o exame ocupacional antes de concluir a contratação.');
    }
  }

  private async ensureRegistrationAvailable(companyId: string, registration?: string | null, currentEmployeeId?: string) {
    const normalized = registration?.trim();
    if (!normalized) return;
    const existing = await this.repository.findByRegistration(companyId, normalized);
    if (existing && existing.id !== currentEmployeeId) throw new ConflictException('Matricula already registered');
  }

  private async syncPanelAccess(companyId: string, employee: any, dto: CreateEmployeeDto | UpdateEmployeeDto) {
    if (dto.accessEnabled === undefined) return;

    if (employee.status === 'ONBOARDING') {
      if (employee.userId) await this.repository.updateUser(companyId, employee.userId, { isActive: false });
      return;
    }

    if (dto.accessEnabled !== 'YES') {
      if (employee.userId) await this.repository.updateUser(companyId, employee.userId, { isActive: false });
      return;
    }

    const role = this.resolveAccessRole(dto.accessProfile);
    const email = (dto.email ?? employee.email)?.trim().toLowerCase();
    if (!email) throw new ConflictException('E-mail obrigatorio para acesso ao painel');

    const existingUser = await this.repository.findUserByEmail(email);
    if (existingUser && existingUser.companyId !== companyId) throw new ConflictException('E-mail already registered in another company');
    if (existingUser) {
      const linkedEmployee = await this.repository.findByUserId(companyId, existingUser.id);
      if (linkedEmployee && linkedEmployee.id !== employee.id) throw new ConflictException('User already linked to another employee');
      await this.repository.updateUser(companyId, existingUser.id, {
        name: dto.name ?? employee.name,
        email,
        role,
        isActive: true,
      });
      if (employee.userId !== existingUser.id) await this.repository.updateUserLink(companyId, employee.id, existingUser.id);
      return;
    }

    const temporaryPassword = this.generateTemporaryPassword();

    const user = await this.repository.createUser({
      companyId,
      name: dto.name ?? employee.name,
      email,
      role,
      passwordHash: await bcrypt.hash(temporaryPassword, 12),
      forcePasswordChange: true,
      isActive: true,
      temporaryPassword: {
        value: temporaryPassword,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    await this.repository.updateUserLink(companyId, employee.id, user.id);
  }

  /**
   * Autorizacao por item das acoes em lote sobre o acesso vinculado: precisa haver usuario,
   * ele nao pode ser o proprio ator, nem o dono da plataforma, e o perfil do ator precisa poder gerir o dele.
   * Devolve a mensagem de recusa (ou null quando permitido).
   */
  private async assertCanActOnLinkedUser(companyId: string, actor: JwtUser, employee: { userId?: string | null }): Promise<string | null> {
    if (!employee.userId) return 'Funcionario sem usuario vinculado';
    if (employee.userId === actor.sub) return 'Nao e permitido executar esta acao sobre o proprio acesso';
    const user = await this.repository.findUserById(companyId, employee.userId);
    if (!user) return 'Usuario nao encontrado';
    if (isOwnerTargetedByOther(actor, user)) return 'O dono da plataforma nao pode ser alterado por outro usuario';
    if (!canManageRole(actor.role, user.role)) return 'Seu perfil nao pode gerir o acesso deste usuario';
    return null;
  }

  private generateTemporaryPassword() {
    // Nunca reutilizar senha de ambiente: cada provisionamento recebe um segredo distinto.
    return `Aa1!${randomBytes(18).toString('hex')}`;
  }


  private canAccessEmployee(actor: JwtUser, employee?: { user?: { role?: string } | null } | null) {
    if (!employee) return false;
    if (actor.role === 'DEV') return true;
    return String(employee.user?.role || '').toUpperCase() !== 'DEV';
  }
  private resolveAccessRole(role?: string): UserRole {
    if (role && EMPLOYEE_ACCESS_ROLES.includes(role as UserRole)) return role as UserRole;
    return 'FUNCIONARIO';
  }

  private toData(dto: CreateEmployeeDto | UpdateEmployeeDto) {
    const { accessEnabled, accessProfile, firstJob, reservista, ...employeeData } = dto as any;
    const status = dto.status ?? 'ACTIVE';
    return {
      ...employeeData,
      name: this.emptyToUndefined(dto.name) ?? 'Funcionario sem nome',
      position: this.emptyToUndefined(dto.position) ?? 'A definir',
      department: this.emptyToUndefined(dto.department) ?? 'A definir',
      phone: this.emptyToUndefined(dto.phone),
      rg: this.emptyToUndefined(dto.rg),
      rgIssuer: this.emptyToUndefined(dto.rgIssuer),
      rgState: this.emptyToUndefined(dto.rgState),
      cep: this.emptyToUndefined(dto.cep),
      street: this.emptyToUndefined(dto.street),
      streetNumber: this.emptyToUndefined(dto.streetNumber),
      addressComplement: this.emptyToUndefined(dto.addressComplement),
      neighborhood: this.emptyToUndefined(dto.neighborhood),
      city: this.emptyToUndefined(dto.city),
      state: this.emptyToUndefined(dto.state),
      secondaryPhone: this.emptyToUndefined(dto.secondaryPhone),
      maritalStatus: this.emptyToUndefined(dto.maritalStatus),
      nationality: this.emptyToUndefined(dto.nationality),
      birthplace: this.emptyToUndefined(dto.birthplace),
      observations: this.emptyToUndefined(dto.observations),
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      registration: this.emptyToUndefined(dto.registration),
      managerId: this.emptyToUndefined(dto.managerId),
      admissionDate: dto.admissionDate ? new Date(dto.admissionDate) : this.todayInSaoPaulo(),
      terminationDate: status === 'ACTIVE' ? undefined : (dto.terminationDate ? new Date(dto.terminationDate) : undefined),
      salary: dto.salary !== undefined ? String(dto.salary) : undefined,
      contractType: this.emptyToUndefined(dto.contractType),
      cnpj: this.emptyToUndefined(dto.cnpj),
      legalName: this.emptyToUndefined(dto.legalName),
      tradeName: this.emptyToUndefined(dto.tradeName),
      unit: this.emptyToUndefined(dto.unit),
      workScale: this.emptyToUndefined(dto.workScale),
      customWorkScale: this.emptyToUndefined(dto.customWorkScale),
      dailyWorkload: this.emptyToUndefined(dto.dailyWorkload),
      standardEntry: this.emptyToUndefined(dto.standardEntry),
      standardLunchStart: this.emptyToUndefined(dto.standardLunchStart),
      standardLunchReturn: this.emptyToUndefined(dto.standardLunchReturn),
      standardExit: this.emptyToUndefined(dto.standardExit),
      status,
      // eSocial fields
      pis: this.emptyToUndefined(dto.pis),
      pisFirstJob: dto.firstJob ?? dto.pisFirstJob,
      gender: this.emptyToUndefined(dto.gender),
      education: this.emptyToUndefined(dto.education),
      motherName: this.emptyToUndefined(dto.motherName),
      fatherName: this.emptyToUndefined(dto.fatherName),
      voterTitle: this.emptyToUndefined(dto.voterTitle),
      voterZone: this.emptyToUndefined(dto.voterZone),
      voterSection: this.emptyToUndefined(dto.voterSection),
      voterState: this.emptyToUndefined(dto.voterState),
      rgIssueDate: dto.rgIssueDate ? new Date(dto.rgIssueDate) : undefined,
      reservist: this.emptyToUndefined(dto.reservista),
      cnh: this.emptyToUndefined(dto.cnh),
      cnhCategory: this.emptyToUndefined(dto.cnhCategory),
      cnhExpiry: dto.cnhExpiry ? new Date(dto.cnhExpiry) : undefined,
      bankCode: this.emptyToUndefined(dto.bankCode),
      bankName: this.emptyToUndefined(dto.bankName),
      bankAgency: this.emptyToUndefined(dto.bankAgency),
      bankAccount: this.emptyToUndefined(dto.bankAccount),
      bankAccountType: this.emptyToUndefined(dto.bankAccountType),
      dependents: this.parseDependents(dto.dependents),
    };
  }

  private parseDependents(value?: string | null) {
    const normalized = this.emptyToUndefined(value);
    if (!normalized) return undefined;
    try {
      return JSON.parse(normalized);
    } catch {
      throw new BadRequestException('Dependentes deve ser um JSON valido.');
    }
  }

  private todayInSaoPaulo() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const value = (type: string) => parts.find((part) => part.type === type)?.value;
    return new Date(`${value('year')}-${value('month')}-${value('day')}T00:00:00.000Z`);
  }

  private appendArchiveNote(observations: string | null | undefined, actor: JwtUser) {
    const note = `[${new Date().toISOString()}] Cadastro arquivado pelo usuario ${actor.email || actor.sub} para preservar historico do colaborador.`;
    return observations?.trim() ? `${observations}\n${note}` : note;
  }

  private emptyToUndefined(value?: string | null) {
    return value?.trim() || undefined;
  }
}

