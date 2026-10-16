# Aprendizados da Forja de Ameaças

Tudo aqui foi medido no Foundry 14.369 com o sistema Tormenta20 1.6.6, salvo onde está marcado como suposição.

## 1. Atualizar perícias de um ator existente desfaz o atributo (e criar não)

**Sintoma:** o ator criado tinha Fortitude, Reflexos e Vontade com o atributo `for` (as fichas oficiais têm `con`, `des`, `sab`). Os totais batiam com a tabela, porque o Ajustar ND calibra o `outros` pelo valor preparado; só o atributo estava errado. A Fortitude não acompanharia o CON se o mestre o mudasse.

**Como foi achado:** a criação registrava o atributo antes de cada etapa. O ator nascia certo (`con/des/sab`) e a primeira gravação do Ajustar ND (`aplicarAjuste` com `copiar: false`, que faz `actor.update` com o `system.pericias` inteiro) devolvia `for` às perícias que ele altera (Fortitude, Reflexos, Vontade e Luta).

**Experimento no console**, num ator da Forja, só com a Fortitude, usando o `update` nativo do Foundry:

| Gravação | Resultado |
|---|---|
| `{ 'system.pericias.fort.atributo': 'con' }` | atributo continua `for`, `outros` zerado |
| só `outros` | `outros` gravado, atributo continua `for` |
| `outros` e `atributo` juntos | `outros` gravado, atributo continua `for` |
| `outros` com `diff: false` | `outros` gravado, atributo continua `for` |

Uma gravação só do `atributo` também **zera o `outros`** (é o "atualização parcial redefine a perícia" já conhecido no 5e para T20). Em um teste anterior, o atributo de uma perícia chegou a pegar numa gravação isolada, então o comportamento não é totalmente previsível; não achei a causa no código do sistema (`tormenta20.mjs`): o `_preCreate` e o `_preUpdate` do ator não mexem nas perícias.

**Não funcionou:** corrigir o atributo depois, repetir as passadas do ajuste, `diff: false` no `Actor.update`, refazer o atributo uma perícia por vez.

**O que funcionou:** **criar** o ator já com tudo gravado. O Ajustar ND roda sobre um ator ainda **não salvo** (`new CONFIG.Actor.documentClass(dados)`), e `aplicarAjuste(rascunho, resultado, { copiar: true })` cria o ator final a partir dos dados ajustados. A cópia vem com o sufixo "(ND 5)" no nome; a Forja renomeia com uma atualização que não toca as perícias. Resultado confirmado: Fortitude CON +17, Reflexos DES +11, Vontade SAB +5, Defesa 24, PV 200, ataque +17 e dano `4d6+26` no ND 5 Solo.

**Consequência a conferir:** ajustar de novo um ator da Forja pelo botão do Ajustar ND (que atualiza o ator existente) pode desfazer o atributo outra vez. Está na checklist de verificação do plano.

**O 5e para T20 tem o mesmo fluxo** (criar e depois atualizar) e, portanto, o mesmo defeito. Está proposto como tarefa separada.

## 2. O Ajustar ND só recalcula o dano do poder que leva uma flag

`flags["tormenta20-ajuste-nd"].danoPoder = { ajustar, efeito }`. Sem a flag o poder não é ajustado; sem `efeito` na flag o Ajustar ND o detecta pelo texto (condição, teste de resistência, área). `simular` devolve `poderesPrevia` (`id`, `nome`, `padrao`, `efeito`, `ajustar`, `antes`, `depois`). Só `poder` entra; `magia` não. Na Forja a escolha viaja dentro do próprio item arrastado (`comDanoAjustado`).

## 3. Outros achados

- **Fichas de compêndio:** poder e magia arrastados do compêndio entram com os efeitos embutidos (`effects[]` com `_id` próprio) sem erro na criação.
- **Armas:** `rolls[dano].parts[0]` é o dano principal, `[1]` o campo do atributo (fica vazio) e o dano adicional começa em `[2]`.
- **Leitura do formulário:** o leitor das linhas de dano extra procurava `[data-extra]`, atributo que o botão de remover também tem; deu `null.value` ao clicar em Criar. Seletores por classe, não por atributo repetido.
- **Console do Foundry:** o `copy()` pode não existir; usar `console.log` e copiar à mão.
- **Rótulo da versão:** a lista de módulos só atualiza com o servidor reiniciado. Para saber o que está no disco: `fetch('modules/<id>/module.json', { cache: 'reload' })`.
