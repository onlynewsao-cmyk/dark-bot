/**
 * DARK BOT v6.3 — Dados completos de TODOS os submenus
 * Cada comando classificado como:
 *   sel: true  → aparece na LISTA de seleção (executa directo)
 *   sel: false → aparece só no TEXTO (precisa de dados/args/mention)
 */
'use strict';

// ── CLASSIFICAÇÃO AUTOMÁTICA POR PADRÃO DE NOME ──────────────
// Comandos que NÃO precisam de argumentos (executam directo)
const SEL_PATTERNS = [
  /^ping$/, /^info$/, /^perfil$/, /^dono$/, /^criador$/, /^donos$/, /^subdono$/,
  /^uptime$/, /^status$/, /^statusbot$/, /^statusgp$/, /^system$/, /^stats$/,
  /^daily$/, /^saldo$/, /^coins$/, /^perfilrpg$/, /^carteira$/, /^inv$/,
  /^out$/, /^sair$/, /^leave$/, /^bye$/,
  /^antilink$/, /^antispam$/, /^welcome$/, /^goodbye$/, /^bemvindo$/, /^saida$/,
  /^open$/, /^close$/, /^actgp$/, /^grupo$/, /^soadm$/,
  /^admins$/, /^tagadmins$/, /^link$/, /^linkgp$/, /^todos$/, /^hidetag$/,
  /^regras$/, /^setregras$/,
  /^temas$/, /^change$/, /^prefixos$/, /^setprefix$/,
  /^help$/, /^menu$/, /^start$/, /^aiapis$/,
  /^dado$/, /^moeda$/, /^ppt$/, /^piada$/, /^frase$/, /^cantadas$/,
  /^filosofia$/, /^biblia$/, /^charada$/, /^motivacional$/, /^elogio$/,
  /^fato$/, /^conselho$/, /^horoscopo$/, /^cor$/,
  /^roleta$/, /^verdade$/, /^desafio$/,
  /^gay$/, /^lindo$/, /^linda$/, /^feio$/, /^feia$/, /^burro$/, /^burra$/,
  /^rico$/, /^rica$/, /^pobre$/, /^corno$/, /^corna$/, /^safado$/, /^safada$/,
  /^gado$/, /^gada$/, /^gostoso$/, /^gostosa$/, /^forte$/, /^fraca$/,
  /^nerd$/, /^nerd2$/, /^otaku$/, /^preguicoso$/, /^preguicosa$/,
  /^trabalhador$/, /^trabalhadora$/, /^brabo$/, /^braba$/,
  /^malandro$/, /^malandra$/, /^simpatico$/, /^simpatica$/,
  /^engracado$/, /^engracada$/, /^charmoso$/, /^charmosa$/,
  /^misterioso$/, /^misteriosa$/, /^carinhoso$/, /^carinhosa$/,
  /^ciumento$/, /^ciumenta$/, /^corajoso$/, /^corajosa$/,
  /^esperto$/, /^esperta$/, /^chorao$/, /^chorona$/,
  /^brincalhao$/, /^brincalhona$/, /^traidor$/, /^traidora$/,
  /^bandido$/, /^bandida$/, /^cachorro$/, /^cachorra$/,
  /^vagabundo$/, /^vagabunda$/, /^pilantra$/, /^mito$/,
  /^padrao$/, /^comedia$/, /^psicopata$/, /^fortao$/, /^fortona$/,
  /^magrelo$/, /^magrela$/, /^bombado$/, /^bombada$/,
  /^chefe$/, /^presidente$/, /^presidenta$/, /^rei$/, /^rainha$/,
  /^patrao$/, /^patroa$/, /^playboy$/, /^zueiro$/, /^zueira$/,
  /^gamer$/, /^programador$/, /^programadora$/,
  /^visionario$/, /^visionaria$/, /^billionario$/, /^bilionaria$/,
  /^poderoso$/, /^poderosa$/, /^vencedor$/, /^vencedora$/,
  /^senhor$/, /^senhora$/, /^fofoqueiro$/, /^fofoqueira$/,
  /^dorminhoco$/, /^dorminhoca$/, /^comilao$/, /^comilona$/,
  /^sedentario$/, /^sedentaria$/, /^estudioso$/, /^estudiosa$/,
  /^romantico$/, /^romantica$/, /^extrovertido$/, /^extrovertida$/,
  /^introvertido$/, /^introvertida$/, /^calmo$/, /^calma$/,
  /^nervoso$/, /^nervosa$/, /^organizado$/, /^organizada$/,
  /^bagunceiro$/, /^bagunceira$/, /^economico$/, /^economica$/,
  /^gastador$/, /^gastadora$/, /^saudavel$/, /^doente$/,
  /^supersticioso$/, /^supersticiosa$/, /^cetico$/, /^cetica$/,
  /^religioso$/, /^religiosa$/, /^ateu$/, /^ateia$/,
  /^moderno$/, /^moderna$/, /^conservador$/, /^conservadora$/,
  /^patriotico$/, /^patriotica$/, /^urbano$/, /^urbana$/,
  /^aventureiro$/, /^aventureira$/, /^caseiro$/, /^caseira$/,
  /^tecnologico$/, /^tecnologicas$/, /^analogico$/, /^analogica$/,
  /^solitario$/, /^solitaria$/, /^seguidor$/, /^seguidora$/,
  /^criativo$/, /^criativa$/, /^pratico$/, /^pratica$/,
  /^sonhador$/, /^sonhadora$/, /^inseguro$/, /^insegura$/,
  /^maduro$/, /^madura$/, /^serio$/, /^seria$/,
  /^inteligente$/, /^fiel$/, /^infiel$/, /^pegador$/, /^pegadora$/,
  /^otario$/, /^otaria$/, /^macho$/, /^bobo$/, /^boba$/,
  /^humilde$/, /^desumilde$/, /^covarde$/, /^talarico$/, /^talarica$/,
  /^bebado$/, /^bebada$/, /^vesgo$/, /^vesga$/, /^ladrao$/, /^ladra$/,
  /^nazista$/, /^homofobico$/, /^homofobica$/, /^racista$/, /^chato$/, /^chata$/,
  /^sortudo$/, /^sortuda$/, /^azarado$/, /^azarada$/,
  /^machista$/, /^comunista$/, /^petista$/, /^bolsonarista$/, /^lulista$/,
  /^global$/, /^local$/, /^digital$/, /^offline$/, /^online$/,
  /^social$/, /^antisocial$/, /^popular$/, /^lider$/,
  /^independente$/, /^dependente$/, /^realista$/, /^otimista$/,
  /^pessimista$/, /^confiante$/, /^infantil$/, /^responsavel$/,
  /^irresponsavel$/, /^liberal$/, /^tradicional$/, /^cosmopolita$/,
  /^rural$/, /^viajante$/, /^gastadora$/,
  /^lesbica$/, /^bucetuda$/,
  /^rankgay$/, /^rankburro$/, /^rankinteligente$/, /^rankotaku$/,
  /^rankfiel$/, /^rankinfiel$/, /^rankcorno$/, /^rankgado$/,
  /^rankgostoso$/, /^rankrico$/, /^rankpobre$/, /^rankforte$/,
  /^rankpegador$/, /^rankmacho$/, /^ranknerd$/, /^ranktrabalhador$/,
  /^rankbrabo$/, /^ranklindo$/, /^rankmalandro$/, /^rankengracado$/,
  /^rankcharmoso$/, /^rankvisionario$/, /^rankpoderoso$/, /^rankvencedor$/,
  /^ranklesbica$/, /^rankburra$/, /^rankcorna$/, /^rankgada$/,
  /^rankgostosa$/, /^rankrica$/, /^rankpegadora$/, /^ranktrabalhadora$/,
  /^rankbraba$/, /^ranklinda$/, /^rankmalandra$/, /^rankengracada$/,
  /^rankcharmosa$/, /^rankvisionaria$/, /^rankpoderosa$/, /^rankvencedora$/,
  /^rankativo$/, /^rankinativo$/, /^rankativos$/,
  /^atividade$/, /^checkativo$/, /^totalcmd$/, /^topcmd$/,
  /^conquistas$/, /^caixa$/, /^diario$/,
  /^rep$/, /^toprep$/, /^denuncias$/,
  /^eventos$/, /^missoes$/,
  /^cla$/, /^familia$/, /^arvore$/, /^relacionamento$/, /^casais$/,
  /^pets$/, /^lojapet$/,
  /^class$/, /^casa$/, /^auction$/, /^mercado$/,
  /^materiais$/, /^precos$/, /^receitas$/, /^ingredientes$/,
  /^plantacao$/, /^sementes$/, /^vagas$/, /^habilidades$/,
  /^desafiosemanal$/, /^desafiomensal$/,
  /^tributos$/, /^meustats$/, /^propriedades$/, /^cprops$/,
  /^topriqueza$/, /^toprpg$/, /^rankglobal$/, /^ranklvl$/,
  /^equipamentos$/, /^rpgstats$/,
  /^parcerias$/, /^listmods$/, /^listmodcmds$/,
  /^listblocksgp$/, /^listblacklist$/, /^listadv$/, /^listamute$/,
  /^listautoadm$/, /^autorespostas$/,
  /^raidstatus$/, /^solicitacoes$/,
  /^antiraid$/, /^capturalink$/,
];

