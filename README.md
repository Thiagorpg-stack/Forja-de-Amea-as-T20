# Forja de Ameaças

Módulo do Foundry VTT para o sistema **Tormenta20** que cria uma ameaça pronta a partir do **ND** e do **papel**. Os números (PV, CD, Defesa, ataque, resistências e dano por rodada) vêm das tabelas do módulo [Ajustar ND](https://github.com/Thiagorpg-stack/FVTT_Ajustar_Ameacas).

## Como usar

1. Instale e ative o **Ajustar ND** (0.10.0 ou mais recente) e a **Forja de Ameaças** no mundo.
2. No diretório de atores, clique em **Forjar Ameaça** (só o Mestre vê).
3. Preencha:
   - **Identidade**: nome, conceito, retrato e token (caminho, URL, envio ou escolha no Foundry).
   - **ND e papel**: ND de `1/4` a `S+`, papel (Solo, Lacaio, Especial), template Chefe Final e a ordem das resistências (Forte, Média, Fraca).
   - **Ficha base**: tamanho, tipo, deslocamento, atributos e, se for conjurador, o atributo de conjuração (PM = 5 × ND).
   - **Ataques**: nome, corpo a corpo ou distância, tipo de dano e quantidade por rodada.
   - **Poderes e magias**: arraste do compêndio, de outra ficha ou do diretório de itens para qualquer lugar da janela.
4. Confira a prévia (a ficha como ficará) e clique em **Criar ameaça**. O ator nasce na pasta "Forja de Ameaças".

## O que o módulo faz e não faz

- Os poderes e magias arrastados entram **como estão**: o dano deles não é recalculado pelo ND, mas contam para o aviso de patamar.
- Arma arrastada **não** é aceita nesta versão (prevista para a 0.2.0). Use as linhas de ataque.
- Os atributos não mudam o ND: os números finais vêm sempre da tabela.

## Versões

- **0.1.0**: primeira versão (criar ameaça por ND e papel, imagens por URL, arrastar poderes e magias).

## Desenvolvimento

```bash
npm test
```

Os testes rodam em Node, sem o Foundry. O que depende do Foundry (arrastar e soltar, criação do ator, aparência) só se confirma abrindo o módulo no Foundry v13 ou v14.

Parte do código é portada do módulo **5e para T20** (modelo do ator, imagens, perícias); cada arquivo copiado diz isso no cabeçalho.

## Licença

MIT.
