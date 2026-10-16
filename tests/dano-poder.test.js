import { test } from 'node:test';
import assert from 'node:assert/strict';
import { comDanoAjustado } from '../scripts/forja/itens-extras.js';

const AJUSTE = 'tormenta20-ajuste-nd';
const poder = (flags = {}) => ({ name: 'Sopro', type: 'poder', flags, system: { rolls: [] } });

test('comDanoAjustado: ligar grava a flag do Ajustar ND (efeito só se foi dito) e mantém as outras flags', () => {
  const original = poder({ outro: { x: 1 } });
  const ligado = comDanoAjustado(original, { ajustar: true });
  assert.deepEqual(ligado.flags[AJUSTE], { danoPoder: { ajustar: true } }); // sem efeito: o Ajustar ND detecta pelo texto
  assert.deepEqual(ligado.flags.outro, { x: 1 });
  assert.deepEqual(comDanoAjustado(original, { ajustar: true, efeito: false }).flags[AJUSTE].danoPoder, { ajustar: true, efeito: false });
  assert.deepEqual(comDanoAjustado(original, { ajustar: true, efeito: true }).flags[AJUSTE].danoPoder, { ajustar: true, efeito: true });
  assert.deepEqual(original.flags, { outro: { x: 1 } }); // não altera o original
});

test('comDanoAjustado: desligar tira a flag (o poder volta a entrar como veio) sem apagar flags de outros módulos', () => {
  const ligado = comDanoAjustado(poder({ outro: { x: 1 } }), { ajustar: true, efeito: true });
  const desligado = comDanoAjustado(ligado, { ajustar: false });
  assert.equal(AJUSTE in desligado.flags, false);
  assert.deepEqual(desligado.flags.outro, { x: 1 });
  // outras chaves do Ajustar ND no mesmo item ficam
  const comOutra = comDanoAjustado(poder({ [AJUSTE]: { origem: 'template', danoPoder: { ajustar: true } } }), { ajustar: false });
  assert.deepEqual(comOutra.flags[AJUSTE], { origem: 'template' });
  assert.deepEqual(comDanoAjustado(poder(), { ajustar: false }).flags, {}); // já desligado: nada a fazer
});
