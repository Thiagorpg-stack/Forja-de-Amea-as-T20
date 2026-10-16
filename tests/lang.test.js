// O Foundry expande chaves com ponto em objetos: uma chave não pode ser texto e prefixo de outra ao mesmo tempo,
// senão o idioma inteiro falha ao carregar e a tela mostra as chaves cruas (T20FA.Botao).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ler = (caminho) => readFileSync(new URL(caminho, import.meta.url), 'utf8');
const lang = JSON.parse(ler('../lang/pt-BR.json'));
const chaves = Object.keys(lang);
const chavesEm = (arquivo) => [...ler(arquivo).matchAll(/['"`](T20FA\.[\w.]+)['"`]/g)].map((m) => m[1]);

test('lang: nenhuma chave é prefixo de outra', () => {
  const colisoes = chaves.flatMap((a) => chaves.filter((b) => b.startsWith(`${a}.`)).map((b) => `${a} x ${b}`));
  assert.deepEqual(colisoes, []);
});

test('lang: todo texto usado no template e no código existe', () => {
  const usadas = new Set([
    ...[...ler('../templates/dialogo-forja.hbs').matchAll(/localize\s*["']?(T20FA\.[\w.]+)/g)].map((m) => m[1]),
    ...['../scripts/dialogo-forja.js', '../scripts/imagem-foundry.js', '../scripts/main.js', '../scripts/api-ajuste-nd.js'].flatMap(chavesEm),
    ...['nome', 'nd', 'papel', 'tamanho', 'tipo', 'deslocamento', 'bandoEscala'].map((c) => `T20FA.Erro.${c}`), // montadas em #erroLegivel
  ]);
  assert.deepEqual([...usadas].filter((k) => !(k in lang)), []);
});

test('lang: nenhum texto sobrando (toda chave é usada)', () => {
  const codigo = ['../templates/dialogo-forja.hbs', '../scripts/dialogo-forja.js', '../scripts/imagem-foundry.js', '../scripts/main.js', '../scripts/api-ajuste-nd.js'].map(ler).join('\n');
  const sobras = chaves.filter((k) => !codigo.includes(k) && !k.startsWith('T20FA.Erro.'));
  assert.deepEqual(sobras, []);
});