function isSelectable(cmd) {
  return SEL_PATTERNS.some(re => re.test(cmd));
}

// ── CATEGORIAS POR PADRÃO DE NOME ────────────────────────────
function categorize(cmd) {
  const c = cmd.toLowerCase();
  // Downloads
  if (/^(play|video|ytd|gyt|tiktok|instagram|fb|twitter|spotify|soundcloud|pinterest|pinpack|pinmp4|pinsticker|statusvideo|yt3v2|yt4v2|playid|playhq|tomp3|shazam|myinstants|pintemp|instamp|letra|kwai|igstory|gdrive|mediafire|mcplugin|ttk|scdl|spotify2|twitterdl|playvid|pinterest2|sc$)/.test(c)) return 'downloads';
  // Stickers & Imagens
  if (/^(sticker|sfull|figubug|toimg|attp|ttp|imagem|figura|gimage|stickerrename|brat|legenda|figmeme|figraiva|figcoreana|figanime|figroblox|figemoji|figdesenho|figengracada|aisticker|jeff|faber|norian|totext|ptvmsg|gerarlink|rvisu|8d$)/.test(c)) return 'stickers';
  // IA
  if (/^(ia|gpt|chatgpt|gpt4|gpt5|copiloto|claude|pplx|nano|nano2|sys-img|gemma|gemma2|codegemma|qwen|qwen2|qwen3|qwencoder|llama|llama3|phi|phi3|yi|kimi|kimik2|cog|mistral|magistral|baichuan|marin|rakutenai|rocket|swallow|falcon|ideias|explicar|resumir|corrigir|resumirurl|resumirchat|recomendar|debater|aventura|addai|addmetaai|aimemoria|airesetar)/.test(c)) return 'ia';
  // Admin & Grupo
  if (/^(kick|ban|ban2|bam|promote|demote|rebaixar|promover|mute|desmute|mute2|desmute2|del|dam|limpar|marcar|totag|sorteio|nomegp|descgrupo|fotogrupo|addregra|delregra|setregras|regras|setdesc|setnomegrupo|add|adicionar|addmembro|tempban|tempkick|advertir|warn|unwarn|warnings|resetwarn|inativos|inatividade|atividade|participantes|jid|getjid|antidemote|antiflood|antifigurinha|antistatus|antidoc|antiloc|antifig|antibtn|antilinkgp|antilinkcanal|antilinkhard|antilinksoft|antiporn|antitoxic|antipalavra|x9|captcha|aceitatodos|proibir|em|lista|multiprefixo|setbammsg|limparrank|resetrank|mantercontador|blockuser|unblockuser|addblacklist|delblacklist|blockcmd|unblockcmd|automsg|banghost|limitmessage|dellimitmessage|aprovar|recusarsolic|addmod|delmod|grantmodcmd|revokemodcmd|wladd|wl\.|addparceria|delparceria|addautoadm|addautoadmidia|delautoadm|autorepo|autodl|minmessage|assistente|modobn|modoparceria|modorpg|modolite|autosticker|cmdlimit|fotomenugrupo|infoperso|legendasaiu|legendabv|fotobv|rmfotobv|fotosaiu|rmfotosaiu|soadm|open|close|opengp|closegp|actgp|grupo|linkgp|adv|rmadv|listadv|listamute|listblocksgp|listblacklist|listmods|listmodcmds|listautoadm|autorespostas|raidstatus|solicitacoes|antiraid|capturalink|modoraid|parcerias|addparceria|delparceria|admin|admins|tagadmins|link|todos|hidetag|out|sair|leave|bye|setprefix|prefixgrupo|groupprefix|settheme|temagrupo|grouptheme)/.test(c)) return 'admin';
  // Jogos
  if (/^(quiz|resp|forca|jogodavelha|tictactoe|connect4|uno|memoria|wordle|digitar|batalhanaval|stop|anagrama|dueloquiz|cacapalavras|eununca|vab|chance|quando|sn|ppt|dado|moeda|roleta|verdade|desafio|cassino|blackjack|slots|crash|apostar|loteria|corrida|leilao|dados|coinflip)/.test(c)) return 'jogos';
  // Economia & RPG
  if (/^(daily|saldo|coins|depositar|levantar|transferir|doar|bau|roubar|trabalhar|minerar|work|mine|fish|coletar|colher|caçar|plantar|cultivar|cook|eat|vendercomida|explorar|masmorra|bossrpg|evoluir|prestige|streak|reivindicar|speedup|dep|sacar|pix|loja|comprar|vender|emprego|demitir|investir|sell|topriqueza|diario|caixa|rara|lendaria|presente|lojapremium|comprarpremium|boost|propriedades|cprop|cprops|tributos|meustats|dungeon|class|casa|auction|mercado|listar|cmerc|meusan|cancelar|duelrpg|arena|torneio|assaltar|crime|guerra|forge|enchant|dismantle|reparar|materiais|precos|receitas|ingredientes|sementes|plantacao|vagas|habilidades|desafiosemanal|desafiomensal|toprpg|rankglobal|ranklvl|equipamentos|carteira|perfilrpg|inv|rpgstats|rpgadd|rpgremove|rpgsetlevel|rpgadditem|rpgremoveitem|rpgresetplayer|rpgresetglobal)/.test(c)) return 'economia';
  // Interações & Família
  if (/^(abracar|abracarrpg|beijar|beijarrpg|tapa|tapar|soco|socar|dancar|matar|matar|cafune|morder|mordida|lamber|lambida|explodir|sexo|surubao|tomate|goza|gozar|mamar|mamada|beijob|beijarb|casar|divorciar|namorar|terminar|proteger|baterrpg|adotaruser|deserdar|criarcla|convidar|aceitarconvite|recusarconvite|expulsar|rmconvite|casamento|trair|historicotraicao|brincadeira|namoro|relacionamento|casais|familia|arvore|cla|pets|adotar|feed|train|evolve|petbattle|renamepet|petbet|equippet|unequippet|petnome|treinarpet|lojapet|rep|vote|toprep|denunciar|denuncias|conquistas|missoes|eventos)/.test(c)) return 'interacoes';
  // Texto & Fontes
  if (/^(bold|bold2|mini|tiny|smallcaps|scaps|mono|monospace|code|glitch|zalgo|calc|calcular|math|cor|color|randomcolor|base|baseconv|encurtar|short|curto|fakequote|fake-quote|fq|tagme|tagme2|mgs|spoiler|secret|lermais|upload|vazar|renomear|relevar|tabela|conselhos|getperfil|getbio|fazernick|listaddi|listaddd|abv|conselho|conselhobiblico|piada|charada|motivacional|elogio|reflexao|fato|cantadas|filosofia|biblia|horoscopo|idade|age|anos)/.test(c)) return 'texto';
  // Search & Stalk
  if (/^(stalkff|ttstalk|gitubstalk|stalkinsta|anime|anime2|filme|aptoide|rbxcodes|gethtml|idcanal|cep|cnpj|ip|clima|google|noticias|apps|dicionario|wikipedia|pesquisar|resumir|notícias)/.test(c)) return 'search';
  // Audio
  if (/^(bass|bass2|bass3|grave|grave2|grave3|reverb|reverb2|reverb3|8d|8d2|8d3|slowed|slowed2|slowed3|slowedreverb|slowedreverb2|slowedreverb3|chorus|chorus2|chorus3|nightcore|vaporwave|hardcore|robot|chipmunk|squirrel|monster|whisper|pitch|deep|echo|stadium|cave|underwater|telephone|radio|lofi|flanger|phaser|tremolo|vibrato|reverse|karaoke|blown|earrape|fat|smooth|fast|slow|menuaudio)/.test(c)) return 'audio';
  // Logos
  if (/^(darkgreen|write|advanced|typography|pixel|flag|americanflag|deleting|pornhub|avengers|captainamerica|stone3d|neon2|thor|amongus|deadpool|blackpink|naruto|rainbow|shadowsky|smoke|stars|metal|butterfly|cemetery|flaming|gradient|graffiti|harrypotter|neonparty|neonglow|neonmetalic|tiktoktxt|battlefield|pubg|anime|game|ffrose|ffgren|fluffy|lava|cool|comic|fire|water|ice|elegant|gold|fortune|blue|silver|neon|skate|retro|candy|glossy|newyear|tiger|galaxy|dragonfire|goldpink|mascote|titanium|eraser|halloween|snow|america|mascoteneon|doubleexposure|3dcrack|colorful|ballon|multicolor|graffitipaint|graffitistyle|frozen|ligatures|watercolor|summerbeach|cloudsky|techstyle|royal|firework|mascotemetal|captain|graffitiwall|phlogo|glitter|vintage3d)/.test(c)) return 'logos';
  // Info & Perfil
  if (/^(ping|info|perfil|dono|criador|donos|subdono|uptime|status|statusbot|statusgp|system|stats|aiapis|myvip|lid|perfilpic|avaliar|suporte|bug|zipbot|gitbot|likeff|infoff|me|dados|meustatus|totalcmd|topcmd|rankativo|rankinativo|rankativos|checkativo|atividade|rep|toprep|denuncias|conquistas|caixa|diario|roles|role\.|mention|afk|voltei|statusbot|statusgp)/.test(c)) return 'info';
  // Zoeira (medidores)
  if (/^(gay|gay2|lindo|lindo2|linda|feio|feio2|feia|burro|burro2|burra|inteligente|otaku|fiel|infiel|corno|corna|gado|gada|gostoso|gostosa|rico|rica|pobre|safado|safada|vesgo|vesga|bebado|bebada|machista|homofobico|homofobica|racista|chato|chata|sortudo|sortuda|azarado|azarada|forte|fraco|fraca|pegador|pegadora|otario|otaria|macho|bobo|boba|nerd|nerd2|preguicoso|preguicosa|trabalhador|trabalhadora|brabo|braba|malandro|malandra|simpatico|simpatica|engracado|engracada|charmoso|charmosa|misterioso|misteriosa|carinhoso|carinhosa|desumilde|humilde|ciumento|ciumenta|corajoso|corajosa|covarde|esperto|esperta|talarico|talarica|chorao|chorona|brincalhao|brincalhona|bolsonarista|petista|comunista|lulista|traidor|traidora|bandido|bandida|cachorro|cachorra|vagabundo|vagabunda|pilantra|mito|padrao|comedia|psicopata|fortao|fortona|magrelo|magrela|bombado|bombada|chefe|presidente|presidenta|rei|rainha|patrao|patroa|playboy|zueiro|zueira|gamer|programador|programadora|visionario|visionaria|billionario|bilionaria|poderoso|poderosa|vencedor|vencedora|senhor|senhora|fofoqueiro|fofoqueira|dorminhoco|dorminhoca|comilao|comilona|sedentario|sedentaria|atleta|estudioso|estudiosa|romantico|romantica|extrovertido|extrovertida|introvertido|introvertida|calmo|calma|nervoso|nervosa|organizado|organizada|bagunceiro|bagunceira|economico|economica|gastador|gastadora|saudavel|doente|supersticioso|supersticiosa|cetico|cetica|religioso|religiosa|ateu|ateia|tradicional|moderno|moderna|conservador|conservadora|liberal|patriotico|patriotica|cosmopolita|rural|urbano|urbana|aventureiro|aventureira|caseiro|caseira|viajante|local|global|tecnologico|tecnologicas|analogico|analogica|digital|offline|online|social|antisocial|popular|solitario|solitaria|lider|seguidor|seguidora|independente|dependente|criativo|criativa|pratico|pratica|sonhador|sonhadora|realista|otimista|pessimista|confiante|inseguro|insegura|maduro|madura|infantil|serio|seria|sorte|sortudo2|responsavel|irresponsavel|lesbica|bucetuda|ladra|nazista|homofobica|racista|chata|sortuda|azarada|fraca|pegadora|otaria|boba|nerd|preguicosa|trabalhadora|braba|linda|malandra|simpatica|engracada|charmosa|misteriosa|carinhosa|ciumenta|corajosa|esperta|talarica|chorona|brincalhona|traidora|bandida|cachorra|vagabunda|fortona|magrela|bombada|presidenta|rainha|patroa|programadora|visionaria|bilionaria|poderosa|vencedora|senhora|fofoqueira|dorminhoca|comilona|sedentaria|estudiosa|romantica|extrovertida|introvertida|calma|nervosa|organizada|bagunceira|economica|gastadora|supersticiosa|cetica|religiosa|ateia|moderna|conservadora|patriotica|urbana|aventureira|caseira|tecnologicas|analogica|solitaria|seguidora|criativa|pratica|sonhadora|insegura|madura|seria|criente|pecador|ciumao|possessivo|desapegado|sono|insone|dorminhoco2|viciado|viciada|viciadao|invejoso|invejosa|inveja|pirocudo|pirokudo|safado|safada|vesgo|vesga|bebado|bebada)/.test(c)) return 'zoeira';
  // Rank
  if (/^rank/.test(c)) return 'rank';
  // Owner
  if (/^(broadcast|send|eval|restart|panel|addcase|removicase|downcase|listcases|runcase|reloadcases|setprefix|settheme|temas|change|themeglobal|globaltheme|buttonmode|menustyle|addcmdvip|flood)/.test(c)) return 'owner';
  // Anti-link / Anti-spam / Welcome
  if (/^(antilink|antispam|welcome|goodbye|bemvindo|saida|antistatus|autosticker|bemvindo|saida)/.test(c)) return 'admin';
  // Flood
  if (/^flood/.test(c)) return 'admin';
  // Relacionamentos
  if (/^(brincadeira|namoro|casamento|trair|historicotraicao|namorar|terminar|relacionamento|casais|casar|divorciar)/.test(c)) return 'interacoes';
  // Default
  return 'outros';
}

