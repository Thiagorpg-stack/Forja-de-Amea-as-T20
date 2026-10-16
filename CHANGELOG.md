# Novidades

Cada versão tem uma seção `## x.y.z` com tópicos. O workflow de release publica a seção da versão da tag.

## 0.4.4

### Primeira release pública
- Cria **ameaças de Tormenta20** pelo ND e pelo papel, com os números da tabela do Ajustar ND: PV, CD, Defesa, ataque, resistências e dano por rodada.

### Criar a ameaça
- Botão **Forjar Ameaça** no diretório de atores (só o Mestre vê).
- ND de `1/4` a `S+`, papel (Solo, Lacaio ou Especial) e ordem das resistências (Forte, Média, Fraca).
- Template **Chefe Final**: PV dobrado, PM e RD.
- Templates **Enxame** e **Bando**, com a escala dos indivíduos e o aumento de ND. O Enxame sozinho dispensa os ataques, e o token acompanha o tamanho do bando.
- Tamanho, tipo, deslocamento, atributos e **Conjurador** (PM = 5 × ND).
- **Retrato e token** por URL, envio de arquivo ou escolha no Foundry.
- **Prévia** da ficha antes de criar (aparece mesmo sem o nome).

### Poderes, magias e armas
- Arraste poderes e magias do Tormenta20 para a janela; a **magia marca Conjurador** sozinha.
- Em um poder com dano, a opção **Ajustar o dano pela tabela do ND**, com a prévia antes → depois.
- Uma **arma arrastada** vira uma linha de ataque, e cada ataque aceita **dano extra** (por exemplo `2d6` de eletricidade).
- **Troca do nome da criatura** citada no texto do poder pelo nome da ameaça: ignora maiúscula, acento, hífen e entidades HTML, e cada poder mostra a troca antes de criar.

### Requisitos
- Foundry 13 ou 14 e sistema Tormenta20 1.5.0 ou mais novo.
- Módulo **Ajustar ND** 0.10.0 ou mais novo (recomendado a 0.11.1: poder só de dados continua só dados).

### Limitações
- O artigo do texto não muda ("turno da Loboto").
- Os atributos começam em 0; eles não mudam o ND.
- O ator é criado já ajustado, porque atualizar as perícias de um ator existente devolve `for` ao atributo de Fortitude, Reflexos e Vontade.
