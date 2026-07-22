const test = require('node:test');
const assert = require('node:assert/strict');
const { PricingService } = require('../dist/modules/finance/pricing.service.js');

const pricing = new PricingService();

test('calcula preços oficiais para dez usuários', () => {
  const expected = new Map([
    [1, 279.99],
    [3, 802.47],
    [6, 1559.94],
    [12, 3059.89],
  ]);
  for (const [months, total] of expected) {
    const quote = pricing.calculate(months, 10);
    assert.equal(quote.total, total);
    assert.equal(quote.totalCents, Math.round(total * 100));
    assert.equal(quote.seatQuantity, 10);
  }
});

test('desconto incide somente sobre a base', () => {
  const quote = pricing.calculate(3, 10);
  assert.equal(quote.baseGrossCents, 74997);
  assert.equal(quote.baseDiscountCents, 3750);
  assert.equal(quote.baseNetCents, 71247);
  assert.equal(quote.seatAmountCents, 9000);
});

test('rejeita quantidade de licenças inválida', () => {
  assert.throws(() => pricing.calculate(1, 0));
  assert.throws(() => pricing.calculate(1, 1.5));
});


test('valida CPF e CNPJ com dígitos verificadores', () => {
  const { AuthService } = require('../dist/modules/auth/auth.service.js');
  const auth = new AuthService({}, {}, {}, {}, {});
  assert.doesNotThrow(() => auth.assertValidDocument('52998224725'));
  assert.doesNotThrow(() => auth.assertValidDocument('11222333000181'));
  assert.throws(() => auth.assertValidDocument('11111111111'));
  assert.throws(() => auth.assertValidDocument('11222333000182'));
});