// ── META DE CADA SUBMENU ─────────────────────────────────────
const SUBMENU_META = {
  downloads:    { title: '📥 DOWNLOADS',              sub: 'Música • Vídeo • Redes Sociais',     btn: '📥 Downloads' },
  stickers:     { title: '🎨 STICKERS & IMAGENS',     sub: 'Figurinhas • Packs • Arte Visual',   btn: '🎨 Stickers' },
  ia:           { title: '🤖 IA & CHATBOTS',           sub: 'Inteligência Artificial com Memória', btn: '🤖 IA' },
  admin:        { title: '👥 ADM & GRUPOS',            sub: 'Moderação • Regras • Automação',     btn: '👥 ADM & GRUPOS' },
  jogos:        { title: '🎮 JOGOS & DIVERSÃO',        sub: 'Quiz • Forca • Casino • Mini-games',  btn: '🎮 Jogos' },
  economia:     { title: '💰 ECONOMIA & RPG',          sub: 'Coins • Bank • RPG • Crafting',       btn: '💰 Economia' },
  interacoes:   { title: '💕 INTERAÇÕES & FAMÍLIA',    sub: 'Abraçar • Beijar • Casar • Pets',     btn: '💕 Interações' },
  texto:        { title: '✍️ TEXTO & UTILIDADES',      sub: 'Fontes • Calc • Frases • Ferramentas', btn: '✍️ Texto' },
  search:       { title: '🔎 SEARCH & STALK',          sub: 'Pesquisas • Stalk • Consultas',       btn: '🔎 Search' },
  audio:        { title: '🎧 EFEITOS DE ÁUDIO',        sub: 'Bass • Reverb • 8D • Slowed • Voz',   btn: '🎧 Áudio' },
  logos:        { title: '🖋️ LOGOS & EFEITOS',         sub: 'Criação de logos e efeitos de texto',  btn: '🖋️ Logos' },
  info:         { title: 'ℹ️ INFO & PERFIL',           sub: 'Ping • Status • Perfil • Diagnóstico', btn: 'ℹ️ Info' },
  zoeira:       { title: '😂 ZOEIRA & MEDIDORES',      sub: 'Medidores • Brincadeiras • Ranks',     btn: '😂 Zoeira' },
  rank:         { title: '🏆 RANKINGS',                sub: 'Rankings do grupo por atributo',       btn: '🏆 Ranks' },
  owner:        { title: '👑 DONO & SISTEMA',          sub: 'Broadcast • Eval • Config • Cases',    btn: '👑 Dono' },
  outros:       { title: '📌 OUTROS COMANDOS',         sub: 'Comandos diversos e utilitários',      btn: '📌 Outros' },
};

