# Plano — Forja de Ameaças 0.3.0 em diante

> Rascunho para aprovação. **Nada disto foi implementado.** Parte do estado da 0.2.6 (publicada em `origin/main`, ainda sem tag): ND e papel, ordem das resistências, Chefe Final, conjurador, ataques com dano extra, poderes, magias e armas arrastados, imagens por URL, criação já ajustada.
> Itens **[NÃO VERIFICADO]** só se confirmam no Foundry.

## 1. O que sobrou da 0.2.x

| Pendência | Tamanho | Risco |
|---|---|---|
| Magia arrastada com Conjurador desmarcado deixa a ficha com PM 0 | Pequeno | Baixo |
| Botão da lixeira cai para a linha de baixo no editor de ataques | Mínimo | Nenhum (visual) |
| Poder arrastado com dano fica como veio (sem recálculo pelo ND) | Médio | Médio |
| Enxame e Bando: a API do Ajustar ND aceita, a Forja só tem Chefe Final | Médio a grande | Médio |
| Atributos em 0 (decisão 4 da v0.1: "padrão, pode ter sugestões do sistema") | Pesquisa + pequeno | Depende dos dados |
| O 5e para T20 tem o mesmo defeito do atributo `for` (ver seção 7) | Médio | Médio |
| Itens nunca verificados no Foundry (seção 8) | Teste manual | — |
| Sem release publicada | Pequeno | Gate: só com o seu pedido |

## 2. Fase A — Acabamento (0.3.0)

**A1. Magia sem conjurador.** Ao soltar uma `magia` com **Conjurador** desmarcado, a Forja marca Conjurador sozinha e mostra uma nota ("PM = 5 × ND; desmarque se não quiser"). Soltar `poder` não muda nada.
- Arquivos: `dialogo-forja.js` (`#aoSoltar`), `lang/pt-BR.json`.
- Teste (vermelho primeiro): soltar magia liga `estado.conjurador`; soltar poder não liga; remover a magia **não** desliga sozinho (o mestre decide).

**A2. Layout da linha de ataque.** Reduzir a largura do campo de nome e deixar a lixeira na mesma linha do "+ Dano extra". Só CSS (`forja.css`). **[NÃO VERIFICADO]** até olhar no Foundry.

## 3. Fase B — Dano dos poderes arrastados (0.3.0)

O Ajustar ND já recalcula o dano de um poder que tenha a flag `flags["tormenta20-ajuste-nd"].danoPoder = { ajustar, efeito }` (é assim que o 5e para T20 faz). A Forja só precisa oferecer isso aos poderes arrastados.

- Para cada poder arrastado com rolagem `type: "dano"`, a lista "Poderes, magias e armas" mostra duas caixas: **Ajustar o dano pela tabela** e **Com efeito** (a segunda só em ação padrão ou completa, como no conversor).
- **Padrão: desligado** (o poder oficial entra como veio, que é o que a tela promete hoje).
- Ligada, a flag vai no item ao criar, e a prévia mostra `antes → depois` (vem de `poderesPrevia` do `simular`, achado pelo `_id` do item).
- Arquivos: `forja/itens-extras.js` (`danoDoPoder(dados)` puro), `forja/criar-ator.js` (grava a flag), `dialogo-forja.js` e `.hbs`, `lang`.
- Testes: poder sem dano não mostra caixas; com dano mostra; flag gravada só com a caixa ligada; prévia sem `poderesPrevia` (Ajustar ND antigo) não quebra. Modelo: `t20-conversor-5e/tests/poder-dano.test.js`.
- **[NÃO VERIFICADO]** como o Ajustar ND trata a CD escrita no texto do poder arrastado e se `efeito` acerta em poderes de área oficiais.

## 4. Fase C — Templates Enxame e Bando (0.4.0)

A API já aceita `templates: { chefeFinal, enxame, bando: { escala, aumentoND } }`. A Forja só passa o que a tela escolher.

- **Tela (seção "ND e papel"):** caixas **Enxame** e **Bando**. Com Bando: seletor de escala (`10-20`, `20-40`, `50-70`, `80-100`) e "aumento de ND" (padrão pela escala, editável), como no diálogo do Ajustar ND.
- **Enxame sem Bando:** o Ajustar ND zera os ataques das armas. A seção Ataques fica desabilitada com uma nota, e as linhas digitadas continuam no estado, sem serem apagadas.
- **Prévia:** mostrar ND efetivo, tamanho e multiplicador de dano quando o resultado do `simular` trouxer isso (campo a conferir lendo `ajuste.js` e `templates.js`).
- **Criação:** `copiar: true` já cria os itens dos templates (`itensCriar`) e o marcador `flags["tormenta20-ajuste-nd"].templates`. O ator fica reabrível no Ajustar ND normal.
- Arquivos: `dialogo-forja.js`, `.hbs`, `lang`, `forja/ameaca.js` (validar `escala` e `aumentoND`).
- Testes: opções chegam à API no formato certo, validação da escala, Enxame desabilita ataques sem perder o estado.
- **[NÃO VERIFICADO]** tamanho do token e `ND efetivo` na ficha, e o que acontece com Chefe Final + Bando + Enxame juntos.

