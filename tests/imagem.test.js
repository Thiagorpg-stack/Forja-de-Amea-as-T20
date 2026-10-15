import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nomeDoArquivo, ehUrl } from '../scripts/forja/imagem.js';
import { completarPericiasParciais, atualizacaoDePericias, atributosDesfeitos, envolverUpdate } from '../scripts/forja/pericias.js';

test('nome do arquivo vem da URL, sem caracteres perigosos', () => {
  assert.equal(nomeDoArquivo('https://x.com/a/Lobo%20Gigante.png?v=2#topo'), 'Lobo_Gigante.png');
  const traversal = nomeDoArquivo('https://x.com/a/..%2F..%2Fsegredo.png');
  assert.doesNotMatch(traversal, /[\\/]/);   // nunca escapa da pasta
  assert.doesNotMatch(traversal, /^\./);
  assert.equal(nomeDoArquivo('https://x.com/a/token', 'image/png'), 'token.png');
  assert.equal(nomeDoArquivo('https://x.com/', 'image/svg+xml'), 'imagem.svg');
  assert.equal(nomeDoArquivo('isto não é url', 'image/webp'), 'imagem.webp');
});

test('só http e https contam como URL', () => {
  assert.equal(ehUrl('https://x.com/a.png'), true);
  assert.equal(ehUrl(' http://x.com/a.png '), true);
  assert.equal(ehUrl('uploads/lobo.webp'), false);
  assert.equal(ehUrl('javascript:alert(1)'), false);
  assert.equal(ehUrl(''), false);
});

test('atualização parcial de perícia é completada com os valores atuais (sistema 1.6.6)', () => {
  const atuais = { fort: { atributo: 'con', outros: 4, treinado: false }, luta: { atributo: 'for', outros: 1, treinado: true } };
  const r = completarPericiasParciais(atuais, { 'system.pericias.fort.treinado': true, 'system.attributes.pv.max': 9 });
  assert.deepEqual([r['system.pericias.fort.atributo'], r['system.pericias.fort.outros'], r['system.pericias.fort.treinado']], ['con', 4, true]);
  assert.equal('system.pericias.luta.outros' in r, false); // só completa a perícia tocada
  assert.equal(r['system.attributes.pv.max'], 9);
  assert.equal(completarPericiasParciais(undefined, { a: 1 }).a, 1);
});

test('atualização que toca as perícias vai sem diff (o Foundry não a reduz ao que mudou) e completa o caminho parcial', () => {
  const atuais = { fort: { atributo: 'con', outros: 4, treinado: false } };
  // o que o Ajustar ND manda: o system.pericias inteiro, num caminho achatado
  const [dados, contexto] = atualizacaoDePericias(atuais, { 'system.pericias': atuais, 'system.attributes.cd': 20 }, { render: false });
  assert.deepEqual(contexto, { render: false, diff: false });
  assert.deepEqual(dados['system.pericias'], atuais);
  // caminho parcial: completado com os valores atuais
  const [parcial, ctx2] = atualizacaoDePericias(atuais, { 'system.pericias.fort.outros': 9 }, undefined);
  assert.deepEqual([parcial['system.pericias.fort.atributo'], parcial['system.pericias.fort.outros'], ctx2.diff], ['con', 9, false]);
  // objeto aninhado
  assert.equal(atualizacaoDePericias(atuais, { system: { pericias: { fort: { outros: 1 } } } })[1].diff, false);
});

test('atualização que não toca as perícias passa como veio (vida, PM... continuam com o diff do Foundry)', () => {
  const dados = { 'system.attributes.pv.value': 5 };
  const contexto = { render: false };
  const [d, c] = atualizacaoDePericias({ fort: { atributo: 'con' } }, dados, contexto);
  assert.equal(d, dados);
  assert.equal(c, contexto);
  assert.deepEqual(atualizacaoDePericias({}, undefined, undefined), [undefined, undefined]);
});

