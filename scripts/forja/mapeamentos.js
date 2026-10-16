// Portado de t20-conversor-5e (2026-10-15): só os códigos do sistema Tormenta20 e o ND.
// Códigos conferidos no foundryTemplate.js do Crias de Megalokk.

export const CODIGOS_TAMANHO = ['min', 'peq', 'med', 'gra', 'eno', 'col'];
export const CODIGOS_TIPO = ['ani', 'con', 'esp', 'hum', 'mon', 'mor'];
export const CHAVES_DANO = [
  'acido', 'corte', 'eletricidade', 'essencia', 'fogo', 'frio', 'impacto', 'luz',
  'psiquico', 'perfuracao', 'trevas', 'perda', 'dano',
];
// Escalas do Bando (indivíduos) e o aumento de ND padrão de cada uma: a mesma tabela do Ajustar ND (que não a expõe na API).
export const ESCALAS_BANDO = ['10-20', '20-40', '50-70', '80-100'];
const AUMENTO_PADRAO = { '10-20': 2, '20-40': 2, '50-70': 4, '80-100': 6 };
export const aumentoPadrao = (escala) => AUMENTO_PADRAO[escala] ?? 2;

// Fórmula de dano aceita no dano extra ("2d6", "3d8+3").
export const FORMULA_DANO = /^\d*d\d+(?:[+-]\d+)*$/;
export const NDS = ['1/4', '1/2', ...Array.from({ length: 20 }, (_, i) => String(i + 1)), 'S', 'S+'];

// Mesma regra do Ajustar ND (tabelas.js): '1/4' = 0,25; '1/2' = 0,5; 'S' = 21; 'S+' = 22.
export function valorND(nd) {
  const texto = String(nd).trim();
  if (texto === '1/4') return 0.25;
  if (texto === '1/2') return 0.5;
  if (texto === 'S') return 21;
  if (texto === 'S+') return 22;
  const n = parseInt(texto, 10);
  return Number.isNaN(n) ? 0 : n;
}

// A API do Ajustar ND usa os códigos do sistema (solo, lackey, special); a tela usa as chaves da tabela (solo, lacaio, especial).
const PAPEL_DO_SISTEMA = { solo: 'solo', lacaio: 'lackey', especial: 'special' };

export function papelDoSistema(papel) {
  const codigo = PAPEL_DO_SISTEMA[String(papel).trim().toLowerCase()];
  if (!codigo) throw new Error(`Papel desconhecido: "${papel}"`);
  return codigo;
}
