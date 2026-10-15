// Valida o formulário e devolve a ameaça neutra. Função pura: os erros voltam como códigos, que o diálogo traduz.
import { CODIGOS_TAMANHO, CODIGOS_TIPO, CHAVES_DANO, NDS } from './mapeamentos.js';
import { TIPOS_ITEM_EXTRA } from './itens-extras.js';

export const ATRIBUTOS = ['for', 'des', 'con', 'int', 'sab', 'car'];
export const PAPEIS_TABELA = ['solo', 'lacaio', 'especial'];
export const TIPOS_ATAQUE = ['cac', 'ad'];

const inteiro = (valor, padrao = 0) => {
  const n = parseInt(valor, 10);
  return Number.isNaN(n) ? padrao : n;
};

// Devolve { ok, erros, ameaca }. `ameaca` só existe quando ok.
export function ameacaDeFormulario(f) {
  const erros = [];

  const nome = String(f.nome ?? '').trim();
  if (!nome) erros.push('nome');
  if (!NDS.includes(String(f.nd))) erros.push('nd');
  if (!PAPEIS_TABELA.includes(f.papel)) erros.push('papel');
  if (!CODIGOS_TAMANHO.includes(f.tamanho)) erros.push('tamanho');
  if (!CODIGOS_TIPO.includes(f.tipo)) erros.push('tipo');

  const deslocamento = f.deslocamento === '' ? 9 : Number(f.deslocamento ?? 9); // campo apagado na tela volta ao padrão, não a 0 m
  if (!(deslocamento >= 0)) erros.push('deslocamento');

  const atributos = {};
  for (const chave of ATRIBUTOS) atributos[chave] = Math.min(30, Math.max(-10, inteiro(f.atributos?.[chave], 0)));

  const ataques = (f.ataques ?? []).map((a, i) => {
    const nomeAtaque = String(a.nome ?? '').trim();
    if (!nomeAtaque) erros.push(`ataque-${i}-nome`);
    return {
      nome: nomeAtaque,
      distancia: a.tipo === 'ad',
      tipoDano: CHAVES_DANO.includes(a.dano) ? a.dano : 'dano',
      qtd: Math.max(1, inteiro(a.qtd, 1)),
    };
  });

  if (erros.length) return { ok: false, erros };
  return {
    ok: true,
    erros: [],
    ameaca: {
      nome,
      conceito: String(f.conceito ?? '').trim(),
      img: String(f.img ?? '').trim(),
      token: String(f.token ?? '').trim(),
      nd: String(f.nd),
      papel: f.papel,
      tamanho: f.tamanho,
      tipo: f.tipo,
      deslocamento,
      atributos,
      ataques,
      itensExtras: Array.isArray(f.itensExtras) ? f.itensExtras.filter((i) => TIPOS_ITEM_EXTRA.includes(i?.type)) : [],
      chefeFinal: Boolean(f.chefeFinal),
      conjurador: Boolean(f.conjurador),
      conjuracao: ATRIBUTOS.includes(f.conjuracao) ? f.conjuracao : 'int',
    },
  };
}
