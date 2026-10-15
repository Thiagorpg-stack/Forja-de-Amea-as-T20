// Teste de integração do diálogo com o Foundry simulado: confere a "cola" entre o estado do formulário,
// a montagem do ator e a chamada à API do Ajustar ND. Não substitui o teste no Foundry.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const chamadas = [];

class FakeApp { constructor(opcoes = {}) { this.options = opcoes; } }
globalThis.foundry = {
  applications: { api: { ApplicationV2: FakeApp, HandlebarsApplicationMixin: (Base) => Base } },
  utils: { randomID: (() => { let n = 0; return () => `id-${++n}`; })() },
};
const ajusteNd = {
  active: true,
  api: {
    versaoApi: 2,
    simular: async (actor, opcoes) => {
      chamadas.push({ actor, opcoes });
      return {
        update: { 'system.attributes.pv.max': 400, 'system.attributes.cd': 30 },
        depois: { defesa: 36, pericias: { luta: 29, fort: 22, refl: 16, vont: 10 } },
        avisos: ['aviso de teste'], patamar: ['patamar de teste'], plano: { linha: { Dano: 80 }, dano: { porArma: {} }, revisar: [] },
      };
    },
    maxAtaques: () => 2,
    aplicarAjuste: async () => {},
  },
};
globalThis.game = {
  i18n: { localize: (k) => k, format: (k) => k },
  modules: { get: () => ajusteNd },
};
globalThis.CONFIG = {
  Actor: { documentClass: class { constructor(dados) { this.dados = dados; } toObject() { return structuredClone(this.dados); } } },
};

const { DialogoForja } = await import('../scripts/dialogo-forja.js');
const novo = (estado = {}) => { const d = new DialogoForja(); Object.assign(d.estado, { nome: 'Lobo Gigante' }, estado); return d; };

test('contexto: o ND escolhido vai direto para a API, o ator é simulado e a prévia é montada', async () => {
  chamadas.length = 0;
  const d = novo({ nd: '10' });
  const ctx = await d._prepareContext();

  assert.deepEqual(ctx.erros, []);
  assert.equal(ctx.nds.find((n) => n.selecionado).valor, '10');
  assert.deepEqual(ctx.previa.linhas.map((l) => l.rotulo).slice(0, 3), ['PV', 'CD', 'Defesa (total na ficha)']);
  assert.equal(ctx.previa.linhas[0].valor, 400);
  assert.deepEqual([ctx.previa.avisos, ctx.previa.patamar], [['aviso de teste'], ['patamar de teste']]);
  assert.deepEqual([ctx.limiteAtaques, ctx.totalAtaques], [2, 1]);

  assert.equal(chamadas.length, 1);
  const { actor, opcoes } = chamadas[0];
  assert.equal(opcoes.nd, '10');
  assert.equal(opcoes.papel, 'solo');
  assert.deepEqual(opcoes.ordemResistencias, ['fort', 'refl', 'vont']);
  assert.deepEqual(opcoes.templates, { chefeFinal: false });
  assert.equal(actor.dados.system.attributes.nd, '10');
  assert.deepEqual(opcoes.ataquesPorArma, { [actor.dados.items[0]._id]: 1 });
  assert.ok(d.pronto);
});

test('papel Lacaio e Chefe Final vão para a API com os códigos do sistema', async () => {
  chamadas.length = 0;
  await novo({ papel: 'lacaio', chefeFinal: true })._prepareContext();
  assert.equal(chamadas[0].opcoes.papel, 'lackey');
  assert.equal(chamadas[0].actor.dados.system.detalhes.role, 'lackey');
  assert.deepEqual(chamadas[0].opcoes.templates, { chefeFinal: true });
});

test('formulário inválido mostra os erros só depois da primeira edição e não chama a API', async () => {
  chamadas.length = 0;
  const d = novo({ nome: '' });
  assert.deepEqual((await d._prepareContext()).erros, []);   // recém-aberto: sem erro à vista
  d.tocado = true;
  const ctx = await d._prepareContext();
  assert.deepEqual(ctx.erros, ['T20FA.Erro.nome']);
  assert.equal(ctx.previa, null);
  assert.equal(chamadas.length, 0);
  assert.equal(d.pronto, null);
});

