// Portado de t20-conversor-5e (2026-10-15); `ataqueDeArma` é novo da Forja.
// Itens arrastados para o diálogo: poder e magia do T20 vão para o ator como estão, só ganham id novo na criação;
// arma vira uma linha de ataque (o dano principal sai da tabela do ND).
import { ID_FORJA } from './criar-ator.js';
import { CHAVES_DANO, FORMULA_DANO } from './mapeamentos.js';
import { ID_AJUSTE_ND } from '../api-ajuste-nd.js';

export const TIPOS_ITEM_EXTRA = ['poder', 'magia'];

export function itemExtraDe(dados) {
  if (!dados || !TIPOS_ITEM_EXTRA.includes(dados.type)) return null;
  const { _id, folder, sort, ownership, _stats, ...resto } = structuredClone(dados);
  return { ...resto, flags: { ...resto.flags, [ID_FORJA]: { extra: true } } };
}

// Linha de ataque a partir de uma arma do T20: nome, propósito, tipo de dano, quantidade e dano adicional.
// Na arma, rolls[dano].parts[0] é o dano principal, [1] é o atributo somado ao dano e o adicional começa em [2].
export function ataqueDeArma(dados) {
  if (dados?.type !== 'arma') return null;
  const partes = dados.system?.rolls?.find((r) => r.type === 'dano')?.parts ?? [];
  const tipoDe = (t) => (CHAVES_DANO.includes(t) ? t : 'dano');
  return {
    nome: String(dados.name ?? ''),
    tipo: dados.system?.proposito === 'disparo' ? 'ad' : 'cac',
    dano: tipoDe(partes[0]?.[1]),
    qtd: Math.max(1, parseInt(dados.system?.ataques, 10) || 1),
    descricao: String(dados.system?.description?.value ?? ''),
    danoExtra: partes.slice(2)
      .map(([formula, tipo]) => ({ formula: String(formula ?? '').replace(/\s+/g, ''), tipo: tipoDe(tipo) }))
      .filter((d) => FORMULA_DANO.test(d.formula)), // fórmula com variável (@mod) fica de fora
  };
}

// O Ajustar ND só recalcula o dano do poder que leva a flag danoPoder = { ajustar, efeito } (sem `efeito` ele detecta pelo
// texto). A escolha do mestre viaja dentro do próprio item arrastado: remover o item remove a escolha. Devolve uma cópia.
export function comDanoAjustado(item, { ajustar, efeito }) {
  const copia = structuredClone(item);
  copia.flags ??= {};
  if (ajustar) {
    copia.flags[ID_AJUSTE_ND] = { ...copia.flags[ID_AJUSTE_ND], danoPoder: { ajustar: true, ...(efeito !== undefined && { efeito }) } };
  } else if (copia.flags[ID_AJUSTE_ND]) {
    delete copia.flags[ID_AJUSTE_ND].danoPoder;
    if (!Object.keys(copia.flags[ID_AJUSTE_ND]).length) delete copia.flags[ID_AJUSTE_ND];
  }
  return copia;
}
