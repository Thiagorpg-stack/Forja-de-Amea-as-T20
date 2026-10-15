// Forja de Ameaças — ponto de entrada. Depende do módulo Ajustar ND (0.10.0 ou mais recente).
import { ID_FORJA } from './forja/criar-ator.js';
import { abrirForja } from './dialogo-forja.js';
import { atualizacaoDePericias } from './forja/pericias.js';

// Botão no cabeçalho do diretório de atores (só para o Mestre).
Hooks.on('renderActorDirectory', (_app, html) => {
  if (!game.user.isGM) return;
  const raiz = html instanceof HTMLElement ? html : html[0];
  if (!raiz || raiz.querySelector('.t20fa-botao')) return;
  const alvo = raiz.querySelector('.header-actions') ?? raiz.querySelector('.directory-header');
  if (!alvo) return;
  const botao = document.createElement('button');
  botao.type = 'button';
  // Herda as classes dos botões vizinhos para ficar com o mesmo visual do diretório.
  botao.className = `${alvo.querySelector('button')?.className ?? ''} t20fa-botao`.trim();
  botao.innerHTML = `<i class="fas fa-hammer"></i> ${game.i18n.localize('T20FA.Botao')}`;
  botao.addEventListener('click', () => abrirForja());
  alvo.append(botao);
});

Hooks.once('ready', () => {
  // Só nos atores criados por este módulo: completa as atualizações de perícia e desliga o diff (ver forja/pericias.js).
  const Ator = CONFIG.Actor.documentClass;
  const atualizar = Ator.prototype.update;
  Ator.prototype.update = function (dados, contexto) {
    if (!this.getFlag(ID_FORJA, 'origem')) return atualizar.call(this, dados, contexto);
    const [completos, opcoes] = atualizacaoDePericias(this._source.system?.pericias, dados, contexto);
    if (opcoes?.diff === false) console.info(`${ID_FORJA} | update de perícias sem diff em ${this.name}`); // diagnóstico
    return atualizar.call(this, completos, opcoes);
  };
  game.modules.get(ID_FORJA).api = { versaoApi: 1, abrirForja };
  // Sem checar o Ajustar ND aqui: ele publica a API no próprio `ready`, que pode rodar depois deste.
  // abrirForja() confere na hora de abrir.
});
