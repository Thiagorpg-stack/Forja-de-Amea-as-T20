# Forja de Ameaças

Módulo do Foundry VTT para o sistema **Tormenta20** que cria uma ameaça pronta a partir do **ND** e do **papel**. Os números (PV, CD, Defesa, ataque, resistências e dano por rodada) vêm das tabelas do módulo [Ajustar ND](https://github.com/Thiagorpg-stack/FVTT_Ajustar_Ameacas).

## Como usar

1. Instale e ative o **Ajustar ND** (0.10.0 ou mais recente) e a **Forja de Ameaças** no mundo.
2. No diretório de atores, clique em **Forjar Ameaça** (só o Mestre vê).
3. Preencha:
   - **Identidade**: nome, conceito, retrato e token (caminho, URL, envio ou escolha no Foundry).
   - **ND e papel**: ND de `1/4` a `S+`, papel (Solo, Lacaio, Especial), template Chefe Final e a ordem das resistências (Forte, Média, Fraca).
   - **Ficha base**: tamanho, tipo, deslocamento, atributos e, se for conjurador, o atributo de conjuração (PM = 5 × ND).
   - **Ataques**: nome, corpo a corpo ou distância, tipo de dano e quantidade por rodada. O botão **Dano extra** soma um dano fixo ao golpe (ex.: `2d6` de eletricidade na espada longa); o dano principal vem sempre da tabela.
   - **Poderes, magias e armas**: arraste do compêndio, de outra ficha ou do diretório de itens para qualquer lugar da janela. Uma arma vira uma linha de ataque, já com o dano adicional dela.
4. Confira a prévia (a ficha como ficará) e clique em **Criar ameaça**. O ator nasce na pasta "Forja de Ameaças".

## O que o módulo faz e não faz

- Os poderes e magias arrastados entram **como estão** (contam para o aviso de patamar). Em um poder com dano você pode ligar **Ajustar o dano pela tabela do ND**; magia não tem essa opção.
- Uma arma arrastada **não** é copiada: só nome, propósito, tipo de dano, quantidade, descrição e dano adicional viram a linha de ataque. Fórmula e bônus do dano principal saem da tabela.
- O dano extra fica fixo e entra na conta da rodada: o Ajustar ND diminui o dano principal para o total bater com a tabela.
- Os atributos não mudam o ND: os números finais vêm sempre da tabela.

## Versões

- **0.4.3**: o casamento dos nomes também ignora caracteres invisíveis (espaço de largura zero) e junta separadores seguidos (hífen + quebra de linha, espaço duplo).
- **0.4.2**: a troca do nome da criatura ignora maiúscula, acento e a diferença entre hífen e espaço (um texto com hífen "não separável" não casava com o nome digitado), vale só para palavra inteira, e cada poder mostra "Troca no texto: ... → nome da ameaça"; um aviso lista os nomes que não aparecem em nenhum texto.
- **0.4.1**: a troca do nome da criatura nos textos dos poderes passa a ser um campo "Nomes de criaturas nos textos" (o nome da ficha de origem entra sozinho quando o Foundry o informa), porque poderes de compêndios de itens avulsos não têm ficha de origem.
- **0.4.0**: templates Enxame e Bando (com escala e aumento de ND): o Enxame sozinho desabilita os ataques e o Bando mostra as notas do Ajustar ND na prévia e leva o token ao tamanho do bando.
- **0.3.3**: ao criar, o nome da criatura citado no texto de um poder arrastado vira o nome da ameaça (só o nome completo; o artigo fica como está). Só funcionava quando o poder vinha de uma ficha; a 0.4.1 corrige.
- **0.3.2**: a rodada se divide por igual entre os golpes (não pela proporção de uma arma que nasce com 1d6 provisório); com o Ajustar ND 0.11.0, poder só de dados segue só dados.
- **0.3.1**: a prévia (e as opções dos poderes arrastados) aparece mesmo sem o nome da ameaça; o Criar só habilita com o nome.
- **0.3.0**: soltar uma magia marca Conjurador sozinha; em um poder arrastado com dano, as caixas "Ajustar o dano pela tabela do ND" e "Com efeito" (desligadas por padrão) com a prévia antes → depois; linha de ataque mais compacta.
- **0.2.6**: o ator é criado já ajustado (o Ajustar ND roda sobre um ator ainda não salvo e cria o final), porque atualizar as perícias de um ator existente devolve "for" ao atributo de Fortitude, Reflexos e Vontade (medido no Foundry 14 com o Tormenta20 1.6.6).
- **0.2.1**: corrige o botão Criar ameaça, que falhava quando o formulário era lido (erro `null.value`).
- **0.2.0**: arrastar arma (vira linha de ataque) e dano extra por ataque.
- **0.1.0**: primeira versão (criar ameaça por ND e papel, imagens por URL, arrastar poderes e magias).

## Notas técnicas

O ator é criado já ajustado, porque atualizar as perícias de um ator existente devolve `for` ao atributo de Fortitude, Reflexos e Vontade. Detalhes em [docs/aprendizados.md](docs/aprendizados.md). O plano das próximas versões está em [docs/plano-0.3.0.md](docs/plano-0.3.0.md).

## Desenvolvimento

```bash
npm test
```

Os testes rodam em Node, sem o Foundry. O que depende do Foundry (arrastar e soltar, criação do ator, aparência) só se confirma abrindo o módulo no Foundry v13 ou v14.

Parte do código é portada do módulo **5e para T20** (modelo do ator, imagens, perícias); cada arquivo copiado diz isso no cabeçalho.

## Licença

MIT.
