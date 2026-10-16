// O poder arrastado de uma criatura (Sopro do Golem de Ferro) fala dela no texto: ao criar, o nome da criatura de origem
// vira o nome da ameaça. Só o nome completo é trocado, e o artigo fica como está.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { itemExtraDe } from '../scripts/forja/itens-extras.js';
import { comNomeDaAmeaca, montarDadosAtor, ID_FORJA } from '../scripts/forja/criar-ator.js';
import { ameacaDeFormulario } from '../scripts/forja/ameaca.js';

const poder = (texto, origem) => ({
  name: 'Sopro', type: 'poder', flags: origem ? { [ID_FORJA]: { extra: true, origem } } : {}, system: { description: { value: texto } },
});

test('itemExtraDe: guarda a criatura de origem na flag do item (e nada quando não há)', () => {
  const dados = { _id: 'x', name: 'Sopro', type: 'poder', flags: {}, system: {} };
  assert.deepEqual(itemExtraDe(dados, 'Golem de Ferro').flags[ID_FORJA], { extra: true, origem: 'Golem de Ferro' });
  assert.deepEqual(itemExtraDe(dados).flags[ID_FORJA], { extra: true });
  assert.deepEqual(itemExtraDe(dados, '').flags[ID_FORJA], { extra: true });
});

test('comNomeDaAmeaca: troca o nome completo da criatura, sem diferenciar maiúsculas, e mantém o artigo', () => {
  const item = poder('<p>O golem de ferro expele gás. Fugir do Golem de Ferro é difícil.</p>', 'Golem de Ferro');
  const novo = comNomeDaAmeaca(item, 'Lobush');
  assert.equal(novo.system.description.value, '<p>O Lobush expele gás. Fugir do Lobush é difícil.</p>');
  assert.equal(item.system.description.value.includes('Lobush'), false); // não altera o item recebido
});

test('comNomeDaAmeaca: não mexe em atributos de HTML, escapa o nome e aceita caracteres especiais de regex', () => {
  const item = poder('<p><a title="Golem de Ferro" href="x">Golem de Ferro</a></p>', 'Golem de Ferro');
  assert.equal(comNomeDaAmeaca(item, 'A&B <i>').system.description.value, '<p><a title="Golem de Ferro" href="x">A&amp;B &lt;i&gt;</a></p>');
  assert.equal(comNomeDaAmeaca(item, '$&').system.description.value.includes('$&'), true); // "$&" não vira o trecho encontrado
  const parenteses = poder('<p>A criatura (Alfa) ataca.</p>', '(Alfa)');
  assert.equal(comNomeDaAmeaca(parenteses, 'Beta').system.description.value, '<p>A criatura Beta ataca.</p>');
});

test('comNomeDaAmeaca: sem criatura de origem, sem texto ou com forma curta do nome, nada muda', () => {
  const sem = poder('<p>O golem ataca.</p>');
  assert.equal(comNomeDaAmeaca(sem, 'Lobush'), sem);
  assert.equal(comNomeDaAmeaca(poder('<p>O golem ataca.</p>', 'Golem de Ferro'), 'Lobush').system.description.value, '<p>O golem ataca.</p>');
  const vazio = { name: 'Magias', type: 'poder', flags: { [ID_FORJA]: { origem: 'X' } }, system: { description: { value: '' } } };
  assert.equal(comNomeDaAmeaca(vazio, 'Lobush'), vazio);
  const semSystem = { name: 'Y', type: 'poder', flags: { [ID_FORJA]: { origem: 'X' } } };
  assert.equal(comNomeDaAmeaca(semSystem, 'Lobush'), semSystem);
});

test('montarDadosAtor: os poderes arrastados saem com o nome da ameaça no texto, e o item da tela fica como veio', () => {
  const item = poder('<p>O golem de ferro expele gás.</p>', 'Golem de Ferro');
  const { ameaca } = ameacaDeFormulario({ nome: 'Lobush', nd: '5', papel: 'solo', tamanho: 'med', tipo: 'mon', atributos: {}, ataques: [], itensExtras: [item] });
  const d = montarDadosAtor(ameaca, { gerarId: () => 'id1' });
  assert.equal(d.items[0].system.description.value, '<p>O Lobush expele gás.</p>');
  assert.equal(item.system.description.value, '<p>O golem de ferro expele gás.</p>');
});
