// Diálogo "Forjar Ameaça" (adaptado do diálogo do 5e para T20): o mestre escolhe ND e papel, a ficha é completada
// pelo Ajustar ND. Simula o ajuste num ator não salvo e só cria o ator quando o mestre confirma.
import { obterApi } from './api-ajuste-nd.js';
import { itemExtraDe, ataqueDeArma } from './forja/itens-extras.js';
import { ehUrl } from './forja/imagem.js';
import { PREFIXO_IMAGEM, guardarImagem, trazerDaUrl } from './imagem-foundry.js';
import { papelDoSistema, CODIGOS_TAMANHO, CODIGOS_TIPO, CHAVES_DANO, NDS } from './forja/mapeamentos.js';
import { ameacaDeFormulario, ATRIBUTOS } from './forja/ameaca.js';
import { montarDadosAtor, ataquesPorArmaDe, ID_FORJA, NOME_PASTA } from './forja/criar-ator.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const PAPEIS = [['solo', 'Solo'], ['lacaio', 'Lacaio'], ['especial', 'Especial']];
const NOMES_TAMANHO = { min: 'Minúsculo', peq: 'Pequeno', med: 'Médio', gra: 'Grande', eno: 'Enorme', col: 'Colossal' };
const NOMES_TIPO = { ani: 'Animal', con: 'Construto', esp: 'Espírito', hum: 'Humanoide', mon: 'Monstro', mor: 'Morto-vivo' };
const NOMES_DANO = {
  acido: 'Ácido', corte: 'Corte', eletricidade: 'Eletricidade', essencia: 'Essência', fogo: 'Fogo', frio: 'Frio',
  impacto: 'Impacto', luz: 'Luz', psiquico: 'Psíquico', perfuracao: 'Perfuração', trevas: 'Trevas', perda: 'Perda de PV', dano: 'Dano',
};
const TESTES = { fort: 'Fortitude', refl: 'Reflexos', vont: 'Vontade' };
const NOMES_ATRIBUTO = { for: 'FOR', des: 'DES', con: 'CON', int: 'INT', sab: 'SAB', car: 'CAR' };

const t = (chave) => game.i18n.localize(chave);

