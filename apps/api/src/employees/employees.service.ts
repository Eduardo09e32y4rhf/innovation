import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EmployeesService {
  private employees = [] as any[];

  findAll() {
    return this.employees;
  }

  findOne(id: string) {
    const e = this.employees.find((x) => x.id === id);
    if (!e) throw new NotFoundException('Employee not found');
    return e;
  }

  create(dto: CreateEmployeeDto) {
    const employee = { id: uuidv4(), ...dto, createdAt: new Date() };
    this.employees.push(employee);
    return employee;
  }

  update(id: string, dto: CreateEmployeeDto) {
    const idx = this.employees.findIndex((x) => x.id === id);
    if (idx === -1) throw new NotFoundException('Employee not found');
    this.employees[idx] = { ...this.employees[idx], ...dto, updatedAt: new Date() };
    return this.employees[idx];
  }

  remove(id: string) {
    const idx = this.employees.findIndex((x) => x.id === id);
    if (idx === -1) throw new NotFoundException('Employee not found');
    const removed = this.employees.splice(idx, 1);
    return { removed: removed[0] };
  }
}
