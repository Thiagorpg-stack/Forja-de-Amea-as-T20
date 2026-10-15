// Portado de t20-conversor-5e (2026-10-15).
// Itens arrastados para o diálogo (poder e magia do T20): vão para o ator como estão, só ganham id novo na criação.
import { ID_FORJA } from './criar-ator.js';

export const TIPOS_ITEM_EXTRA = ['poder', 'magia'];

export function itemExtraDe(dados) {
  if (!dados || !TIPOS_ITEM_EXTRA.includes(dados.type)) return null;
  const { _id, folder, sort, ownership, _stats, ...resto } = structuredClone(dados);
  return { ...resto, flags: { ...resto.flags, [ID_FORJA]: { extra: true } } };
}