test('Ajustar ND ausente ou antigo gera mensagem clara', async () => {
  const original = { ...ajusteNd };
  ajusteNd.active = false;
  assert.deepEqual((await novo()._prepareContext()).erros, ['T20FA.ErroAjusteNdAusente']);
  ajusteNd.active = true;
  ajusteNd.api = { versaoApi: 1 };
  assert.deepEqual((await novo()._prepareContext()).erros, ['T20FA.ErroAjusteNdAntigo']);
  Object.assign(ajusteNd, original);
});

test('o diálogo preserva a rolagem da janela ao se redesenhar', () => {
  assert.deepEqual(DialogoForja.PARTS.corpo.scrollable, ['']);
});

// Soltar poder ou magia na janela: o Foundry entrega { type: 'Item', uuid }, que o diálogo resolve com fromUuid.
function dialogoComZona(arrasto, itens) {
  const d = novo();
  d.desenhos = 0;
  d.render = async () => { d.desenhos += 1; };
  const zona = { ouvintes: {}, addEventListener(tipo, f) { this.ouvintes[tipo] = f; } };
  d.element = { querySelectorAll: () => [], querySelector: (s) => (s === '.forja' ? zona : null) };
  d._onRender();
  foundry.applications.ux = { TextEditor: { implementation: { getDragEventData: () => arrasto } } };
  globalThis.fromUuid = async (uuid) => itens[uuid] ?? null;
  const avisos = [];
  globalThis.ui = { notifications: { warn: (m) => avisos.push(m) } };
  game.i18n.format = (chave, dados) => `${chave}:${JSON.stringify(dados)}`;
  return { d, zona, avisos, soltar: () => zona.ouvintes.drop({ preventDefault() {} }) };
}
const itemFalso = (type, name = 'Sopro') => ({ type, name, toObject: () => ({ _id: 'x', name, type, flags: {}, system: {} }) });

test('soltar um poder na janela: entra em itensExtras e o diálogo se redesenha; arrastar sobre a janela é permitido', async () => {
  const { d, zona, soltar } = dialogoComZona({ type: 'Item', uuid: 'U1' }, { U1: itemFalso('poder') });
  let impedido = false;
  zona.ouvintes.dragover({ preventDefault: () => { impedido = true; } });
  assert.equal(impedido, true);
  await soltar();
  assert.deepEqual(d.estado.itensExtras.map((i) => [i.name, i.type, '_id' in i]), [['Sopro', 'poder', false]]);
  assert.equal(d.desenhos, 1);
});

test('soltar uma arma: vira linha de ataque (não item), com o dano extra, e o ator simulado leva a arma com o extra', async () => {
  chamadas.length = 0;
  const dadosArma = { type: 'arma', name: 'Espada Longa', system: { proposito: 'corpo-a-corpo', ataques: 2, description: { value: '' },
    rolls: [{ type: 'dano', parts: [['2d5+8', 'corte', ''], ['', '', ''], ['2d6', 'eletricidade', '']] }] } };
  const { d, avisos, soltar } = dialogoComZona({ type: 'Item', uuid: 'U4' }, { U4: { ...dadosArma, toObject: () => dadosArma } });
  await soltar();
  assert.deepEqual([d.estado.itensExtras.length, avisos.length, d.desenhos], [0, 0, 1]);
  assert.deepEqual(d.estado.ataques.at(-1), { nome: 'Espada Longa', tipo: 'cac', dano: 'corte', qtd: 2, descricao: '', danoExtra: [{ formula: '2d6', tipo: 'eletricidade' }] });
  await d._prepareContext();
  const espada = chamadas[0].actor.dados.items.find((i) => i.name === 'Espada Longa');
  assert.deepEqual(espada.system.rolls[1].parts.at(-1), ['2d6', 'eletricidade', '']);
  assert.equal(espada.system.ataques, 2);
});

