// Casamento dos nomes de criatura nos textos dos poderes: o texto original traz hífens, espaços e acentos de vários jeitos
// (o "centopeia-dragão" do Aura de Calor não casava com o digitado), então o casamento ignora essas diferenças.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listaDeNomes, igualNome, trocarNomes, nomesCitados } from '../scripts/forja/nomes.js';

test('listaDeNomes: vírgula, ponto e vírgula e linha separam; sem vazios nem repetidos', () => {
  assert.deepEqual(listaDeNomes(' golem de ferro, lobo ;  necromante\nlobo ,, '), ['golem de ferro', 'lobo', 'necromante']);
  assert.deepEqual(listaDeNomes(''), []);
  assert.deepEqual(listaDeNomes(undefined), []);
});

test('igualNome: mesmo nome sem diferenciar maiúscula, acento e hífen', () => {
  assert.equal(igualNome('Golem de Ferro', 'golem de ferro'), true);
  assert.equal(igualNome('Centopeia-Dragão', 'centopeia dragao'), true);
  assert.equal(igualNome('Lobo', 'Lobos'), false);
});

test('trocarNomes: hífen diferente, espaço especial, acento e forma decomposta casam com o nome digitado', () => {
  const variantes = [
    'centopeia-dragão', 'Centopeia‑Dragão', 'centopeia–dragão', 'centopeia—dragão', 'centopeia dragão',
    'CENTOPEIA-DRAGAO', 'centopeia dragão', 'centopeia&nbsp;dragão', 'centopeia-dragõ'.replace('õ', 'ão'),
  ];
  for (const v of variantes) {
    assert.equal(trocarNomes(`<p>no turno da ${v}, todas sofrem.</p>`, ['centopeia-dragão'], 'Lobush'), '<p>no turno da Lobush, todas sofrem.</p>', JSON.stringify(v));
  }
  // o inverso: o mestre digita sem acento e com espaço
  assert.equal(trocarNomes('<p>a centopeia-dragão ataca</p>', ['Centopeia Dragao'], 'X'), '<p>a X ataca</p>');
  assert.equal(trocarNomes('<p>o Golem&nbsp;de Ferro ataca</p>', ['golem de ferro'], 'X'), '<p>o X ataca</p>');
});

test('trocarNomes: só palavra inteira (lobo não casa em lobos nem em Lobotomia) e casa junto de pontuação', () => {
  assert.equal(trocarNomes('<p>lobos e Lobotomia, o lobo; o lobo. (lobo)</p>', ['lobo'], 'X'), '<p>lobos e Lobotomia, o X; o X. (X)</p>');
});

test('trocarNomes: o nome mais longo vence ("orc mutante" antes de "orc"), sem repetir a troca', () => {
  assert.equal(trocarNomes('<p>Se o orc mutante acerta, o orc ri.</p>', ['orc', 'orc mutante'], 'X'), '<p>Se o X acerta, o X ri.</p>');
});

test('trocarNomes: não mexe nas marcas HTML e devolve o mesmo texto quando nada casa', () => {
  const html = '<p><a title="Golem de Ferro">Golem de Ferro</a> e o golem.</p>';
  assert.equal(trocarNomes(html, ['golem de ferro'], 'X'), '<p><a title="Golem de Ferro">X</a> e o golem.</p>');
  assert.equal(trocarNomes(html, ['dragão'], 'X'), html);
  assert.equal(trocarNomes(html, [], 'X'), html);
  assert.equal(trocarNomes('', ['x'], 'Y'), '');
});

test('nomesCitados: só os nomes da lista que aparecem no texto, na ordem da lista, sem repetir', () => {
  const html = '<p>No turno da centopeia‑dragão, o lobo ruge; o lobo uiva.</p><p>Nada de <b>golem</b>.</p>';
  assert.deepEqual(nomesCitados(html, ['golem de ferro', 'lobo', 'centopeia dragao', 'dragão azul']), ['lobo', 'centopeia dragao']);
  assert.deepEqual(nomesCitados('', ['lobo']), []);
  assert.deepEqual(nomesCitados(undefined, ['lobo']), []);
});
