// Portado de t20-conversor-5e (2026-10-15); `atualizacaoDePericias` é novo da Forja.
// O sistema Tormenta20 1.6.6 (Foundry 14) preenche com o padrão ("for", outros 0...) o que falta numa perícia atualizada
// por caminho parcial, e o envio do formulário da ficha ao fechá-la faz isso. Completa a atualização com os valores atuais
// de cada perícia tocada, antes de o Foundry limpar os dados. Função pura; `atuais` = _source.system.pericias.
const CAMINHO = /^system\.pericias\.([^.]+)\.([^.]+)/;

export function completarPericiasParciais(atuais, dados) {
  if (!atuais || !dados) return dados;
  const completa = (chave, presentes) => Object.fromEntries(Object.entries(atuais[chave]).filter(([campo]) => !presentes.has(campo)));
  const resultado = { ...dados };

  // caminhos achatados: "system.pericias.fort.treinado": false
  const tocadas = new Map();
  for (const caminho of Object.keys(dados)) {
    const m = CAMINHO.exec(caminho);
    if (m && atuais[m[1]]) tocadas.set(m[1], (tocadas.get(m[1]) ?? new Set()).add(m[2]));
  }
  for (const [chave, presentes] of tocadas) {
    for (const [campo, valor] of Object.entries(completa(chave, presentes))) {
      resultado[`system.pericias.${chave}.${campo}`] = structuredClone(valor);
    }
  }

  // objeto aninhado: { system: { pericias: { fort: { treinado: false } } } }
  const aninhadas = dados.system?.pericias;
  if (aninhadas && typeof aninhadas === 'object') {
    const pericias = { ...aninhadas };
    for (const [chave, parcial] of Object.entries(aninhadas)) {
      if (atuais[chave] && parcial && typeof parcial === 'object') {
        pericias[chave] = { ...structuredClone(completa(chave, new Set(Object.keys(parcial)))), ...parcial };
      }
    }
    resultado.system = { ...dados.system, pericias };
  }
  return resultado;
}

// Quem grava as perícias (o Ajustar ND) manda o system.pericias inteiro, mas o Foundry reduz a gravação ao que mudou
// ("outros" de Fortitude, por exemplo) e o sistema preenche com "for" o atributo que falta: Fortitude, Reflexos e Vontade
// saíam com FOR (confirmado no console: toda gravação do ajuste desfazia o atributo). Com `diff: false` o sistema recebe
// cada perícia completa. Devolve [dados, contexto] prontos para o Actor.update; só mexe em atualização que toca as perícias.
export function atualizacaoDePericias(atuais, dados, contexto) {
  const tocaPericias = Boolean(dados) && (Object.keys(dados).some((k) => k.startsWith('system.pericias')) || dados.system?.pericias);
  if (!tocaPericias) return [dados, contexto];
  return [completarPericiasParciais(atuais, dados), { ...contexto, diff: false }];
}

// Atributo que cada perícia deve ter depois de uma gravação: o que a gravação pediu (caminho achatado, objeto aninhado ou
// o system.pericias inteiro) ou, sem pedido, o que tinha antes. Devolve { chave: atributo } só das que ficaram diferentes.
export function atributosDesfeitos(antes, depois, dados) {
  const pedido = (chave) => dados?.[`system.pericias.${chave}.atributo`]
    ?? dados?.['system.pericias']?.[chave]?.atributo ?? dados?.system?.pericias?.[chave]?.atributo;
  const desfeitos = {};
  for (const [chave, pericia] of Object.entries(antes ?? {})) {
    const esperado = pedido(chave) ?? pericia.atributo;
    if (depois?.[chave] && depois[chave].atributo !== esperado) desfeitos[chave] = esperado;
  }
  return desfeitos;
}

// Envolve o Actor.update dos atores da Forja. O sistema 1.6.6 devolve "for" ao atributo de alguma perícia quando uma mesma
// gravação mexe em várias (medido no Foundry: uma perícia por vez grava certo; o Ajustar ND grava Fortitude, Reflexos,
// Vontade e Luta juntas). Depois de gravar, refaz o atributo desfeito, uma perícia por vez. `ehForja(ator)` diz se o ator é nosso.
export function envolverUpdate(atualizar, { ehForja, aviso = () => {} }) {
  return async function update(dados, contexto) {
    if (!ehForja(this)) return atualizar.call(this, dados, contexto);
    const antes = structuredClone(this._source.system?.pericias ?? {});
    const gravar = (d) => atualizar.call(this, ...atualizacaoDePericias(this._source.system?.pericias, d, contexto));
    const resultado = await gravar(dados);
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      const desfeitos = atributosDesfeitos(antes, this._source.system?.pericias, dados);
      if (!Object.keys(desfeitos).length) break;
      aviso(`refazendo o atributo de ${Object.keys(desfeitos).join(', ')}`);
      for (const [chave, atributo] of Object.entries(desfeitos)) await gravar({ [`system.pericias.${chave}.atributo`]: atributo });
    }
    return resultado;
  };
}
