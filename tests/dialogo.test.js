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

test('sem o nome a prévia já aparece (com nome provisório), o erro só depois da primeira edição, e o Criar fica desabilitado', async () => {
  chamadas.length = 0;
  const d = novo({ nome: '' });
  let ctx = await d._prepareContext();
  assert.deepEqual(ctx.erros, []);                    // recém-aberto: sem erro à vista
  assert.ok(ctx.previa);                              // mas a prévia e as opções dos poderes já valem
  assert.equal(chamadas[0].actor.dados.name, 'T20FA.SemNome');
  assert.deepEqual([ctx.podeCriar, d.pronto], [false, null]);
  d.tocado = true;                                    // depois da primeira edição
  ctx = await d._prepareContext();
  assert.deepEqual(ctx.erros, ['T20FA.Erro.nome']);
  assert.ok(ctx.previa);
  assert.deepEqual([ctx.podeCriar, d.pronto], [false, null]);
  d.estado.nome = 'Lobo';
  ctx = await d._prepareContext();
  assert.deepEqual([ctx.erros, ctx.podeCriar, d.pronto !== null], [[], true, true]);
});

test('outro erro (ataque sem nome) além do nome continua sem prévia e sem chamar a API', async () => {
  chamadas.length = 0;
  const d = novo({ nome: '' });
  d.tocado = true;
  d.estado.ataques[0].nome = '';
  const ctx = await d._prepareContext();
  assert.deepEqual(ctx.erros, ['T20FA.Erro.nome', 'T20FA.ErroAtaqueNome (1)']);
  assert.deepEqual([ctx.previa, ctx.podeCriar, chamadas.length], [null, false, 0]);
});

