import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nomeDoArquivo, ehUrl } from '../scripts/forja/imagem.js';
import { completarPericiasParciais, atualizacaoDePericias } from '../scripts/forja/pericias.js';

test('nome do arquivo vem da URL, sem caracteres perigosos', () => {
  assert.equal(nomeDoArquivo('https://x.com/a/Lobo%20Gigante.png?v=2#topo'), 'Lobo_Gigante.png');
  const traversal = nomeDoArquivo('https://x.com/a/..%2F..%2Fsegredo.png');
  assert.doesNotMatch(traversal, /[\\/]/);   // nunca escapa da pasta
  assert.doesNotMatch(traversal, /^\./);
  assert.equal(nomeDoArquivo('https://x.com/a/token', 'image/png'), 'token.png');
  assert.equal(nomeDoArquivo('https://x.com/', 'image/svg+xml'), 'imagem.svg');
  assert.equal(nomeDoArquivo('isto não é url', 'image/webp'), 'imagem.webp');
});

test('só http e https contam como URL', () => {
  assert.equal(ehUrl('https://x.com/a.png'), true);
  assert.equal(ehUrl(' http://x.com/a.png '), true);
  assert.equal(ehUrl('uploads/lobo.webp'), false);
  assert.equal(ehUrl('javascript:alert(1)'), false);
  assert.equal(ehUrl(''), false);
});

test('atualização parcial de perícia é completada com os valores atuais (sistema 1.6.6)', () => {
  const atuais = { fort: { atributo: 'con', outros: 4, treinado: false }, luta: { atributo: 'for', outros: 1, treinado: true } };
  const r = completarPericiasParciais(atuais, { 'system.pericias.fort.treinado': true, 'system.attributes.pv.max': 9 });
  assert.deepEqual([r['system.pericias.fort.atributo'], r['system.pericias.fort.outros'], r['system.pericias.fort.treinado']], ['con', 4, true]);
  assert.equal('system.pericias.luta.outros' in r, false); // só completa a perícia tocada
  assert.equal(r['system.attributes.pv.max'], 9);
  assert.equal(completarPericiasParciais(undefined, { a: 1 }).a, 1);
});

test('atualização que toca as perícias vai sem diff (o Foundry não a reduz ao que mudou) e completa o caminho parcial', () => {
  const atuais = { fort: { atributo: 'con', outros: 4, treinado: false } };
  // o que o Ajustar ND manda: o system.pericias inteiro, num caminho achatado
  const [dados, contexto] = atualizacaoDePericias(atuais, { 'system.pericias': atuais, 'system.attributes.cd': 20 }, { render: false });
  assert.deepEqual(contexto, { render: false, diff: false });
  assert.deepEqual(dados['system.pericias'], atuais);
  // caminho parcial: completado com os valores atuais
  const [parcial, ctx2] = atualizacaoDePericias(atuais, { 'system.pericias.fort.outros': 9 }, undefined);
  assert.deepEqual([parcial['system.pericias.fort.atributo'], parcial['system.pericias.fort.outros'], ctx2.diff], ['con', 9, false]);
  // objeto aninhado
  assert.equal(atualizacaoDePericias(atuais, { system: { pericias: { fort: { outros: 1 } } } })[1].diff, false);
});

test('atualização que não toca as perícias passa como veio (vida, PM... continuam com o diff do Foundry)', () => {
  const dados = { 'system.attributes.pv.value': 5 };
  const contexto = { render: false };
  const [d, c] = atualizacaoDePericias({ fort: { atributo: 'con' } }, dados, contexto);
  assert.equal(d, dados);
  assert.equal(c, contexto);
  assert.deepEqual(atualizacaoDePericias({}, undefined, undefined), [undefined, undefined]);
});
