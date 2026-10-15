// Portado de t20-conversor-5e (2026-10-15), sem as candidatas do 5e.tools.
// Imagens do retrato e do token no Foundry: baixar de uma URL, enviar à pasta do módulo.
// Depende do navegador e do Foundry (fetch, canvas, FilePicker); as partes puras ficam em forja/imagem.js.
import { ID_FORJA } from './forja/criar-ator.js';
import { PASTA_IMAGENS, nomeDoArquivo } from './forja/imagem.js';

const t = (chave) => game.i18n.localize(chave);

export const PREFIXO_IMAGEM = { img: 'retrato', token: 'token' };

// Plano B quando o `fetch` é bloqueado (o Foundry pode restringir conexões, mas deixa carregar imagens):
// carrega como imagem com CORS e redesenha num canvas. Só serve a sites que liberam CORS; sai em WebP sem perdas.
const baixarComoImagem = (url) => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onerror = () => reject(new Error('a imagem não carrega com CORS'));
  img.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('canvas vazio'))), 'image/webp', 1);
    } catch (erro) { reject(erro); } // canvas "sujo" (sem CORS) lança SecurityError
  };
  img.src = `${url}${url.includes('?') ? '&' : '?'}cors=${Date.now()}`; // outra URL: ignora a cópia em cache sem CORS
});

// Grava a imagem na pasta do módulo (em Data) e devolve o caminho. Precisa da permissão de enviar arquivos.
export async function guardarImagem(arquivo) {
  const FilePicker = foundry.applications.apps.FilePicker.implementation;
  let caminho = '';
  for (const parte of PASTA_IMAGENS.split('/')) { // cria a pasta passo a passo; se já existe, segue
    caminho = caminho ? `${caminho}/${parte}` : parte;
    await FilePicker.createDirectory('data', caminho).catch((erro) => {
      if (!/exist/i.test(erro.message)) console.warn(`${ID_FORJA} | criar pasta ${caminho}:`, erro);
    });
  }
  const resposta = await FilePicker.upload('data', PASTA_IMAGENS, arquivo, {});
  // O Foundry devolve {} sem explicar quando o envio falha por dentro, e false quando já mostrou o erro.
  if (!resposta?.path) throw new Error(resposta?.message ?? t('T20FA.ErroUploadSemResposta'));
  return resposta.path;
}

// Baixa uma URL (o pedido sai do navegador, então o site precisa permitir CORS) e devolve o File.
async function baixarArquivo(url, campo) {
  let blob;
  let nome;
  try {
    // cache "reload": a mesma URL já carregada como <img> fica no cache sem o cabeçalho de CORS e quebraria este pedido
    const resposta = await fetch(url, { cache: 'reload' });
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    blob = await resposta.blob();
    if (!blob.type.startsWith('image/')) throw new Error(t('T20FA.ErroNaoImagem'));
    nome = nomeDoArquivo(url, blob.type);
  } catch (erroFetch) {
    if (/^HTTP 4\d\d$/.test(erroFetch.message)) throw erroFetch; // o site respondeu: o endereço não existe, não adianta o plano B
    try {
      blob = await baixarComoImagem(url);
    } catch (erroImagem) {
      throw new Error(`${erroFetch.message}; ${erroImagem.message}`, { cause: erroImagem });
    }
    nome = nomeDoArquivo(url).replace(/\.\w{2,5}$/, '.webp'); // o canvas sempre devolve WebP
  }
  return new File([blob], `${PREFIXO_IMAGEM[campo]}-${nome}`, { type: blob.type });
}

// Baixa a imagem da URL e guarda no Foundry; devolve o caminho. `campo` ('img' ou 'token') vira prefixo do nome.
export async function trazerDaUrl(url, campo) {
  let arquivo;
  try {
    arquivo = await baixarArquivo(url, campo);
  } catch (erro) {
    throw new Error(`${t('T20FA.EtapaBaixar')}: ${erro.message}`, { cause: erro });
  }
  try {
    return await guardarImagem(arquivo);
  } catch (erro) {
    throw new Error(`${t('T20FA.EtapaGuardar')}: ${erro.message}`, { cause: erro });
  }
}
