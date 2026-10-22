'use strict';
const fs = require('fs');
const path = require('path');
const corpus = [];
function add(kind, text, expected) { corpus.push({ id: corpus.length + 1, kind, text, expected }); }
const decorate = [t => t, t => 'Aura, ' + t, t => 'Por favor, ' + t, t => 'Aura, ' + t + ', por favor.'];
const greetings = [['oi','Oi!'],['olá','Olá!'],['bom dia','Bom dia!'],['boa tarde','Boa tarde!'],['boa noite','Boa noite!'],['hello','Hello!'],['hi','Hi!']];
const verbs = ['diga','diz','dizer','fala','fale','falar','manda','mande','mandar','envia','envie','escreve','escreva','responde','responda','repete'];
for (const verb of verbs) for (const [greeting, reply] of greetings) for (const end of ['', '!']) for (const wrapper of decorate) add('literal', wrapper(`${verb} ${greeting}${end}`), reply);
for (const modal of ['Podes','Consegues','Pode','Poderias']) for (const verb of ['dizer','escrever','enviar','repetir']) for (const [greeting, reply] of greetings) add('literal', `${modal} ${verb} ${greeting}?`, reply);
// Independent, reviewed seed pairs, not generated from the implementation's dictionary.
const pairs = [['apague','apaga'],['remova','remove'],['abra','abre'],['feche','fecha'],['crie','cria'],['envie','envia'],['mande','manda'],['publique','publica'],['promova','promove'],['rebaixe','rebaixa'],['ignore','ignora'],['bloqueie','bloqueia'],['silencie','silencia'],['adicione','adiciona'],['pesquise','pesquisa'],['procure','procura'],['traduza','traduz'],['resuma','resume'],['gere','gera'],['configure','configura'],['ative','ativa'],['desative','desativa'],['ligue','liga'],['desligue','desliga'],['agende','agenda'],['avise','avisa'],['mencione','menciona'],['verifique','verifica'],['escreva','escreve'],['explique','explica']];
for (const [verb, canonical] of pairs) for (const wrapper of decorate) add('normalize', wrapper(`${verb} o pedido`), `${canonical} o pedido`);
for (const [verb] of pairs) for (const make of [v => `Não ${v} o grupo`, v => `Nunca ${v} o grupo`, v => `Como fazer para ${v} o grupo?`, v => `A frase diz: «${v} o grupo»`, v => `Podes não ${v} o grupo?`]) add('nonaction', make(verb), true);
for (const verb of ['mande','envia','grava','responde','fala','leia']) for (const format of ['em áudio','em voz','uma nota de voz']) for (const wrapper of decorate) add('format', wrapper(`${verb} a resposta ${format}`), 'audio');
for (const phrase of ['Não mande áudio','sem áudio','só texto','responde por escrito','manda em texto','não consigo ouvir','não quero voz','não grave áudio']) for (const wrapper of decorate) add('format', wrapper(phrase), 'text');
for (const phrase of ['O quê?','Como assim?','Não entendi','Não percebi','Explica melhor','Podes esclarecer?','Por quê?','Repete por outras palavras','Explica isso','Que?']) for (const wrapper of decorate.slice(0,3)) add('clarification', wrapper(phrase), true);
for (const phrase of ['Diga oi','O áudio falhou','Como enviar um áudio?','escreve «manda áudio»','não sei onde ficou a mensagem de voz']) add('format', phrase, null);
for (const phrase of ['não diga oi','diz oi ao João','a frase diz «diga oi»','como dizer oi?','diga o que pensas','não, quero uma explicação']) add('literal', phrase, null);
const file = path.join(__dirname, 'fixtures/aura-language-corpus.json');
fs.writeFileSync(file, JSON.stringify({ version: 1, note: 'Template-based linguistic regression corpus, not new bot capabilities or proof of model quality.', scenarios: corpus }, null, 2) + '\n');
console.log('LANGUAGE CORPUS:', corpus.length, 'reviewable template-derived scenarios');