export class DialogoForja extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: `${ID_FORJA}-dialogo`,
    classes: ['t20-forja-ameacas'],
    position: { width: 720, height: 'auto' },
    window: { resizable: true, icon: 'fas fa-hammer' },
    actions: {
      criar: DialogoForja.#criar,
      cancelar: DialogoForja.#cancelar,
      addAtaque: DialogoForja.#addAtaque,
      removerAtaque: DialogoForja.#removerAtaque,
      addExtra: DialogoForja.#addExtra,
      removerExtra: DialogoForja.#removerExtra,
      escolherImagem: DialogoForja.#escolherImagem,
      enviarImagem: DialogoForja.#enviarImagem,
      baixarImagem: DialogoForja.#baixarImagem,
      removerItemExtra: DialogoForja.#removerItemExtra,
    },
  };

  // `scrollable`: o Foundry guarda e devolve a rolagem da janela quando ela se redesenha (senão voltaria ao topo a cada clique).
  // O elemento da parte já é a <section class="forja"> que rola, então o seletor é vazio (a própria parte).
  static PARTS = { corpo: { template: `modules/${ID_FORJA}/templates/dialogo-forja.hbs`, scrollable: [''] } };

  constructor(options = {}) {
    super(options);
    this.estado = {
      nome: '', conceito: '', img: '', token: '', itensExtras: [],
      nd: '5', papel: 'solo', chefeFinal: false, conjurador: false, conjuracao: 'int',
      tamanho: 'med', tipo: 'mon', deslocamento: 9,
      atributos: Object.fromEntries(ATRIBUTOS.map((a) => [a, 0])),
      ordem: ['fort', 'refl', 'vont'],
      ataques: [{ nome: 'Ataque', tipo: 'cac', dano: 'corte', qtd: 1, descricao: '', danoExtra: [] }],
    };
    this.pronto = null; // { dados, ameaca, opcoes }
    this.criando = false; // trava o clique duplo em "Criar"
    this.tocado = false; // só mostra erros de validação depois da primeira edição do mestre
  }

  get title() { return t('T20FA.Titulo'); }

  // ---------- cálculo ----------

  #preparar() {
    const api = obterApi();
    const e = this.estado;
    const validacao = ameacaDeFormulario(e);
    if (!validacao.ok) return { erros: validacao.erros.map((c) => this.#erroLegivel(c)) };
    const { ameaca } = validacao;
    const dados = montarDadosAtor(ameaca, { gerarId: () => foundry.utils.randomID() });
    const opcoes = {
      nd: ameaca.nd, papel: papelDoSistema(ameaca.papel), ordemResistencias: e.ordem,
      templates: { chefeFinal: ameaca.chefeFinal },
    };
    return { api, ameaca, limiteAtaques: api.maxAtaques(ameaca.nd), dados, opcoes };
  }

  #erroLegivel(codigo) {
    const ataque = /^ataque-(\d+)-(nome|extra)$/.exec(codigo);
    if (ataque) return `${t(ataque[2] === 'nome' ? 'T20FA.ErroAtaqueNome' : 'T20FA.ErroAtaqueExtra')} (${Number(ataque[1]) + 1})`;
    return t(`T20FA.Erro.${codigo}`);
  }

  async _prepareContext() {
    const e = this.estado;
    const ctx = {
      e, papeis: PAPEIS.map(([v, r]) => ({ valor: v, rotulo: r, selecionado: v === e.papel })),
      nds: NDS.map((v) => ({ valor: v, selecionado: v === e.nd })),
      tamanhos: CODIGOS_TAMANHO.map((v) => ({ valor: v, rotulo: NOMES_TAMANHO[v], selecionado: v === e.tamanho })),
      tipos: CODIGOS_TIPO.map((v) => ({ valor: v, rotulo: NOMES_TIPO[v], selecionado: v === e.tipo })),
      atributos: ATRIBUTOS.map((a) => ({ chave: a, rotulo: NOMES_ATRIBUTO[a], valor: e.atributos[a] })),
      conjuracoes: ATRIBUTOS.map((a) => ({ valor: a, rotulo: NOMES_ATRIBUTO[a], selecionado: a === e.conjuracao })),
      ataques: e.ataques.map((a, indice) => ({
        indice, nome: a.nome, qtd: a.qtd,
        tipos: [['cac', t('T20FA.CorpoACorpo')], ['ad', t('T20FA.ADistancia')]].map(([v, r]) => ({ valor: v, rotulo: r, selecionado: v === a.tipo })),
        danos: CHAVES_DANO.map((v) => ({ valor: v, rotulo: NOMES_DANO[v], selecionado: v === a.dano })),
        extras: (a.danoExtra ?? []).map((x, j) => ({
          indice: j, formula: x.formula,
          danos: CHAVES_DANO.map((v) => ({ valor: v, rotulo: NOMES_DANO[v], selecionado: v === x.tipo })),
        })),
      })),
      ordem: ['Forte', 'Média', 'Fraca'].map((rotulo, i) => ({
        indice: i, rotulo,
        opcoes: Object.entries(TESTES).map(([valor, nome]) => ({ valor, nome, selecionado: valor === e.ordem[i] })),
      })),
      itensExtras: e.itensExtras.map((i, indice) => ({ indice, nome: i.name, tipo: i.type, img: i.img })),
      erros: [], previa: null,
    };
    this.pronto = null;

    let p;
    try {
      p = this.#preparar();
    } catch (erro) {
      console.error(`${ID_FORJA} |`, erro);
      ctx.erros = [erro.message?.startsWith('T20FA.') ? t(erro.message) : erro.message];
      return ctx;
    }
    if (p.erros) {
      ctx.erros = this.tocado ? p.erros : [];
      return ctx;
    }

    ctx.limiteAtaques = p.limiteAtaques;
    ctx.totalAtaques = p.ameaca.ataques.reduce((s, a) => s + a.qtd, 0);
    try {
      const rascunho = new CONFIG.Actor.documentClass(p.dados);
      const itens = rascunho.toObject().items;
      const opcoes = { ...p.opcoes, ataquesPorArma: ataquesPorArmaDe(itens, p.ameaca) };
      const idPorIndice = Object.fromEntries(itens.map((i) => [i.flags?.[ID_FORJA]?.indiceAtaque, i._id]));
      const r = await p.api.simular(rascunho, opcoes);
      ctx.previa = this.#montarPrevia(r, p.ameaca, idPorIndice);
      this.pronto = { dados: p.dados, ameaca: p.ameaca, opcoes: p.opcoes };
    } catch (erro) {
      console.error(`${ID_FORJA} |`, erro);
      ctx.erros = [erro.message];
    }
    return ctx;
  }

  #montarPrevia(r, ameaca, idPorIndice) {
    const linha = (rotulo, valor) => ({ rotulo, valor });
    const linhas = [
      linha('PV', r.update['system.attributes.pv.max']),
      linha('CD', r.update['system.attributes.cd']),
      linha('Defesa (total na ficha)', r.depois.defesa),
      ...(ameaca.ataques.length ? [linha('Ataque (Luta)', r.depois.pericias.luta)] : []),
      ...Object.entries(TESTES).map(([k, nome]) => linha(nome, r.depois.pericias[k])),
    ];
    const armas = ameaca.ataques.map((a, i) => ({ nome: a.nome, qtd: a.qtd, formula: r.plano.dano?.porArma?.[idPorIndice[i]]?.formula ?? '—' }));
    return { linhas, armas, danoAlvo: r.plano.linha.Dano, avisos: r.avisos, patamar: r.patamar, revisar: r.plano.revisar };
  }

  // ---------- leitura do formulário ----------

  #lerFormulario() {
    this.tocado = true;
    const el = this.element;
    const e = this.estado;
    const valor = (nome) => el.querySelector(`[name=${nome}]`)?.value;
    for (const campo of ['nome', 'conceito', 'img', 'token', 'nd', 'papel', 'tamanho', 'tipo', 'deslocamento', 'conjuracao']) {
      e[campo] = valor(campo) ?? e[campo];
    }
    e.chefeFinal = el.querySelector('[name=chefeFinal]')?.checked ?? e.chefeFinal;
    e.conjurador = el.querySelector('[name=conjurador]')?.checked ?? e.conjurador;
    ATRIBUTOS.forEach((a) => { e.atributos[a] = valor(`atributo-${a}`) ?? e.atributos[a]; });
    e.ordem = [0, 1, 2].map((i) => valor(`ordem-${i}`) ?? e.ordem[i]);
    // As linhas na tela espelham o estado, então lista vazia na tela é lista vazia no estado.
    const anteriores = e.ataques; // a descrição (vem da arma arrastada) não tem campo na tela
    e.ataques = [...el.querySelectorAll('[data-ataque]')].map((linha, i) => ({
      nome: linha.querySelector('[data-campo=nome]').value,
      tipo: linha.querySelector('[data-campo=tipo]').value,
      dano: linha.querySelector('[data-campo=dano]').value,
      qtd: linha.querySelector('[data-campo=qtd]').value,
      descricao: anteriores[i]?.descricao ?? '',
      danoExtra: [...linha.querySelectorAll('.forja__extra')].map((x) => ({ // não por [data-extra]: o botão remover também o tem
        formula: x.querySelector('[data-campo-extra=formula]').value,
        tipo: x.querySelector('[data-campo-extra=tipo]').value,
      })),
    }));
  }

  _onRender() {
    // Soltar um poder ou magia em qualquer lugar da janela (compêndio, outra ficha, diretório de itens).
    const zona = this.element.querySelector('.forja');
    zona?.addEventListener('dragover', (ev) => ev.preventDefault());
    zona?.addEventListener('drop', (ev) => this.#aoSoltar(ev));
    this.element.querySelectorAll('input:not([type=file]), select, textarea').forEach((campo) => {
      campo.addEventListener('change', () => this.#aoMudar());
    });
    this.element.querySelectorAll('[data-enviar]').forEach((campo) => {
      campo.addEventListener('change', async (ev) => {
        const arquivo = ev.target.files?.[0];
        if (!arquivo) return;
        try {
          const campoImagem = ev.target.dataset.enviar;
          this.estado[campoImagem] = await guardarImagem(new File([arquivo], `${PREFIXO_IMAGEM[campoImagem]}-${arquivo.name}`, { type: arquivo.type }));
        } catch (erro) {
          console.error(`${ID_FORJA} |`, erro);
          ui.notifications.error(`${t('T20FA.ErroEnviarImagem')}: ${erro.message}`);
        }
        await this.render();
      });
    });
  }

  async #aoMudar() {
    this.#lerFormulario();
    await this.render();
  }

  async #aoSoltar(ev) {
    ev.preventDefault();
    const leitor = foundry.applications.ux?.TextEditor?.implementation ?? TextEditor; // v13 e v14 / versões anteriores
    const arrasto = leitor.getDragEventData(ev);
    if (arrasto?.type !== 'Item') return;
    const item = await fromUuid(arrasto.uuid);
    const dados = item?.toObject();
    const linha = ataqueDeArma(dados); // arma vira linha de ataque; poder e magia entram como item
    const extra = itemExtraDe(dados);
    if (!linha && !extra) { ui.notifications.warn(game.i18n.format('T20FA.AvisoItemNaoSuportado', { tipo: item?.type ?? '?' })); return; }
    this.#lerFormulario();
    if (linha) this.estado.ataques.push(linha);
    else this.estado.itensExtras.push(extra);
    if (extra?.type === 'magia' && !this.estado.conjurador) { // magia sem PM não lança nada: o mestre desmarca se não quiser
      this.estado.conjurador = true;
      ui.notifications.info(t('T20FA.AvisoConjuradorMarcado'));
    }
    await this.render();
  }

  // ---------- ações ----------

  static async #addAtaque() {
    this.#lerFormulario();
    this.estado.ataques.push({ nome: '', tipo: 'cac', dano: 'corte', qtd: 1, descricao: '', danoExtra: [] });
    await this.render();
  }

  static async #addExtra(_ev, alvo) {
    this.#lerFormulario();
    this.estado.ataques[Number(alvo.dataset.indice)].danoExtra.push({ formula: '', tipo: 'dano' });
    await this.render();
  }

  static async #removerExtra(_ev, alvo) {
    this.#lerFormulario();
    this.estado.ataques[Number(alvo.dataset.indice)].danoExtra.splice(Number(alvo.dataset.extra), 1);
    await this.render();
  }

  static async #removerAtaque(_ev, alvo) {
    this.#lerFormulario();
    this.estado.ataques.splice(Number(alvo.dataset.indice), 1);
    await this.render();
  }

  static async #removerItemExtra(_ev, alvo) {
    this.#lerFormulario();
    this.estado.itensExtras.splice(Number(alvo.dataset.indice), 1);
    await this.render();
  }

  static #enviarImagem(_ev, alvo) {
    this.element.querySelector(`[data-enviar=${alvo.dataset.campo}]`).click();
  }

  // Baixa a imagem da URL que está no campo (o navegador faz o pedido) e guarda no Foundry.
  static async #baixarImagem(_ev, alvo) {
    this.#lerFormulario();
    const campo = alvo.dataset.campo;
    const url = String(this.estado[campo] ?? '').trim();
    if (!ehUrl(url)) { ui.notifications.warn(t('T20FA.AvisoSemUrl')); return; }
    try {
      this.estado[campo] = await trazerDaUrl(url, campo);
      ui.notifications.info(game.i18n.format('T20FA.ImagemSalva', { caminho: this.estado[campo] }));
    } catch (erro) {
      console.error(`${ID_FORJA} |`, erro);
      ui.notifications.error(`${t('T20FA.ErroBaixarImagem')} (${erro.message}) ${t('T20FA.DicaBaixar')}`);
    }
    await this.render();
  }

  // `data-campo` diz se a imagem escolhida é o retrato (img) ou o token.
  static async #escolherImagem(_ev, alvo) {
    this.#lerFormulario();
    const campo = alvo.dataset.campo;
    new foundry.applications.apps.FilePicker.implementation({
      type: 'image',
      current: this.estado[campo],
      callback: (caminho) => { this.estado[campo] = caminho; this.render(); },
    }).render(true);
  }

  static async #cancelar() {
    await this.close();
  }

  // Um segundo clique durante a criação (baixar imagens, duas passadas do Ajustar ND) criaria outro ator.
  static async #criar() {
    if (this.criando) return;
    this.criando = true;
    try { await this.#criarAtor(); } finally { this.criando = false; }
  }

  async #criarAtor() {
    this.#lerFormulario();
    // O ator não fica com link remoto: o navegador e módulos como o Tokenizer só carregam imagens que o site libera (CORS).
    for (const campo of ['img', 'token']) {
      const url = String(this.estado[campo] ?? '').trim();
      if (!ehUrl(url)) continue;
      try {
        this.estado[campo] = await trazerDaUrl(url, campo);
      } catch (erro) {
        console.error(`${ID_FORJA} |`, erro);
        ui.notifications.warn(`${t('T20FA.AvisoImagemFicouUrl')} (${erro.message}) ${t('T20FA.DicaBaixar')}`);
      }
    }
    await this.render(); // recalcula e preenche this.pronto
    if (!this.pronto) return;
    const { dados, ameaca, opcoes } = this.pronto;

    let ator;
    try {
      const api = obterApi();
      const pasta = game.folders.find((f) => f.type === 'Actor' && f.name === NOME_PASTA)
        ?? await Folder.create({ name: NOME_PASTA, type: 'Actor' });
      // O ator nasce já ajustado. Medido no Foundry 14 com o Tormenta20 1.6.6: atualizar as perícias de um ator que já existe
      // devolve "for" ao atributo de Fortitude, Reflexos e Vontade, e criar não. Por isso o Ajustar ND roda sobre um ator ainda
      // não salvo e `copiar: true` cria o ator final com tudo gravado, sem atualizar perícia depois.
      const rascunho = new CONFIG.Actor.documentClass({ ...dados, folder: pasta.id });
      const resultado = await api.simular(rascunho, { ...opcoes, ataquesPorArma: ataquesPorArmaDe(rascunho.toObject().items, ameaca) });
      ator = await api.aplicarAjuste(rascunho, resultado, { copiar: true });
      if (ator.name !== ameaca.nome) await ator.update({ name: ameaca.nome }); // a cópia vem com o sufixo "(ND 5)"
    } catch (erro) {
      console.error(`${ID_FORJA} |`, erro);
      if (ator) await ator.delete().catch(() => {});
      ui.notifications.error(`${t('T20FA.ErroCriar')}: ${erro.message}`);
      return;
    }
    ui.notifications.info(game.i18n.format('T20FA.Criado', { nome: ator.name }));
    await this.close();
    ator.sheet?.render(true);
  }
}

export function abrirForja() {
  try { obterApi(); } catch (erro) {
    ui.notifications.error(t(erro.message));
    return null;
  }
  return new DialogoForja().render({ force: true });
}