// Sistema simulado com o defeito medido no Foundry 14 + Tormenta20 1.6.6: numa gravação que muda "outros" de mais de uma
// perícia (ou do system.pericias inteiro), o atributo das perícias tocadas volta a "for". Uma perícia por vez grava certo.
function atorComDefeito() {
  const pericias = {
    fort: { atributo: 'con', outros: 0, treinado: false }, refl: { atributo: 'des', outros: 0, treinado: false },
    vont: { atributo: 'sab', outros: 0, treinado: false }, luta: { atributo: 'for', outros: 0, treinado: false },
    acro: { atributo: 'des', outros: 0, treinado: false },
  };
  const ator = { _source: { system: { pericias } }, gravacoes: [] };
  const original = async function (dados) {
    ator.gravacoes.push(Object.keys(dados));
    const tocadas = new Map(); // chave da perícia -> campos pedidos
    for (const [caminho, valor] of Object.entries(dados)) {
      const m = /^system\.pericias\.([^.]+)\.([^.]+)$/.exec(caminho);
      if (m) tocadas.set(m[1], { ...tocadas.get(m[1]), [m[2]]: valor });
      if (caminho === 'system.pericias') for (const [k, p] of Object.entries(valor)) if (p.outros !== pericias[k].outros) tocadas.set(k, { ...tocadas.get(k), ...p });
    }
    for (const [k, campos] of tocadas) {
      Object.assign(pericias[k], campos);
      if (tocadas.size > 1) pericias[k].atributo = 'for'; // o defeito: várias perícias na mesma gravação
    }
  };
  ator.update = envolverUpdate(original, { ehForja: () => true });
  return ator;
}

test('atributosDesfeitos: compara antes e depois, respeitando o atributo que a gravação pediu de propósito', () => {
  const antes = { fort: { atributo: 'con' }, refl: { atributo: 'des' }, luta: { atributo: 'for' } };
  const depois = { fort: { atributo: 'for' }, refl: { atributo: 'for' }, luta: { atributo: 'for' } };
  assert.deepEqual(atributosDesfeitos(antes, depois, {}), { fort: 'con', refl: 'des' });
  // pedido explícito (caminho achatado, aninhado ou objeto inteiro) vale como esperado
  assert.deepEqual(atributosDesfeitos(antes, depois, { 'system.pericias.fort.atributo': 'for' }), { refl: 'des' });
  assert.deepEqual(atributosDesfeitos(antes, depois, { system: { pericias: { refl: { atributo: 'for' } } } }), { fort: 'con' });
  assert.deepEqual(atributosDesfeitos(antes, depois, { 'system.pericias': { fort: { atributo: 'for' }, refl: { atributo: 'for' } } }), {});
  assert.deepEqual(atributosDesfeitos(antes, antes, {}), {});
  assert.deepEqual(atributosDesfeitos(undefined, depois, {}), {}); // perícia apagada ou ator sem perícias: nada a refazer
});

test('envolverUpdate: o ajuste que mexe em várias perícias não leva o atributo embora (refeito uma por vez)', async () => {
  const ator = atorComDefeito();
  const mudou = { fort: 15, refl: 9, vont: 3, luta: 15 };
  const inteiro = structuredClone(ator._source.system.pericias);
  for (const [k, outros] of Object.entries(mudou)) inteiro[k].outros = outros;
  await ator.update({ 'system.pericias': inteiro, 'system.attributes.cd': 20 }); // o formato do Ajustar ND
  const p = ator._source.system.pericias;
  assert.deepEqual(['fort', 'refl', 'vont', 'luta', 'acro'].map((k) => p[k].atributo), ['con', 'des', 'sab', 'for', 'des']);
  assert.deepEqual(['fort', 'refl', 'vont', 'luta'].map((k) => p[k].outros), [15, 9, 3, 15]); // o outros calibrado fica
  // o reparo foi uma gravação por perícia, só do atributo (a perícia que já era "for" não precisa de reparo)
  const reparos = ator.gravacoes.slice(1);
  assert.deepEqual(reparos.map((g) => g.filter((c) => c.endsWith('.atributo')).length), reparos.map(() => 1));
  assert.ok(reparos.every((g) => g.every((c) => /^system\.pericias\.[^.]+\./.test(c))));
});

test('envolverUpdate: gravação normal não faz reparo; pedir outro atributo de propósito é respeitado; ator de fora passa direto', async () => {
  const ator = atorComDefeito();
  await ator.update({ 'system.pericias.fort.outros': 4 }); // uma perícia só: grava certo
  assert.deepEqual([ator._source.system.pericias.fort.atributo, ator.gravacoes.length], ['con', 1]);
  await ator.update({ 'system.pericias.acro.atributo': 'for' }); // o mestre quis mudar
  assert.equal(ator._source.system.pericias.acro.atributo, 'for');
  assert.equal(ator.gravacoes.length, 2);
  let chamadas = 0;
  const fora = envolverUpdate(async () => { chamadas += 1; return 'ok'; }, { ehForja: () => false });
  assert.equal(await fora.call({}, { a: 1 }), 'ok');
  assert.equal(chamadas, 1);
});