test('clicar em Criar sem nome não cria nada', async () => {
  const mundo = mundoDeCriacao();
  const original = ajusteNd.api;
  ajusteNd.api = mundo.api;
  try {
    const d = novo({ nome: '' });
    d.element = { querySelector: () => null, querySelectorAll: () => [] };
    d.render = async () => { await d._prepareContext(); };
    d.close = async () => {};
    await DialogoForja.DEFAULT_OPTIONS.actions.criar.call(d);
    assert.equal(mundo.registro.aplicouCom, null);
  } finally {
    ajusteNd.api = original;
  }
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
  const infos = [];
  globalThis.ui = { notifications: { warn: (m) => avisos.push(m), info: (m) => infos.push(m) } };
  game.i18n.format = (chave, dados) => `${chave}:${JSON.stringify(dados)}`;
  return { d, zona, avisos, infos, soltar: () => zona.ouvintes.drop({ preventDefault() {} }) };
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

// Criar de ponta a ponta com o Foundry simulado: o ator final é criado já ajustado pelo Ajustar ND (copiar: true), sem
// nenhuma atualização de perícia depois (atualizar perícias devolve "for" ao atributo no Tormenta20 1.6.6).
function mundoDeCriacao({ nomeDaCopia = 'Lobo Gigante (ND 5)', falhaNoNome = false } = {}) {
  const simularDoMock = ajusteNd.api.simular; // o mock é trocado durante a criação: guardar o original evita recursão
  const registro = { simulacoes: [], aplicouCom: null, atualizacoes: [], apagou: false };
  const ator = {
    name: nomeDaCopia, sheet: { render() {} },
    update: async (d) => { registro.atualizacoes.push(d); if (falhaNoNome) throw new Error('falhou'); },
    delete: async () => { registro.apagou = true; },
  };
  const api = {
    ...ajusteNd.api,
    // a prévia também simula; a última simulação é a da criação
    simular: async (rascunho, opcoes) => { registro.simulacoes.push({ rascunho, opcoes }); return simularDoMock(rascunho, opcoes); },
    aplicarAjuste: async (rascunho, resultado, opcoes) => { registro.aplicouCom = { rascunho, resultado, opcoes }; return ator; },
  };
  Object.assign(globalThis, {
    Folder: { create: async () => ({ id: 'f1' }) },
    Actor: { create: async () => { throw new Error('não deve criar o ator antes do ajuste'); } },
    ui: { notifications: { info() {}, warn() {}, error() {} } },
  });
  globalThis.game.folders = [];
  return { registro, api };
}

async function criarComMundo(mundo) {
  const original = ajusteNd.api;
  ajusteNd.api = mundo.api;
  try {
    const d = novo();
    d.element = { querySelector: () => null, querySelectorAll: () => [] };
    d.render = async () => { await d._prepareContext(); };
    d.close = async () => {};
    await DialogoForja.DEFAULT_OPTIONS.actions.criar.call(d);
  } finally {
    ajusteNd.api = original;
  }
}

test('criar: ajusta um ator ainda não salvo e cria o ator final já ajustado (copiar: true), com a pasta e o nome certos', async () => {
  const mundo = mundoDeCriacao();
  await criarComMundo(mundo);
  const { simulacoes, aplicouCom, atualizacoes, apagou } = mundo.registro;
  const simulouCom = simulacoes.at(-1);
  assert.equal(simulouCom.rascunho.dados.folder, 'f1');                       // o rascunho já vai para a pasta da Forja
  assert.equal(simulouCom.opcoes.nd, '5');
  assert.equal(aplicouCom.rascunho, simulouCom.rascunho);                     // o mesmo ator não salvo
  assert.deepEqual(aplicouCom.opcoes, { copiar: true });                      // cria em vez de atualizar
  assert.deepEqual(atualizacoes, [{ name: 'Lobo Gigante' }]);                 // só o nome volta ao digitado: nenhuma perícia é atualizada
  assert.equal(apagou, false);
});

test('criar: se a cópia já vem com o nome certo, não atualiza nada; se o ajuste falha, nenhum ator fica pela metade', async () => {
  const certo = mundoDeCriacao({ nomeDaCopia: 'Lobo Gigante' });
  await criarComMundo(certo);
  assert.deepEqual(certo.registro.atualizacoes, []);

  const falha = mundoDeCriacao();
  falha.api.aplicarAjuste = async () => { throw new Error('ajuste falhou'); };
  await criarComMundo(falha);
  assert.equal(falha.registro.apagou, false); // nada foi criado, nada a apagar

  const renomeia = mundoDeCriacao({ falhaNoNome: true });
  await criarComMundo(renomeia);
  assert.equal(renomeia.registro.apagou, true); // criou e falhou depois: apaga o ator
});

test('soltar uma magia marca Conjurador (PM = 5 × ND) e avisa; poder não marca; remover a magia não desmarca', async () => {
  const magia = dialogoComZona({ type: 'Item', uuid: 'M1' }, { M1: itemFalso('magia', 'Bola de Fogo') });
  assert.equal(magia.d.estado.conjurador, false);
  await magia.soltar();
  assert.deepEqual([magia.d.estado.conjurador, magia.d.estado.itensExtras.length, magia.infos.length], [true, 1, 1]);
  assert.match(magia.infos[0], /AvisoConjuradorMarcado/);

  const poder = dialogoComZona({ type: 'Item', uuid: 'P1' }, { P1: itemFalso('poder') });
  await poder.soltar();
  assert.deepEqual([poder.d.estado.conjurador, poder.infos.length], [false, 0]);

  // já conjurador: não avisa de novo
  const ja = dialogoComZona({ type: 'Item', uuid: 'M2' }, { M2: itemFalso('magia') });
  ja.d.estado.conjurador = true;
  await ja.soltar();
  assert.deepEqual([ja.d.estado.conjurador, ja.infos.length], [true, 0]);

  magia.d.render = async () => {};
  magia.d.element = { querySelectorAll: () => [], querySelector: () => null };
  await DialogoForja.DEFAULT_OPTIONS.actions.removerItemExtra.call(magia.d, null, { dataset: { indice: '0' } });
  assert.deepEqual([magia.d.estado.itensExtras.length, magia.d.estado.conjurador], [0, true]); // quem decide desmarcar é o mestre
});

// Dano dos poderes arrastados: o Ajustar ND só recalcula o poder que leva a flag; a Forja a grava no item arrastado.
const AJUSTE_ND = 'tormenta20-ajuste-nd';
const sopro = (extra = {}) => ({ name: 'Sopro', type: 'poder', img: 'a.svg', flags: {}, system: { ativacao: { execucao: 'action' }, rolls: [] }, ...extra });

// simular que devolve a prévia dos poderes do ator simulado, como o Ajustar ND 0.10
async function comPreviaDePoderes(aoSimular, teste) {
  const original = ajusteNd.api.simular;
  ajusteNd.api.simular = async (ator, opcoes) => {
    const base = await original(ator, opcoes);
    const poderes = ator.dados.items.filter((i) => i.type === 'poder').map((i) => ({
      id: i._id, nome: i.name, padrao: true, efeito: true, ajustar: Boolean(i.flags?.[AJUSTE_ND]?.danoPoder?.ajustar),
      antes: '16d12', depois: i.flags?.[AJUSTE_ND]?.danoPoder?.ajustar ? '12d12' : null,
    }));
    return { ...base, ...aoSimular?.(ator), poderesPrevia: poderes };
  };
  try { await teste(); } finally { ajusteNd.api.simular = original; }
}

test('poder arrastado com dano: a tela mostra as caixas (desligadas por padrão) e o antes; magia e poder sem prévia não mostram', async () => {
  await comPreviaDePoderes(null, async () => {
    const d = novo();
    d.estado.itensExtras = [sopro(), sopro({ name: 'Bola de Fogo', type: 'magia' })];
    const ctx = await d._prepareContext();
    const [poder, magia] = ctx.itensExtras;
    assert.deepEqual([poder.temDano, poder.ajustar, poder.efeito, poder.padrao, poder.antes, poder.depois], [true, false, true, true, '16d12', null]);
    assert.equal(magia.temDano, false); // o Ajustar ND só trata poder
    assert.deepEqual(ctx.previa.poderes, []);
  });
});

test('ligar "ajustar o dano" grava a flag no item enviado ao Ajustar ND e a prévia mostra antes → depois', async () => {
  await comPreviaDePoderes(null, async () => {
    chamadas.length = 0;
    const d = novo();
    d.estado.itensExtras = [sopro({ flags: { [AJUSTE_ND]: { danoPoder: { ajustar: true, efeito: false } } } })];
    const ctx = await d._prepareContext();
    const enviado = chamadas[0].actor.dados.items.find((i) => i.name === 'Sopro');
    assert.deepEqual(enviado.flags[AJUSTE_ND].danoPoder, { ajustar: true, efeito: false });
    assert.deepEqual([ctx.itensExtras[0].ajustar, ctx.itensExtras[0].depois], [true, '12d12']);
    assert.deepEqual(ctx.previa.poderes, [{ nome: 'Sopro', antes: '16d12', depois: '12d12' }]);
  });
});

test('Ajustar ND antigo, sem prévia dos poderes: nada quebra e as caixas não aparecem', async () => {
  const d = novo();
  d.estado.itensExtras = [sopro()];
  const ctx = await d._prepareContext(); // o mock padrão não devolve poderesPrevia
  assert.equal(ctx.itensExtras[0].temDano, false);
  assert.deepEqual(ctx.previa.poderes, []);
});

test('ler o formulário: as caixas do poder viram a flag no item; "efeito" desabilitado fica de fora', async () => {
  const d = novo();
  d.estado.itensExtras = [sopro(), sopro({ name: 'Rugido' })];
  const caixa = (marcada, desabilitada = false) => ({ checked: marcada, disabled: desabilitada });
  const linha = (indice, ajustar, efeito) => ({
    dataset: { item: String(indice) },
    querySelector: (s) => (s === '[data-campo-item=ajustar]' ? ajustar : s === '[data-campo-item=efeito]' ? efeito : null),
  });
  const tela = (linhas) => ({ querySelector: () => null, querySelectorAll: (s) => (s === '[data-item]' ? linhas : []) });
  d.render = async () => {};
  d.element = tela([linha(0, caixa(true), caixa(false)), linha(1, caixa(true), caixa(true, true))]);
  await DialogoForja.DEFAULT_OPTIONS.actions.addAtaque.call(d); // lê o formulário antes de mexer
  assert.deepEqual(d.estado.itensExtras[0].flags[AJUSTE_ND].danoPoder, { ajustar: true, efeito: false });
  assert.deepEqual(d.estado.itensExtras[1].flags[AJUSTE_ND].danoPoder, { ajustar: true }); // efeito desabilitado: o Ajustar ND detecta
  d.element = tela([linha(0, caixa(false), caixa(false)), linha(1, caixa(true), caixa(true, true))]);
  await DialogoForja.DEFAULT_OPTIONS.actions.addAtaque.call(d);
  assert.equal(AJUSTE_ND in d.estado.itensExtras[0].flags, false); // desligou: a flag some
});
