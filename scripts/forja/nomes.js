// Nomes de criatura nos textos dos poderes arrastados ("O golem de ferro expele..."): achar e trocar pelo nome da ameaça.
// O texto original traz hífens, espaços e acentos de vários jeitos (hífen "não separável", travessão, espaço especial, letra
// decomposta, espaço de largura zero, hífen seguido de quebra de linha), então o casamento ignora maiúscula, acento,
// caracteres invisíveis e a diferença entre hífen e espaço (vários seguidos contam como um), e só vale para palavra inteira.

export const listaDeNomes = (campo) => [...new Set(String(campo ?? '').split(/[,;\n]/).map((n) => n.trim()).filter(Boolean))];

// Cada caractere vira uma letra minúscula sem acento; espaços (inclusive o não separável) e hífens viram um espaço só, e vários
// seguidos contam como um. Espaço de largura zero e afins não existem para o casamento.
const INVISIVEL = /[\u200b-\u200d\u2060\ufeff]/;
const dobrarChar = (c) => (/[\s\u00ad\u2010-\u2015\u2212-]/.test(c) ? ' ' : c.normalize('NFD')[0].toLowerCase());
// `f` são os caracteres dobrados e `pos[k]` o índice, no texto original, do caractere que deu origem a f[k].
function dobrar(texto) {
  const f = [];
  const pos = [];
  Array.from(texto.normalize('NFC')).forEach((c, i) => {
    if (INVISIVEL.test(c)) return;
    const d = dobrarChar(c);
    if (d === ' ' && f.at(-1) === ' ') return;
    f.push(d);
    pos.push(i);
  });
  return { f, pos };
}
const ehLetra = (c) => c !== undefined && /\p{L}/u.test(c);

export const igualNome = (a, b) => dobrar(a).f.join('') === dobrar(b).f.join('');

// Trecho de texto (já sem marcas HTML) sem `&nbsp;`, em NFC: é nele que se procura e dele que sai o resultado.
const limpar = (parte) => parte.replace(/&nbsp;/g, ' ').normalize('NFC');

// [{ de, ate, nome }] (índices de caractere no texto) sem sobreposição, em ordem. O nome mais longo vem primeiro ("orc mutante" antes de "orc").
function achar(texto, nomes) {
  const { f: t, pos } = dobrar(texto);
  const livre = new Array(t.length).fill(true);
  const achados = [];
  for (const nome of [...nomes].sort((x, y) => y.length - x.length)) {
    const n = dobrar(nome.trim()).f;
    if (!n.length) continue;
    for (let i = 0; i + n.length <= t.length; i++) {
      if (!n.every((c, k) => t[i + k] === c) || ehLetra(t[i - 1]) || ehLetra(t[i + n.length])) continue;
      if (!livre.slice(i, i + n.length).every(Boolean)) continue;
      livre.fill(false, i, i + n.length);
      achados.push({ de: pos[i], ate: pos[i + n.length - 1] + 1, nome }); // posições no texto original
      i += n.length - 1;
    }
  }
  return achados.sort((a, b) => a.de - b.de);
}

const partes = (html) => String(html ?? '').split(/(<[^>]*>)/); // as marcas HTML (índices ímpares) não entram na busca
const ehMarca = (parte) => parte.startsWith('<');

// Troca os nomes por `nova` (que o chamador já escapou para HTML) só no texto fora das marcas. Sem ocorrência, devolve o mesmo html.
export function trocarNomes(html, nomes, nova) {
  if (!nomes.length || !html) return html;
  let mudou = false;
  const saida = partes(html).map((parte) => {
    if (ehMarca(parte)) return parte;
    const texto = limpar(parte);
    const achados = achar(texto, nomes);
    if (!achados.length) return parte;
    mudou = true;
    const letras = Array.from(texto);
    let fim = 0;
    let resultado = '';
    for (const { de, ate } of achados) {
      resultado += letras.slice(fim, de).join('') + nova;
      fim = ate;
    }
    return resultado + letras.slice(fim).join('');
  });
  return mudou ? saida.join('') : html;
}

// Os nomes da lista (como o mestre os digitou, na ordem da lista) que aparecem no texto.
export function nomesCitados(html, nomes) {
  const citados = new Set();
  for (const parte of partes(html)) {
    if (!ehMarca(parte)) achar(limpar(parte), nomes).forEach((a) => citados.add(a.nome));
  }
  return nomes.filter((n) => citados.has(n));
}
