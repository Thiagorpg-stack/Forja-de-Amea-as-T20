// Portado de t20-conversor-5e (2026-10-15), sem CR, ritmo nem importação de 5e.
// Monta os dados do ator T20 a partir da ameaça neutra. As funções daqui são puras;
// quem cria o ator no Foundry (diálogo) injeta gerarId e usa Actor.create.
import { criarActorTemplate, criarItemArma } from './modelo-ator.js';
import { papelDoSistema, valorND } from './mapeamentos.js';

export const ID_FORJA = 't20-forja-ameacas';
export const NOME_PASTA = 'Forja de Ameaças';

// Tamanho do token em casas da grade.
const CASAS_DO_TAMANHO = { min: 1, peq: 1, med: 1, gra: 2, eno: 3, col: 4 };

export const casasDoTamanho = (tamanho) => CASAS_DO_TAMANHO[tamanho] ?? 1;

const escaparHtml = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const escaparRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// O poder arrastado de uma criatura fala dela no texto ("O golem de ferro expele..."): o nome completo da criatura de
// origem (flag gravada ao soltar o poder) vira o nome desta ameaça, só no texto fora das marcas HTML.
// shortcut: só o nome completo e o artigo fica; forma curta ("o golem") e a concordância de gênero ficam como estão.
export function comNomeDaAmeaca(item, nome) {
  const origem = item.flags?.[ID_FORJA]?.origem;
  const texto = item.system?.description?.value;
  if (!origem || !texto) return item;
  const padrao = new RegExp(escaparRegex(origem), 'gi');
  const novo = texto.split(/(<[^>]*>)/).map((parte) => (parte.startsWith('<') ? parte : parte.replace(padrao, () => escaparHtml(nome)))).join('');
  if (novo === texto) return item;
  const copia = structuredClone(item);
  copia.system.description.value = novo;
  return copia;
}

// Dano elementar aparece na linha de ataques ("1d6 de fogo"); o físico é omitido, como nas fichas oficiais.
const DANO_NA_LINHA = {
  acido: 'ácido', eletricidade: 'eletricidade', essencia: 'essência', fogo: 'fogo', frio: 'frio', luz: 'luz',
  psiquico: 'psíquico', trevas: 'trevas', perda: 'perda de PV',
};

// "Mordida +0 (1d6) e 2 Garra +0 (1d6 de fogo)." Os números são provisórios: ao ajustar, o Ajustar ND troca o
// bônus e a fórmula de cada arma citada e deixa o resto do texto como está.
function linhaDeAtaques(ataques) {
  const partes = ataques.map((a) => (
    `${a.qtd > 1 ? `${a.qtd} ` : ''}${a.nome} +0 (1d6${DANO_NA_LINHA[a.tipoDano] ? ` de ${DANO_NA_LINHA[a.tipoDano]}` : ''})`));
  if (!partes.length) return '';
  return `${partes.length > 1 ? `${partes.slice(0, -1).join(', ')} e ${partes.at(-1)}` : partes[0]}.`;
}

// Valores de CONST.TOKEN_DISPLAY_MODES: nome ao passar o mouse (dono) e barra sempre visível para o dono, como no original.
const TOKEN_NOME_DONO_PASSA_MOUSE = 20;
const TOKEN_BARRA_DONO = 40;

export function montarDadosAtor(ameaca, { gerarId, pasta = null, agora = new Date().toISOString() }) {
  const { nd } = ameaca;
  const dados = criarActorTemplate();
  dados.name = ameaca.nome;
  dados.folder = pasta;

  const sys = dados.system;
  for (const [chave, mod] of Object.entries(ameaca.atributos)) sys.atributos[chave].base = mod;
  sys.attributes.nd = nd;
  if (ameaca.conjurador) { // sem PM o conjurador não lança nada: 5 por ND (valor sugerido, o mestre pode mudar)
    sys.attributes.pm.max = sys.attributes.pm.value = Math.max(1, Math.round(5 * valorND(nd)));
    sys.attributes.conjuracao = ameaca.conjuracao;
  }
  sys.attributes.movement.walk.base = ameaca.deslocamento;
  sys.detalhes.role = papelDoSistema(ameaca.papel);
  sys.detalhes.tipo = ameaca.tipo;
  sys.tracos.tamanho = ameaca.tamanho;
  if (ameaca.conceito) sys.detalhes.biography.value = `<p>${escaparHtml(ameaca.conceito)}</p>`;
  sys.detalhes.ataquescac = linhaDeAtaques(ameaca.ataques.filter((a) => !a.distancia));
  sys.detalhes.ataquesad = linhaDeAtaques(ameaca.ataques.filter((a) => a.distancia));

  // Sem imagem escolhida ficam os ícones do modelo; sem token, o token usa o retrato.
  if (ameaca.img) dados.img = ameaca.img;
  const token = ameaca.token || ameaca.img;
  if (token) dados.prototypeToken.texture.src = token;

  const casas = casasDoTamanho(ameaca.tamanho);
  dados.prototypeToken.name = ameaca.nome;
  dados.prototypeToken.displayName = TOKEN_NOME_DONO_PASSA_MOUSE;
  dados.prototypeToken.displayBars = TOKEN_BARRA_DONO;
  dados.prototypeToken.width = casas;
  dados.prototypeToken.height = casas;

  const armas = ameaca.ataques.map((ataque, indice) => {
    const item = criarItemArma({
      nome: ataque.nome, distancia: ataque.distancia, tipoDano: ataque.tipoDano, ataques: ataque.qtd,
      danoExtra: ataque.danoExtra, descricao: ataque.descricao,
    });
    item._id = gerarId();
    item.flags = { [ID_FORJA]: { indiceAtaque: indice } };
    return item;
  });
  const extras = (ameaca.itensExtras ?? []).map((item) => ({ ...structuredClone(comNomeDaAmeaca(item, ameaca.nome)), _id: gerarId() }));
  dados.items = [...armas, ...extras];

  dados.flags = { [ID_FORJA]: { origem: 'forja', nd, criadoEm: agora } };
  return dados;
}

// { idDaArma: quantidade } a partir dos itens do ator (toObject().items), lendo a flag de cada arma.
export function ataquesPorArmaDe(itens, ameaca) {
  const resultado = {};
  for (const item of itens) {
    if (item.type !== 'arma') continue;
    const indice = item.flags?.[ID_FORJA]?.indiceAtaque;
    if (indice === undefined) continue;
    resultado[item._id] = ameaca.ataques[indice]?.qtd ?? 1;
  }
  return resultado;
}