## 5. Fase D — Atributos sugeridos (spike, depois 0.5.0)

Decisão 4 da primeira versão: "padrão (0), pode ter sugestões do sistema". Hoje não há sugestão.

- **Spike (somente leitura, sem código do módulo):** extrair os atributos das ~83 ameaças do compêndio "Ameaças" (técnica em `t20-conversor-5e/docs/aprendizados-dano-e-conversao.md`, seção 10: copiar o LevelDB e ler com `classic-level`) e agrupar por `tipo` e patamar. Resultado: uma tabela e uma recomendação de perfis (por exemplo Bruto, Ágil, Resistente, Mental).
- **Só depois, se os dados sustentarem:** `forja/sugestoes.js` (puro, dados + função) e um botão **Sugerir atributos** que preenche os seis campos (o mestre edita). Teste: valores dentro de −10…30 e tabela completa.
- Se os dados forem fracos, a alternativa é você definir os perfis. Sem dado, não invento números.

## 6. Documentação e release

- `docs/aprendizados.md` na Forja: o achado do Foundry 14 + Tormenta20 1.6.6 (atualizar perícias de ator existente devolve `for` ao atributo; criar não), como foi medido e o que **não** funcionou (diff, reparo, passadas).
- README com as versões.
- **Tag e release só quando você pedir.** `v0.3.0` depois das fases A e B verificadas no Foundry.

## 7. O 5e para T20 tem o mesmo defeito

O conversor (`t20-conversor-5e`) cria o ator e depois roda duas passadas de atualização (`dialogo-conversor.js`, `#criarAtor`), exatamente o fluxo que desfazia o atributo. O `aprendizados` dele já registra "Fortitude ainda aparece como FOR". A correção é a mesma da 0.2.6: ajustar um ator não salvo e criar com `copiar: true`, depois renomear. É outro repositório, outro ciclo, e merece sua própria sessão e a sua aprovação.

## 8. Verificação manual (checklist para o Foundry v13 e v14)

Ainda **não** confirmado no Foundry, mesmo nas versões já publicadas:
1. Arma arrastada do compêndio vira linha de ataque (nome, propósito, tipo de dano, quantidade, dano extra).
2. Dano extra digitado: a fórmula aparece na arma (`parts[2]`) e o dano principal diminui para o total bater com a tabela.
3. Chefe Final: PV dobrado, PM e RD.
4. Conjurador: PM = 5 × ND e atributo de conjuração.
5. Retrato e token por URL, por envio e por FilePicker, e a pasta de imagens.
6. A pasta "Forja de Ameaças" é reaproveitada na segunda criação.
7. Abrir o ator no Ajustar ND e ajustar para outro ND: o atributo de Fortitude, Reflexos e Vontade continua certo? (O Ajustar ND atualiza o ator existente, que é onde o defeito aparecia.)
8. Com o 5e para T20 ativo: os dois botões convivem.

O item 7 é o mais importante: se reajustar um ator da Forja desfizer o atributo, o limite do problema muda.

## 9. Ordem e versões propostas

1. **0.3.0**: A1, A2, B + documentação. Verificação manual dos itens 1 a 8.
2. **0.4.0**: C (Enxame e Bando).
3. **Spike D** em paralelo (só leitura), **0.5.0** se os dados sustentarem.
4. **Conversor**: correção em sessão própria, depois de aprovada.

## 10. Decisões que preciso de você

1. **Magia sem conjurador:** marcar Conjurador sozinha ao soltar a magia (recomendado) ou só avisar?
2. **Dano de poder arrastado:** caixa desligada por padrão (recomendado) ou ligada?
3. **Atributos sugeridos:** fazer o spike no compêndio (recomendado) ou você define os perfis?
4. **Conversor:** abrir a correção do mesmo defeito no 5e para T20 como tarefa separada (recomendado)?
5. **Ordem:** 0.3.0 (A e B) primeiro e Enxame/Bando na 0.4.0 (recomendado), ou Enxame/Bando antes?
