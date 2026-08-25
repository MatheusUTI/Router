import assert from 'node:assert/strict';
import { buildPayload455, formatToDdmmyy } from '../../server/ssw/gateways/ssw455RequestGateway';

/**
 * Fixture de referência exata do payload padrão gerado pelo SSWTools para o relatório 455.
 */
const EXPECTED_SSWTOOLS_DEFAULT_KEYS = [
  'act',
  'cod_emp_ctb',
  'f2',
  'f3',
  'reg_tipo',
  'f4',
  'f5',
  'f7',
  'f8',
  'f9',
  'f10',
  'f11',
  'f12',
  'f13',
  'f14',
  'f15',
  'f16',
  'f18',
  'f19',
  'f20',
  'f21',
  'f22',
  'f23',
  'f25',
  'f26',
  'f27',
  'f28',
  'ibscbs',
  'f29',
  'f30',
  'f32',
  'f34',
  'f35',
  'f37',
  'f38',
  'f39',
  'basico',
  'dummy'
];

const EXPECTED_DEFAULT_VALUES: Record<string, string> = {
  act: 'E1',
  cod_emp_ctb: '00',
  f2: 'VGA',
  f3: 'A',
  reg_tipo: 'E',
  f4: '',
  f5: 'R',
  f7: '',
  f8: 'T',
  f9: '',
  f10: '',
  f11: '240826',
  f12: '240826',
  f13: '',
  f14: '',
  f15: '',
  f16: '',
  f18: 'T',
  f19: 'T',
  f20: 'S',
  f21: 'X',
  f22: 'p',
  f23: 'A',
  f25: 'T',
  f26: 'A',
  f27: 'A',
  f28: 'T',
  ibscbs: 'A',
  f29: 'A',
  f30: 'A',
  f32: '',
  f34: '',
  f35: 'e',
  f37: 'B',
  f38: '',
  f39: '',
  basico: 'N'
};

async function runPayload455ComparisonTests() {
  console.log('--- Iniciando Testes Rigorosos de Comparação de Payload SSW-455 com SSWTools ---');

  // 1. Geração com parâmetros padrão (sem especificar tipo_periodo)
  const generatedPayload = buildPayload455({
    unid: 'VGA',
    startDate: '2026-08-24',
    endDate: '2026-08-24'
  });

  const generatedKeys = Object.keys(generatedPayload);

  // 1.1 Verificar ausência de chaves extras
  for (const key of generatedKeys) {
    assert.ok(
      EXPECTED_SSWTOOLS_DEFAULT_KEYS.includes(key),
      `Chave extra inesperada encontrada no payload: '${key}'`
    );
  }

  // 1.2 Verificar que nenhuma chave obrigatória está faltando
  for (const key of EXPECTED_SSWTOOLS_DEFAULT_KEYS) {
    assert.ok(
      key in generatedPayload,
      `Chave obrigatória ausente no payload: '${key}'`
    );
  }

  assert.equal(
    generatedKeys.length,
    EXPECTED_SSWTOOLS_DEFAULT_KEYS.length,
    `Quantidade de chaves diverge! Esperado: ${EXPECTED_SSWTOOLS_DEFAULT_KEYS.length}, Obtido: ${generatedKeys.length}`
  );

  // 1.3 Verificar valores padrão campo a campo
  for (const [key, expectedValue] of Object.entries(EXPECTED_DEFAULT_VALUES)) {
    assert.strictEqual(
      generatedPayload[key],
      expectedValue,
      `Valor do campo '${key}' difere do padrão SSWTools! Esperado: '${expectedValue}', Obtido: '${generatedPayload[key]}'`
    );
  }

  // 1.4 Verificação específica de cases e defaults críticos
  console.log('1. Testando defaults críticos e sensibilidade a maiúsculas/minúsculas...');
  assert.strictEqual(generatedPayload.f22, 'p', 'O campo f22 (entrega) DEVE ser exatamente "p" minúsculo');
  assert.strictEqual(generatedPayload.f35, 'e', 'O campo f35 (arquivo) DEVE ser exatamente "e" minúsculo');
  assert.strictEqual(generatedPayload.f37, 'B', 'O campo f37 (dados complementares) DEVE ser exatamente "B" maiúsculo');
  assert.strictEqual(generatedPayload.basico, 'N', 'O campo basico DEVE ser "N"');
  assert.strictEqual(generatedPayload.ibscbs, 'A', 'O campo ibscbs DEVE ser "A"');
  assert.strictEqual(generatedPayload.reg_tipo, 'E', 'O campo reg_tipo DEVE ser "E"');
  assert.strictEqual(generatedPayload.cod_emp_ctb, '00', 'O campo cod_emp_ctb DEVE ser "00"');
  assert.ok(/^\d+$/.test(generatedPayload.dummy), 'O campo dummy deve ser um timestamp numérico');
  console.log('   ✓ Defaults críticos (f22="p", f35="e", f37="B", etc.) validados com sucesso.');

  // 2. Testar que o período padrão é AUTORIZAÇÃO (f11/f12 preenchidos, f9/f10/f13/f14/f15/f16 vazios)
  console.log('2. Testando isolamento do par de datas para período padrão (autorização)...');
  assert.strictEqual(generatedPayload.f11, '240826', 'f11 deve conter a data inicial');
  assert.strictEqual(generatedPayload.f12, '240826', 'f12 deve conter a data final');
  assert.strictEqual(generatedPayload.f9, '', 'f9 (emissão) deve estar vazio no modo autorização');
  assert.strictEqual(generatedPayload.f10, '', 'f10 (emissão) deve estar vazio no modo autorização');
  assert.strictEqual(generatedPayload.f13, '', 'f13 (previsão) deve estar vazio no modo autorização');
  assert.strictEqual(generatedPayload.f14, '', 'f14 (previsão) deve estar vazio no modo autorização');
  assert.strictEqual(generatedPayload.f15, '', 'f15 (entrega) deve estar vazio no modo autorização');
  assert.strictEqual(generatedPayload.f16, '', 'f16 (entrega) deve estar vazio no modo autorização');
  console.log('   ✓ Período padrão utiliza f11/f12 e mantém f9/f10/f13/f14/f15/f16 vazios.');

  // 3. Testar conversão de formatos de datas para DDMMYY no gateway
  console.log('3. Testando conversão de datas...');
  assert.strictEqual(formatToDdmmyy('2026-12-31'), '311226');
  assert.strictEqual(formatToDdmmyy('01/05/2026'), '010526');
  assert.strictEqual(formatToDdmmyy('150826'), '150826');
  console.log('   ✓ Conversão de datas formatadas corretamente para DDMMYY.');

  console.log('=====================================================================');
  console.log('TODOS OS TESTES DE CONFORMIDADE DE PAYLOAD SSWTOOLS PASSARAM! 🎯');
  console.log('=====================================================================');
}

runPayload455ComparisonTests().catch(err => {
  console.error('Falha nos testes de comparação de payload:', err);
  process.exit(1);
});
