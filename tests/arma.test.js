import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ameacaDeFormulario } from '../scripts/forja/ameaca.js';
import { montarDadosAtor } from '../scripts/forja/criar-ator.js';
import { ataqueDeArma } from '../scripts/forja/itens-extras.js';

const formulario = (ataques) => ({
  nome: 'Guerreiro', nd: '7', papel: 'solo', tamanho: 'med', tipo: 'hum', deslocamento: 9, atributos: {}, ataques,
});
const espada = (extra = {}) => ({ nome: 'Espada Longa', tipo: 'cac', dano: 'corte', qtd: 1, ...extra });
let n = 0;
const gerarId = () => `id${++n}`;

test('dano extra: espaços saem, linha em branco é ignorada, tipo desconhecido vira "dano"', () => {
  const r = ameacaDeFormulario(formulario([espada({ danoExtra: [
    { formula: ' 2d6 ', tipo: 'eletricidade' }, { formula: '', tipo: 'fogo' }, { formula: '1d8 + 3', tipo: 'zz' },
  ] })]));
  assert.deepEqual(r.ameaca.ataques[0].danoExtra, [{ formula: '2d6', tipo: 'eletricidade' }, { formula: '1d8+3', tipo: 'dano' }]);
});

test('dano extra com fórmula inválida é erro, um por ataque', () => {
  for (const ruim of ['2d', 'abc', '@mod', '5']) {
    assert.deepEqual(ameacaDeFormulario(formulario([espada({ danoExtra: [{ formula: ruim, tipo: 'fogo' }] })])).erros, ['ataque-0-extra'], ruim);
  }
  assert.deepEqual(ameacaDeFormulario(formulario([espada({ danoExtra: [{ formula: 'x' }, { formula: 'y' }] })])).erros, ['ataque-0-extra']);
});

test('dano extra e descrição vão para a arma: o extra começa em parts[2], depois do campo do atributo', () => {
  const { ameaca } = ameacaDeFormulario(formulario([espada({ descricao: '<p>Lâmina</p>', danoExtra: [{ formula: '2d6', tipo: 'eletricidade' }] })]));
  const arma = montarDadosAtor(ameaca, { gerarId }).items[0];
  assert.deepEqual(arma.system.rolls[1].parts, [['1d6', 'corte', ''], ['', '', ''], ['2d6', 'eletricidade', '']]);
  assert.equal(arma.system.description.value, '<p>Lâmina</p>');
  const sem = montarDadosAtor(ameacaDeFormulario(formulario([espada()])).ameaca, { gerarId }).items[0];
  assert.deepEqual(sem.system.rolls[1].parts, [['1d6', 'corte', ''], ['', '', '']]); // sem extra: como antes
});

const armaDoSistema = (extra = {}) => ({
  type: 'arma', name: 'Espada Longa', _id: 'x',
  system: {
    proposito: 'corpo-a-corpo', ataques: 0, description: { value: '<p>Lâmina</p>' },
    rolls: [
      { type: 'ataque', parts: [['1d20', '', ''], ['luta', '', ''], ['0', '', '']] },
      { type: 'dano', parts: [['2d5+8', 'corte', ''], ['', '', ''], ['2d6', 'eletricidade', ''], ['@mod', 'fogo', ''], ['1d4 + 1', 'zz', '']] },
    ],
    ...extra,
  },
});

test('ataqueDeArma: vira linha de ataque com o dano adicional (parts[2+], sem variáveis) e quantidade mínima 1', () => {
  assert.deepEqual(ataqueDeArma(armaDoSistema()), {
    nome: 'Espada Longa', tipo: 'cac', dano: 'corte', qtd: 1, descricao: '<p>Lâmina</p>',
    danoExtra: [{ formula: '2d6', tipo: 'eletricidade' }, { formula: '1d4+1', tipo: 'dano' }],
  });
  const arco = ataqueDeArma(armaDoSistema({ proposito: 'disparo', ataques: 3 }));
  assert.deepEqual([arco.tipo, arco.qtd], ['ad', 3]);
  assert.equal(ameacaDeFormulario(formulario([ataqueDeArma(armaDoSistema())])).ok, true); // passa direto pela validação
});

test('ataqueDeArma: só arma; arma sem rolagens não quebra', () => {
  for (const type of ['poder', 'magia', 'equipamento']) assert.equal(ataqueDeArma({ ...armaDoSistema(), type }), null);
  assert.equal(ataqueDeArma(null), null);
  assert.equal(ataqueDeArma(undefined), null);
  assert.deepEqual(ataqueDeArma({ type: 'arma', name: 'Nua', system: {} }), { nome: 'Nua', tipo: 'cac', dano: 'dano', qtd: 1, descricao: '', danoExtra: [] });
});
