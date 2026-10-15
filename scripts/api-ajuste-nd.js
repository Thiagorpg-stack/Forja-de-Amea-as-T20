// Portado de t20-conversor-5e (2026-10-15).
// Acesso à API do módulo Ajustar ND (tormenta20-ajuste-nd), versão 0.10.0 ou mais recente.
export const ID_AJUSTE_ND = 'tormenta20-ajuste-nd';
export const VERSAO_API_MINIMA = 2;

// Devolve a API ou lança um Error com a chave de texto do problema (T20FA.*).
export function obterApi() {
  const modulo = game.modules.get(ID_AJUSTE_ND);
  if (!modulo?.active) throw new Error('T20FA.ErroAjusteNdAusente');
  const api = modulo.api;
  if (!api || (api.versaoApi ?? 0) < VERSAO_API_MINIMA) throw new Error('T20FA.ErroAjusteNdAntigo');
  return api;
}
