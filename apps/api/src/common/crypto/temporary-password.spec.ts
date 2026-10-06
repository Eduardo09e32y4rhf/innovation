import { generateTemporaryPassword } from './temporary-password';

describe('senha provisoria', () => {
  it('tem 6 caracteres com maiuscula, minuscula e numero, sem caracteres ambiguos', () => {
    for (let i = 0; i < 300; i++) {
      const password = generateTemporaryPassword();
      expect(password).toHaveLength(6);
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/\d/);
      expect(password).not.toMatch(/[0OIl1]/);
    }
  });

  it('nao repete sempre o mesmo valor', () => {
    expect(new Set(Array.from({ length: 50 }, generateTemporaryPassword)).size).toBeGreaterThan(40);
  });
});
