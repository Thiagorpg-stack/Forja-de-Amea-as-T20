import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ameacaDeFormulario } from '../scripts/forja/ameaca.js';
import { montarDadosAtor, ataquesPorArmaDe, ID_FORJA } from '../scripts/forja/criar-ator.js';
import { itemExtraDe, TIPOS_ITEM_EXTRA } from '../scripts/forja/itens-extras.js';
import { papelDoSistema, valorND, NDS } from '../scripts/forja/mapeamentos.js';

const formulario = (extra = {}) => ({
  nome: ' Lobo Gigante ', conceito: 'Caçador <rápido>', nd: '7', papel: 'solo',
  tamanho: 'gra', tipo: 'ani', deslocamento: '12',
  atributos: { for: '3', des: '2', con: '2', int: '-4', sab: '1', car: '-1' },
  ataques: [
    { nome: 'Mordida', tipo: 'cac', dano: 'perfuracao', qtd: '2' },
    { nome: 'Cuspe', tipo: 'ad', dano: 'acido', qtd: 1 },
  ],
  ...extra,
});

let contador = 0;
const gerarId = () => `id${++contador}`;
const monta = (extra, opcoes = {}) => montarDadosAtor(ameacaDeFormulario(formulario(extra)).ameaca, { gerarId, ...opcoes });

test('formulário válido vira ameaça neutra, com ND direto (sem CR nem ritmo)', () => {
  const r = ameacaDeFormulario(formulario());
  assert.equal(r.ok, true);
  const a = r.ameaca;
  assert.equal(a.nome, 'Lobo Gigante');
  assert.equal(a.nd, '7');
  assert.equal('cr' in a || 'ritmo' in a, false);
  assert.deepEqual(a.atributos, { for: 3, des: 2, con: 2, int: -4, sab: 1, car: -1 });
  assert.deepEqual(a.ataques[0], { nome: 'Mordida', distancia: false, tipoDano: 'perfuracao', qtd: 2 });
  assert.equal(a.ataques[1].distancia, true);
});

test('todos os NDs da lista são aceitos e outros não', () => {
  assert.equal(NDS.length, 24);
  for (const nd of NDS) assert.equal(ameacaDeFormulario(formulario({ nd })).ok, true, nd);
  for (const nd of ['0', '21', 'X', '', undefined]) assert.deepEqual(ameacaDeFormulario(formulario({ nd })).erros, ['nd'], String(nd));
});

test('erros de validação voltam como códigos', () => {
  const r = ameacaDeFormulario(formulario({ nome: ' ', papel: 'chefe', tamanho: 'zz', tipo: 'zz', deslocamento: '-3' }));
  assert.equal(r.ok, false);
  assert.deepEqual(r.erros, ['nome', 'papel', 'tamanho', 'tipo', 'deslocamento']);
  assert.deepEqual(ameacaDeFormulario(formulario({ ataques: [{ nome: '', tipo: 'cac', dano: 'corte', qtd: 1 }] })).erros, ['ataque-0-nome']);
});

test('atributo é limitado a -10..30, quantidade de ataque nunca fica abaixo de 1 e dano desconhecido vira "dano"', () => {
  const r = ameacaDeFormulario(formulario({
    atributos: { for: '99', des: '-99', con: 'x' },
    ataques: [{ nome: 'Golpe', tipo: 'cac', dano: 'inexistente', qtd: '0' }],
  }));
  assert.deepEqual([r.ameaca.atributos.for, r.ameaca.atributos.des, r.ameaca.atributos.con, r.ameaca.atributos.int], [30, -10, 0, 0]);
  assert.equal(r.ameaca.ataques[0].qtd, 1);
  assert.equal(r.ameaca.ataques[0].tipoDano, 'dano');
});

test('deslocamento apagado volta a 9 m e sem ataques é permitido (o Ajustar ND avisa)', () => {
  assert.equal(ameacaDeFormulario(formulario({ deslocamento: '' })).ameaca.deslocamento, 9);
  assert.deepEqual(ameacaDeFormulario(formulario({ ataques: [] })).ameaca.ataques, []);
});

test('dados do ator: campos do sistema, token e flag de rastreio', () => {
  const d = monta({ papel: 'lacaio' }, { pasta: 'p1', agora: '2026-10-15T00:00:00.000Z' });
  assert.equal(d.type, 'npc');
  assert.equal(d.folder, 'p1');
  assert.equal(d.system.attributes.nd, '7');
  assert.equal(d.system.detalhes.role, 'lackey');
  assert.equal(d.system.detalhes.tipo, 'ani');
  assert.equal(d.system.tracos.tamanho, 'gra');
  assert.equal(d.system.atributos.int.base, -4);
  assert.equal(d.system.attributes.movement.walk.base, 12);
  assert.deepEqual([d.prototypeToken.width, d.prototypeToken.height, d.prototypeToken.displayName, d.prototypeToken.displayBars], [2, 2, 20, 40]);
  assert.equal(d.system.detalhes.biography.value, '<p>Caçador &lt;rápido&gt;</p>');
  assert.deepEqual(d.flags[ID_FORJA], { origem: 'forja', nd: '7', criadoEm: '2026-10-15T00:00:00.000Z' });
});

test('papéis: tabela vira código do sistema', () => {
  assert.deepEqual(['solo', 'lacaio', 'especial'].map(papelDoSistema), ['solo', 'lackey', 'special']);
  assert.throws(() => papelDoSistema('chefe'));
  assert.deepEqual(['1/4', '1/2', '5', 'S', 'S+'].map(valorND), [0.25, 0.5, 5, 21, 22]);
});

