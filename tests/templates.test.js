// Templates Enxame e Bando: a Forja só valida o que o mestre escolheu e repassa ao Ajustar ND (quem calcula é ele).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ameacaDeFormulario } from '../scripts/forja/ameaca.js';
import { aumentoPadrao, ESCALAS_BANDO } from '../scripts/forja/mapeamentos.js';
import { casasDoTamanho } from '../scripts/forja/criar-ator.js';

const form = (extra = {}) => ({
  nome: 'Matilha', nd: '5', papel: 'solo', tamanho: 'med', tipo: 'ani', atributos: {},
  ataques: [{ nome: 'Mordida', tipo: 'cac', dano: 'perfuracao', qtd: 1 }], ...extra,
});

test('aumento de ND padrão de cada escala do Bando (a mesma tabela do Ajustar ND)', () => {
  assert.deepEqual(ESCALAS_BANDO, ['10-20', '20-40', '50-70', '80-100']);
  assert.deepEqual(ESCALAS_BANDO.map(aumentoPadrao), [2, 2, 4, 6]);
  assert.equal(aumentoPadrao('desconhecida'), 2);
});

test('sem templates: nada de Enxame nem Bando na ameaça', () => {
  const { ameaca } = ameacaDeFormulario(form());
  assert.deepEqual([ameaca.enxame, ameaca.bando], [false, null]);
});

test('Bando: escala e aumento de ND validados; o aumento é limitado a 0..12 e volta ao padrão da escala se for lixo', () => {
  const ok = ameacaDeFormulario(form({ bando: true, bandoEscala: '50-70', bandoAumento: '4' })).ameaca;
  assert.deepEqual(ok.bando, { escala: '50-70', aumentoND: 4 });
  assert.equal(ameacaDeFormulario(form({ bando: true, bandoEscala: '20-40', bandoAumento: '99' })).ameaca.bando.aumentoND, 12);
  assert.equal(ameacaDeFormulario(form({ bando: true, bandoEscala: '20-40', bandoAumento: '-3' })).ameaca.bando.aumentoND, 0);
  assert.equal(ameacaDeFormulario(form({ bando: true, bandoEscala: '80-100', bandoAumento: 'x' })).ameaca.bando.aumentoND, 6);
  assert.deepEqual(ameacaDeFormulario(form({ bando: true, bandoEscala: '1-2' })).erros, ['bandoEscala']);
  // sem a caixa, a escala não conta (o campo fica desabilitado na tela)
  assert.equal(ameacaDeFormulario(form({ bando: false, bandoEscala: '1-2' })).ameaca.bando, null);
});

test('Enxame sozinho não usa ataques: a lista sai vazia e erros de ataque não impedem criar', () => {
  const r = ameacaDeFormulario(form({ enxame: true, ataques: [{ nome: '', tipo: 'cac', dano: 'corte', qtd: 1, danoExtra: [{ formula: 'x' }] }] }));
  assert.equal(r.ok, true);
  assert.deepEqual([r.ameaca.enxame, r.ameaca.ataques], [true, []]);
});

test('Enxame junto com o Bando mantém os ataques (o Ajustar ND ajusta as armas como no Bando)', () => {
  const r = ameacaDeFormulario(form({ enxame: true, bando: true, bandoEscala: '10-20' }));
  assert.deepEqual([r.ameaca.enxame, r.ameaca.ataques.length, r.ameaca.bando.escala], [true, 1, '10-20']);
  assert.deepEqual(ameacaDeFormulario(form({ enxame: true, bando: true, bandoEscala: '10-20', ataques: [{ nome: '' }] })).erros, ['ataque-0-nome']);
});

test('casasDoTamanho: casas da grade do token pelo tamanho (o Bando aumenta o tamanho)', () => {
  assert.deepEqual(['min', 'peq', 'med', 'gra', 'eno', 'col', 'zz'].map(casasDoTamanho), [1, 1, 1, 2, 3, 4, 1]);
});