// ── EMOJIS POR CATEGORIA ─────────────────────────────────────
const CAT_EMOJI = {
  downloads: '📥', stickers: '🎨', ia: '🤖', admin: '🛡️', jogos: '🎮',
  economia: '💰', interacoes: '💕', texto: '✍️', search: '🔎', audio: '🎧',
  logos: '🖋️', info: 'ℹ️', zoeira: '😂', rank: '🏆', owner: '👑', outros: '📌',
};

// ── CONSTRUIR ITENS DE UM SUBMENU ────────────────────────────
function buildItems(commands, category) {
  return commands
    .filter(cmd => categorize(cmd) === category)
    .sort()
    .map(cmd => ({
      cmd,
      emoji: CAT_EMOJI[category] || '📌',
      desc: '', // descrição curta pode ser adicionada depois
      sel: isSelectable(cmd),
    }));
}

// ── OBTER TODOS OS SUBMENUS COM ITENS ────────────────────────
function getAllSubmenus(allCommands) {
  const result = {};
  for (const [cat, meta] of Object.entries(SUBMENU_META)) {
    const items = buildItems(allCommands, cat);
    if (items.length > 0) {
      result[cat] = { ...meta, items };
    }
  }
  return result;
}

// ── OBTER MENU PRINCIPAL (lista de submenus) ─────────────────
function getMainMenuSections(allSubmenus) {
  const sections = [];
  // Secção 1: Menus diversos
  const sec1 = { title: '📋 MENUS', rows: [] };
  const sec2 = { title: '⚡ AÇÕES DIRECTAS', rows: [] };

  for (const [cat, data] of Object.entries(allSubmenus)) {
    if (cat === 'owner') continue; // owner só aparece para dono
    sec1.rows.push({
      header: `${data.title}`,
      title: data.sub,
      id: `menu_${cat}`,
    });
  }
  sections.push(sec1);

  // Secção 2: Comandos de ação directa (sel)
  const directCmds = [];
  for (const [, data] of Object.entries(allSubmenus)) {
    for (const item of data.items) {
      if (item.sel) directCmds.push(item);
    }
  }
  if (directCmds.length > 0) {
    sec2.rows = directCmds.slice(0, 30).map(item => ({
      header: `${item.emoji} ${item.cmd}`,
      title: item.desc || 'Executar directamente',
      id: item.cmd,
    }));
    sections.push(sec2);
  }

  return sections;
}

module.exports = {
  isSelectable,
  categorize,
  buildItems,
  getAllSubmenus,
  getMainMenuSections,
  SUBMENU_META,
  CAT_EMOJI,
  SEL_PATTERNS,
};