test('conjurador recebe 5 PM por ND e o atributo de conjuração; sem a caixa, sem PM', () => {
  const c = monta({ conjurador: true, conjuracao: 'car', nd: '4' });
  assert.deepEqual([c.system.attributes.pm.max, c.system.attributes.pm.value, c.system.attributes.conjuracao], [20, 20, 'car']);
  assert.equal(monta({ conjurador: true, nd: '1/4' }).system.attributes.pm.max, 1); // nunca zero
  assert.equal(monta({}).system.attributes.pm.max, 0);
});

test('linha de ataques provisória e armas no formato oficial', () => {
  const d = monta({ ataques: [
    { nome: 'Mordida', tipo: 'cac', dano: 'perfuracao', qtd: 1 }, { nome: 'Garra', tipo: 'cac', dano: 'fogo', qtd: 2 },
    { nome: 'Cuspe', tipo: 'ad', dano: 'acido', qtd: 1 },
  ] });
  assert.equal(d.system.detalhes.ataquescac, 'Mordida +0 (1d6) e 2 Garra +0 (1d6 de fogo).');
  assert.equal(d.system.detalhes.ataquesad, 'Cuspe +0 (1d6 de ácido).');
  const [mordida, , cuspe] = d.items;
  assert.equal(mordida.type, 'arma');
  assert.deepEqual(mordida.system.rolls[0].parts, [['1d20', '', ''], ['luta', '', ''], ['0', '', '']]);
  assert.equal(cuspe.system.proposito, 'disparo');
  assert.equal(new Set(d.items.map((i) => i._id)).size, 3);
  assert.equal(monta({ ataques: [] }).system.detalhes.ataquescac, '');
});

test('ataquesPorArmaDe lê a flag de cada arma, mesmo depois de o Foundry trocar os ids', () => {
  const a = ameacaDeFormulario(formulario()).ameaca;
  const d = montarDadosAtor(a, { gerarId });
  const comOutrosIds = d.items.map((item, i) => ({ ...item, _id: `novo${i}` }));
  assert.deepEqual(ataquesPorArmaDe(comOutrosIds, a), { novo0: 2, novo1: 1 });
  assert.deepEqual(ataquesPorArmaDe([{ type: 'poder', _id: 'x' }], a), {});
});

test('imagem: sem token o token usa o retrato; sem nada ficam os ícones do modelo', () => {
  assert.equal(monta({}).img, 'systems/tormenta20/icons/svg/orc-head.svg');
  const soRetrato = monta({ img: ' uploads/lobo.webp ' });
  assert.deepEqual([soRetrato.img, soRetrato.prototypeToken.texture.src], ['uploads/lobo.webp', 'uploads/lobo.webp']);
  assert.equal(monta({ img: 'a.webp', token: 'b.webp' }).prototypeToken.texture.src, 'b.webp');
});

test('cada ator novo traz um modelo independente', () => {
  const a = monta({});
  const b = monta({});
  a.system.atributos.for.base = 99;
  assert.equal(b.system.atributos.for.base, 3);
  assert.equal(Object.keys(a.system.pericias).length, 34);
});

const extraPoder = { name: 'Sopro', type: 'poder', img: 'icons/svg/aura.svg', effects: [{ name: 'Efeito' }], flags: {}, system: { rolls: [] } };

test('itens arrastados: só poder e magia; entram depois das armas, com id novo, sem alterar o original', () => {
  assert.deepEqual(TIPOS_ITEM_EXTRA, ['poder', 'magia']);
  const { ameaca } = ameacaDeFormulario(formulario({ itensExtras: [extraPoder, { ...extraPoder, name: 'Espada', type: 'arma' }, null] }));
  assert.deepEqual(ameaca.itensExtras.map((i) => i.name), ['Sopro']);
  const d = montarDadosAtor(ameaca, { gerarId });
  assert.equal(d.items.at(-1).name, 'Sopro');
  assert.equal(d.items.filter((i) => i.type === 'arma').length, 2);
  assert.match(d.items.at(-1)._id, /^id\d+$/);
  assert.deepEqual(d.items.at(-1).effects, [{ name: 'Efeito' }]);
  assert.equal(extraPoder._id, undefined);
  assert.equal(new Set(d.items.map((i) => i._id)).size, d.items.length);
});

test('itemExtraDe tira os campos do documento, marca a origem e recusa arma, equipamento e entrada vazia', () => {
  const poder = { _id: 'abc', name: 'Sopro', type: 'poder', folder: 'f', sort: 5, ownership: { default: 0 }, _stats: { v: 1 }, flags: { outro: { x: 1 } }, system: {} };
  const extra = itemExtraDe(poder);
  for (const campo of ['_id', 'folder', 'sort', 'ownership', '_stats']) assert.equal(campo in extra, false);
  assert.deepEqual(extra.flags, { outro: { x: 1 }, [ID_FORJA]: { extra: true } });
  assert.equal(poder._id, 'abc');
  assert.equal(itemExtraDe({ ...poder, type: 'magia' }).type, 'magia');
  for (const type of ['arma', 'equipamento', 'feat']) assert.equal(itemExtraDe({ ...poder, type }), null);
  assert.equal(itemExtraDe(null), null);
  assert.equal(itemExtraDe({}), null);
});
