// Portado de t20-conversor-5e (2026-10-15), sem as partes do 5e.tools.
// Imagens do retrato e do token que o módulo guarda no Foundry. Funções puras, sem dependência do Foundry.

// Pasta (na raiz de dados do usuário) onde ficam as imagens enviadas ou baixadas.
export const PASTA_IMAGENS = 'uploads/t20-forja-ameacas';

// Nome de arquivo seguro a partir da URL ("…/lobo/Lobo.webp?v=2" → "Lobo.webp"); sem extensão, usa o tipo MIME.
export function nomeDoArquivo(url, tipoMime = '') {
  let base = '';
  try { base = decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).pop() ?? ''); } catch { /* URL inválida: cai no nome padrão */ }
  base = base.replace(/[^\w.-]+/g, '_').replace(/^\.+/, '');
  if (!base) base = 'imagem';
  if (!/\.\w{2,5}$/.test(base)) base += `.${(tipoMime.split('/')[1] ?? 'webp').replace(/\+.*$/, '')}`;
  return base;
}

export const ehUrl = (texto) => /^https?:\/\/\S+$/i.test(String(texto ?? '').trim());