test('dano extra: "+ dano extra" e "remover" mexem só no ataque certo; o contexto lista os extras', async () => {
  const d = novo();
  d.render = async () => {};
  // A tela espelha o estado: cada ataque vira uma linha cujos campos devolvem o que está no estado.
  const campo = (valor) => ({ value: valor });
  d.element = {
    querySelector: () => null,
    querySelectorAll: (seletor) => (seletor !== '[data-ataque]' ? [] : d.estado.ataques.map((a) => ({
      querySelector: (s) => campo({ '[data-campo=nome]': a.nome, '[data-campo=tipo]': a.tipo, '[data-campo=dano]': a.dano, '[data-campo=qtd]': a.qtd }[s]),
      querySelectorAll: (s) => (s !== '.forja__extra' ? [] : a.danoExtra.map((x) => ({
        querySelector: (s) => campo(s.includes('formula') ? x.formula : x.tipo),
      }))),
    }))),
  };
  const linha = (nome) => ({ nome, tipo: 'cac', dano: 'corte', qtd: 1, descricao: '', danoExtra: [] });
  d.estado.ataques = [linha('A'), linha('B')];
  const { addExtra, removerExtra } = DialogoForja.DEFAULT_OPTIONS.actions;
  await addExtra.call(d, null, { dataset: { indice: '1' } });
  await addExtra.call(d, null, { dataset: { indice: '1' } });
  d.estado.ataques[1].danoExtra[0].formula = '2d6';
  assert.deepEqual(d.estado.ataques.map((a) => a.danoExtra.length), [0, 2]);
  assert.deepEqual((await d._prepareContext()).ataques[1].extras.map((x) => x.formula), ['2d6', '']);
  await removerExtra.call(d, null, { dataset: { indice: '1', extra: '0' } });
  assert.deepEqual(d.estado.ataques[1].danoExtra.map((x) => x.formula), ['']);
});

test('fórmula de dano extra inválida aparece como erro legível e não chama a API', async () => {
  chamadas.length = 0;
  const d = novo();
  d.tocado = true;
  d.estado.ataques[0].danoExtra = [{ formula: 'abc', tipo: 'fogo' }];
  const ctx = await d._prepareContext();
  assert.deepEqual(ctx.erros, ['T20FA.ErroAtaqueExtra (1)']);
  assert.equal(chamadas.length, 0);
});

test('soltar equipamento, item que não abre ou algo que não é item: não entra; só os dois primeiros avisam', async () => {
  const equip = dialogoComZona({ type: 'Item', uuid: 'U2' }, { U2: itemFalso('equipamento', 'Escudo') });
  await equip.soltar();
  assert.deepEqual([equip.d.estado.itensExtras.length, equip.d.estado.ataques.length, equip.d.desenhos], [0, 1, 0]);
  assert.match(equip.avisos[0], /AvisoItemNaoSuportado.*equipamento/);
  const sumido = dialogoComZona({ type: 'Item', uuid: 'U3' }, {});
  await sumido.soltar();
  assert.match(sumido.avisos[0], /AvisoItemNaoSuportado.*\?/);
  const ator = dialogoComZona({ type: 'Actor', uuid: 'A1' }, {});
  await ator.soltar();
  assert.deepEqual([ator.avisos.length, ator.d.estado.itensExtras.length], [0, 0]);
});

test('o item arrastado entra no ator simulado e "remover" tira pelo índice', async () => {
  chamadas.length = 0;
  const d = novo();
  d.estado.itensExtras = [{ name: 'A', type: 'poder', img: 'a.svg' }, { name: 'B', type: 'magia', img: 'b.svg' }];
  await d._prepareContext();
  assert.deepEqual(chamadas[0].actor.dados.items.filter((i) => i.type !== 'arma').map((i) => i.name), ['A', 'B']);
  d.render = async () => {};
  d.element = { querySelectorAll: () => [], querySelector: () => null };
  await DialogoForja.DEFAULT_OPTIONS.actions.removerItemExtra.call(d, null, { dataset: { indice: '0' } });
  assert.deepEqual(d.estado.itensExtras.map((i) => i.name), ['B']);
  assert.equal((await d._prepareContext()).itensExtras[0].nome, 'B');
});
