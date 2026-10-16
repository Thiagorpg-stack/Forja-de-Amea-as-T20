// O poder arrastado de uma criatura (Sopro do Golem de Ferro) fala dela no texto: ao criar, os nomes de criatura que o mestre
// listou (a Forja preenche o da ficha de origem, quando sabe) viram o nome da ameaça. O artigo fica como está.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { comNomeDaAmeaca, montarDadosAtor } from '../scripts/forja/criar-ator.js';
import { ameacaDeFormulario } from '../scripts/forja/ameaca.js';

const poder = (texto) => ({ name: 'Sopro', type: 'poder', flags: {}, system: { description: { value: texto } } });
const base = { nome: 'Lobush', nd: '5', papel: 'solo', tamanho: 'med', tipo: 'mon', atributos: {}, ataques: [] };

test('comNomeDaAmeaca: troca o nome citado, sem diferenciar maiúsculas, e mantém o artigo', () => {
  const item = poder('<p>O golem de ferro expele gás. Fugir do Golem de Ferro é difícil.</p>');
  const novo = comNomeDaAmeaca(item, 'Lobush', ['golem de ferro']);
  assert.equal(novo.system.description.value, '<p>O Lobush expele gás. Fugir do Lobush é difícil.</p>');
  assert.equal(item.system.description.value.includes('Lobush'), false); // não altera o item recebido
});

test('comNomeDaAmeaca: vários nomes de uma vez, o mais longo primeiro (orc mutante antes de orc)', () => {
  const item = poder('<p>Se o orc mutante acerta, o orc ri. O lobo uiva.</p>');
  assert.equal(comNomeDaAmeaca(item, 'Lobush', ['orc', 'lobo', 'orc mutante']).system.description.value,
    '<p>Se o Lobush acerta, o Lobush ri. O Lobush uiva.</p>');
});

test('comNomeDaAmeaca: não mexe em atributos de HTML, escapa o nome e aceita caracteres especiais de regex', () => {
  const item = poder('<p><a title="Golem de Ferro" href="x">Golem de Ferro</a></p>');
  assert.equal(comNomeDaAmeaca(item, 'A&B <i>', ['Golem de Ferro']).system.description.value, '<p><a title="Golem de Ferro" href="x">A&amp;B &lt;i&gt;</a></p>');
  assert.equal(comNomeDaAmeaca(item, '$&', ['Golem de Ferro']).system.description.value.includes('$&'), true); // "$&" não vira o trecho encontrado
  assert.equal(comNomeDaAmeaca(poder('<p>A criatura (Alfa) ataca.</p>'), 'Beta', ['(Alfa)']).system.description.value, '<p>A criatura Beta ataca.</p>');
});

test('comNomeDaAmeaca: sem nomes, sem texto ou sem ocorrência, o item volta como veio', () => {
  const item = poder('<p>O golem ataca.</p>');
  assert.equal(comNomeDaAmeaca(item, 'Lobush', []), item);
  assert.equal(comNomeDaAmeaca(item, 'Lobush'), item);
  assert.equal(comNomeDaAmeaca(item, 'Lobush', ['golem de ferro']), item); // forma curta no texto: não casa
  const vazio = poder('');
  assert.equal(comNomeDaAmeaca(vazio, 'Lobush', ['X']), vazio);
  const semSystem = { name: 'Y', type: 'poder', flags: {} };
  assert.equal(comNomeDaAmeaca(semSystem, 'Lobush', ['X']), semSystem);
});

test('ameacaDeFormulario: a lista de nomes aceita vírgula, ponto e vírgula e linha; tira vazios e repetidos', () => {
  const nomes = (campo) => ameacaDeFormulario({ ...base, nomesOrigem: campo }).ameaca.nomesOrigem;
  assert.deepEqual(nomes(' golem de ferro, lobo ;  necromante\nlobo ,, '), ['golem de ferro', 'lobo', 'necromante']);
  assert.deepEqual(nomes(''), []);
  assert.deepEqual(nomes(undefined), []);
});

test('montarDadosAtor: os poderes arrastados saem com o nome da ameaça no texto, e o item da tela fica como veio', () => {
  const item = poder('<p>O golem de ferro expele gás.</p>');
  const { ameaca } = ameacaDeFormulario({ ...base, itensExtras: [item], nomesOrigem: 'golem de ferro' });
  const d = montarDadosAtor(ameaca, { gerarId: () => 'id1' });
  assert.equal(d.items[0].system.description.value, '<p>O Lobush expele gás.</p>');
  assert.equal(item.system.description.value, '<p>O golem de ferro expele gás.</p>');
  // sem a lista, o texto não muda
  const sem = ameacaDeFormulario({ ...base, itensExtras: [item] }).ameaca;
  assert.equal(montarDadosAtor(sem, { gerarId: () => 'id2' }).items[0].system.description.value, '<p>O golem de ferro expele gás.</p>');
});
