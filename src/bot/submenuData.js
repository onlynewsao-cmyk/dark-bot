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
  // ══════════════════════════════════════════════════════════════════════
  // AÇÃO DIRETA - Comandos que executam SEM PRECISAR DE:
  // - Dados adicionais (cep, Wikipedia, etc.)
  // - Responder a mensagem
  // - Marcar/mencionar alguém
  // - Definir valor ou opção (dado, moeda, etc.)
  // - Qualquer informação extra
  // ══════════════════════════════════════════════════════════════════════
  
  // ── INFO E STATUS (só mostram informação) ──
  /^ping$/, /^info$/, /^perfil$/, /^dono$/, /^criador$/, /^donos$/,
  /^uptime$/, /^status$/, /^statusbot$/, /^stats$/, /^perf$/,
  /^aiapis$/, /^checkia$/, /^checkativo$/, /^statusalugar$/,
  /^statusgp$/, /^statusbot$/, /^system$/, /^topcmd$/, /^totalcmd$/,
  
  // ── NAVEGAÇÃO (só abrem submenus) ──
  /^menu$/, /^start$/, /^help$/,
  
  // ── GRUPOS (ações únicas sem dados) ──
  /^link$/, /^linkgp$/, /^grupo$/, /^todos$/, /^hidetag$/,
  /^admins$/, /^tagadmins$/, /^listmods$/, /^listadv$/, /^listamute$/,
  /^regras$/, /^soadm$/, /^actgp$/, /^gruposalugados$/,
  
  // ── TOGGLE GRUPOS (ligar/desligar sem dados) ──
  /^antilink$/, /^antispam$/, /^antiflood$/, /^antifigurinha$/,
  /^antidoc$/, /^antiloc$/, /^antiporn$/, /^antitoxic$/,
  /^antidemote$/, /^antistatus$/, /^antibtn$/, /^antipalavra$/,
  /^welcome$/, /^goodbye$/, /^bemvindo$/, /^saida$/,
  /^open$/, /^close$/, /^abrir$/, /^fechar$/,
  /^everyone$/, /^all$/, /^whitelist$/, /^resetlink$/,
  /^novo-link$/, /^revoke$/,
  
  // ── ECONOMIA (ações únicas sem dados) ──
  /^daily$/, /^saldo$/, /^coins$/, /^carteira$/, /^inventario$/, /^inv$/,
  /^perfilrpg$/, /^rpgstats$/, /^rpginfo$/, /^ficha$/, /^caixa$/,
  /^arvore$/, /^familia$/, /^cla$/, /^conquistas$/, /^diario$/,
  /^atividade$/, /^checkativo$/, /^rentstatus$/, /^statusalugar$/,
  /^statusgp$/, /^meustats$/, /^toprep$/, /^denuncias$/,
  /^conquistas$/, /^caixa$/, /^diario$/, /^rep$/,
  
  // ── UTILIDADES (ações únicas sem dados) ──
  /^clima$/, /^weather$/, /^tempo$/, /^hora$/,
  /^getjid$/, /^copyjid$/, /^myjid$/, /^jid$/,
  /^getbio$/, /^getperfil$/, /^getcasecode$/, /^viewcase$/, /^listcase$/, /^listcases$/,
  /^dicio$/, /^dicionario$/, /^significado$/,
  
  // ── ZOEIRA (medidores - ações únicas sem dados) ──
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
  /^social$/, /^antisocial$/, /^popular$/, /^leader$/,
  /^independente$/, /^dependente$/, /^realista$/, /^otimista$/,
  /^pessimista$/, /^confiante$/, /^infantil$/, /^responsavel$/,
  /^irresponsavel$/, /^liberal$/, /^tradicional$/, /^cosmopolita$/,
  /^rural$/, /^viajante$/, /^lesbica$/, /^bucetuda$/,
  
  // ── RANKINGS (só mostram ranking) ──
  /^rank$/, /^rankglobal$/, /^ranklvl$/, /^rankuser$/,
  /^rankativo$/, /^rankinativo$/, /^rankativos$/,
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
  
  // ── DONO (ações únicas sem dados) ──
  /^restart$/, /^reconnect$/, /^clearLogs$/, /^clearCache$/,
  /^setprefix$/, /^changeprefix$/, /^settheme$/, /^changetheme$/,
  /^blockcmd$/, /^unblockcmd$/, /^blockuser$/, /^unblockuser$/,
  /^addblacklist$/, /^delblacklist$/, /^clearAllChats$/,
  /^setbomsg$/, /^setbammsg$/, /^changeprefix$/,
  /^listcases$/, /^viewcase$/, /^getcasecode$/,
];

function isSelectable(cmd) {
  return SEL_PATTERNS.some(re => re.test(cmd));
}

// ── CATEGORIAS POR PADRÃO DE NOME ────────────────────────────
function categorize(cmd) {
  const c = cmd.toLowerCase();
  // v6.15: overrides explícitos (prioridade máxima)
  const OVERRIDES = {
    pinpacks:'stickers', pinpack:'stickers', pinsticker:'stickers',
    casar:'interacoes', divorciar:'interacoes', namorar:'interacoes',
    '8d':'audio', '8d2':'audio', '8d3':'audio',
    abraco:'interacoes', beijo:'interacoes',
    ficha:'economia', explore:'economia',
    cantada:'texto', bible:'texto', versiculo:'texto', filosofo:'texto',
    coin:'jogos', dice:'jogos', d6:'jogos',
    vip:'info', assinar:'info',
    cmdsocultos:'owner', portal18:'owner',
    copilot:'ia', chat:'ia', ask:'ia',
    unmute:'admin', unadmin:'admin', calar:'admin',
    fechar:'admin', 'fechar-grupo':'admin', abrir:'admin', 'abrir-grupo':'admin',
    everyone:'admin', all:'admin', whitelist:'admin',
    facebook:'downloads', tt:'downloads', tw:'downloads',
    fig:'stickers', figurinha:'stickers',
    tikstalk:'search', ttstalk:'search',
    blackhzx:'logos', blood:'logos', cemiterio:'logos', ffavatar:'logos',
    themechange:'owner', themes:'owner',
    texto:'texto', submenuRPG:'economia', menurpg:'economia', maiscmds:'owner', menumais:'owner', textosticker:'stickers', fight:'jogos',advanced:'logos',deleting:'logos',emprego:'economia',deepai:'ia',deepsearch:'search',menuaudio:'info', inveja:'zoeira',invejosa:'zoeira',invejoso:'zoeira',invisible:'admin',invite:'admin',pixel:'logos',casal:'interacoes',casamento:'interacoes',nome:'economia',rg:'economia',ficha:'economia', imagem:'ia', stickers:'info', legendasaiu:'admin', legendabv:'admin', textsticker:'stickers', txtsticker:'stickers',
    // v6.47: 's' é o alias mais usado de sticker e caía em 'outros'
    s:'stickers', fig:'stickers', figu:'stickers',
    baixaraudio:'downloads',
    // v7.0 — Comandos que caíam em 'outros'
    acordar:'ia', mymemory:'ia', resetia:'ia', imagine:'ia', img:'ia', pergunta:'ia', news:'ia', jornal:'ia',
    acordaaura:'ia', auraon:'ia', auraoff:'ia', auramodo:'ia', aurastatus:'ia', auradorme:'ia', aurasai:'ia', auragrupos:'ia', auralist:'ia',
    amaldicoar:'interacoes', bencao:'interacoes', bullying:'interacoes', chutar:'interacoes', cuspir:'interacoes',
    declarar:'interacoes', envenenar:'interacoes', espancar:'interacoes', facada:'interacoes', flertar:'interacoes',
    highfive:'interacoes', lutar:'interacoes', mimimi:'interacoes', pontape:'interacoes', rir:'interacoes',
    tiro:'interacoes', wave:'interacoes', bater:'interacoes', cantar:'interacoes', chorar:'interacoes',
    chocolate:'interacoes', comer:'interacoes', cafe:'interacoes', cafezinho:'interacoes', crente:'interacoes',
    pedir:'interacoes', pensar:'interacoes', falar:'interacoes', dormir:'interacoes', descansar:'interacoes',
    estudar:'interacoes', cuidar:'interacoes', experimentar:'interacoes', desistir:'interacoes', negrito:'interacoes',
    pequeno:'interacoes', telefone:'interacoes', estender:'interacoes', revelar:'interacoes', esposa:'interacoes',
    programar:'interacoes', malucao:'interacoes', suic:'interacoes', suicidio:'interacoes', timido:'interacoes',
    jokenpo:'jogos', truco:'jogos', roulette:'jogos', russa:'jogos', genio:'jogos', enigma:'jogos',
    flip:'jogos', ship:'jogos', shipo:'jogos', bingo:'jogos', akinator:'jogos', chute:'jogos',
    caraoucoroa:'jogos', combate:'jogos', adivinha:'jogos', simular:'jogos', palavra:'jogos', velha:'jogos',
    music:'downloads', music2:'downloads', music3:'downloads', musica:'downloads', yt:'downloads', ig:'downloads',
    fullhd:'downloads', hq:'downloads', ytfhd:'downloads', ythd:'downloads', sp:'downloads', vd:'downloads',
    wiki:'search', movie:'search', procurar:'search', githubstalk:'search', ghstalk:'search',
    instastalk:'search', stalktk:'search', episodiosanime:'search', lives:'search', robloxcodes:'search',
    world:'search', mapa:'search', historia:'search', buscalivro:'search', buscar18:'owner',
    normas:'admin', rules:'admin', setrules:'admin', setsubject:'admin', removeaviso:'admin',
    godadm:'admin', godmode:'admin', listrents:'admin', trial:'admin', rent:'admin',
    cancelrent:'admin', renew:'admin', renovar:'admin', clean:'admin', espiao:'admin', captura:'admin',
    guild:'economia', guilda:'economia', criarguilda:'economia', criarpersonagem:'economia', newchar:'economia',
    racas:'economia', quest:'economia', rpgstart:'economia', shop:'economia', heal:'economia',
    revive:'economia', reviver:'economia', pocao:'economia', potion:'economia', forjar:'economia',
    npc:'economia', usar:'economia', hospedar:'economia', cassar:'economia', cripto:'economia', cambio:'economia',
    gif:'stickers', gifreact:'interacoes', figbusca:'owner', figgif:'owner', ximg:'stickers', pin:'stickers', pack18:'owner',
    packbusca:'owner', packname:'stickers', takepack:'stickers', slypack:'stickers', sly:'stickers',
    neymar:'logos', placaneymar:'logos',
    audiofx:'audio', audiomeme:'audio',
    auditcmds:'owner', audit:'owner', vercode:'owner', cmdcheck:'owner', newcase:'owner',
    recarregarcases:'owner', refreshcases:'owner', removecase:'owner', remcase:'owner',
    showcase:'owner', validarcase:'owner', verificarcmds:'owner', listcmds:'owner', mycases:'owner',
    adultapi:'owner', adultmode:'owner', adultsearch:'owner', adultvideo:'owner',
    e621:'owner', erome:'owner', eromevid:'owner', hotchat:'owner', kona:'owner', nekos:'owner', yande:'owner',
    '__change_theme_handler__':'owner',
    // v7.0b — Mais comandos que caíam em 'outros'
    _adultsend:'owner', adultstats:'owner', gif18:'owner', hentai:'owner',
    // v7.1 — 18+ movidos para owner
    fig18:'owner', shorts18:'owner', menu18:'owner', '_adultsend':'owner',
    portal18:'owner', cmdsocultos:'owner',

    livros18:'owner', xvideo:'owner', xvideodl:'owner',
    aceitar:'interacoes', aceitarinvocacao:'interacoes', ameme:'interacoes',
    cat:'interacoes', dog:'interacoes', fofocar:'interacoes', hallobat:'interacoes',
    mata:'interacoes', paparico:'interacoes', pet:'interacoes', pickup:'interacoes',
    polo:'interacoes', recusar:'interacoes', recusarinvocacao:'interacoes',
    rename:'interacoes', talk:'interacoes', treinar:'interacoes',
    winadivinha:'jogos', winforca:'jogos', winquiz:'jogos',
    doido:'zoeira',
    alugar:'economia', desalugar:'economia', rentstatus:'economia', dar:'economia',
    biomas:'search', capitulo:'search', lercap:'search', lermanga:'search',
    manga:'search', mangacap:'search', 'mangá':'search', livros18:'owner',
    dicio:'search', significado:'search', search:'search',
    apagadas:'admin', fakeban:'admin', fakelog:'admin',
    d:'admin', list:'admin', mdel:'admin', mdown:'admin', mlist:'admin',
    mm:'admin', mup:'admin', off:'admin', remove:'admin', revoke:'admin',
    resetlink:'admin', silenciar:'admin', 'silent-tag':'admin', tagall:'admin',
    apigratis:'info', alteradores:'info', b2:'info', ca:'info', getprefix:'info',
    id:'info', lat:'info', listtemas:'info', listthemes:'info', morecmds:'info',
    mp4:'info', msgid:'info', msginfo:'info', mudarstema:'info', myid:'info',
    perf:'info', performance:'info', planos:'info', prefixo:'info', premium:'info',
    speed:'info', staff:'info', start:'info', submenurpg:'info', tecnologica:'info',
    tema:'info', tempo:'info', ver:'info', velocidade:'info', weather:'info',
    fullsticker:'stickers', renamesticker:'stickers',
    'novo-link':'admin', rpginfo:'economia', teste:'info', termo:'jogos',
    aura:'ia', dormiraura:'ia', modoaura:'ia',
    'microsoft-ai':'ia', rest:'info', pais:'info', getcasecode:'owner', listcase:'owner',

 baixarvideo:'downloads',
    dlmp3:'downloads', dlmp4:'downloads', ytmp3:'downloads', ytmp4:'downloads',
    ytaudio:'downloads', ytplay4:'downloads', fhd:'downloads', vid:'downloads', vid2:'downloads',
    down:'downloads', downloads:'downloads',
    boasvindas:'admin', bv:'admin',
    equipe:'info', subdono:'info',
    tempoonline:'info', uptime:'info',
      'despertar':'economia',
    'rpgstart':'economia',
    'newchar':'economia',
    'rg':'economia',
    'ficha':'economia',
    'perfilrpg':'economia',
    'quest':'economia',
    'historia':'economia',
    'aventura':'economia',
    'lutar':'economia',
    'fight':'economia',
    'combate':'economia',
    'explorar':'economia',
    'explore':'economia',
    'descansar':'economia',
    'rest':'economia',
    'pocao':'economia',
    'potion':'economia',
    'reviver':'economia',
    'revive':'economia',
    'guilda':'economia',
    'guild':'economia',
    'criarguilda':'economia',
    'rankrpg':'economia',
    'toprpg':'economia',
    'rankglobal':'economia',
    'inventario':'economia',
    'inv':'economia',
    'bau':'economia',
    'npc':'economia',
    'falar':'economia',
    'talk':'economia',
    'mapa':'economia',
    'biomas':'economia',
    'world':'economia',
    'vidas':'economia',
    'lives':'economia',
    'racas':'economia',
    'classes':'economia',
    'rpginfo':'economia',
    'nome':'economia',
    'rename':'economia',
    'pet':'economia',
    'pets':'economia',
    'gacha':'economia',
    'cartas':'economia',
    'criaclan':'owner',
    'criaclã':'owner',
    'newclan':'owner',
    'darkrpg':'owner',
    'rpginit':'owner',
    'iniciar-rpg':'owner',
    'darkrpg-test':'owner',
    'rpgtest':'owner',
    'darkrpg-status':'owner',
    'rpgstatus':'owner',
    'menu-rpg':'owner',
    'menurpg':'owner',
    'rpgmenu':'owner',
    'comunicado':'owner',
    'arsenal':'owner',
    'ranking-update':'owner',
    'addglb':'owner',
    'addglobal':'owner',
    'regras':'owner',
    'rules':'owner',
    'normas':'owner',
    'arena':'economia',
    'torneio':'economia',
    'duelrpg':'economia',
    'duelar':'economia',
    'masmorra':'economia',
    'dungeon':'economia',
    'bossrpg':'economia',
    'evoluir':'economia',
    'prestige':'economia',
    'streak':'economia',
    'diario':'economia',
  };
  if (OVERRIDES[c]) return OVERRIDES[c];
  // Downloads
  if (/^(down|downloads)$/.test(c)) return 'info'; // navegação de submenu
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
  // v6.15: fallback para padrões adicionais
  const extra = categorizeExtra(c);
  if (extra) return extra;
  return 'outros';
}

// ── META DE CADA SUBMENU ─────────────────────────────────────
const { describe } = require('./commandDescriptions');

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
  const caseHandler = require('./caseHandler');
  const nativeCommands = require('./nativeCommands');
  const packageCommands = {
    ...require('./packages/interactions'),
    ...require('./packages/family'),
    ...require('./packages/economy'),
    ...require('./packages/games'),
    ...require('./packages/cheats'),
  };
  
  return commands
    .filter(cmd => {
      // Filtrar comandos sem função
      const hasFunction = caseHandler.CASES.has(cmd) || 
                          typeof nativeCommands[cmd] === 'function' || 
                          typeof packageCommands[cmd] === 'function';
      return hasFunction && categorize(cmd) === category;
    })
    .sort()
    .map(cmd => ({
      cmd,
      emoji: CAT_EMOJI[category] || '📌',
      // v6.47: era `desc: ''` fixo — TODOS os 1564 itens dos submenus
      // saíam sem descrição, o que produzia o "undefined" no WhatsApp.
      desc: describe(cmd, category),
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


// ── PADRÕES ADICIONAIS (v6.15) ──────────────────────────────────
function categorizeExtra(c) {
  // Downloads extras
  if (/^(baixaraudio|baixarvideo|dlmp3|dlmp4|dlmp3s|dlmp4s|ytaudio|ytmp3|ytmp4|ytmp3s|ytmp4s|ytplay4|yt4k|yt4|fhd|vid|vid2|down|downloads|facebook|fbvideo|fbfoto|fbpost|fbstory|fbstatus|tw|tt|tiktok2|instagram2|pinterest2|pinmp4|pinvd|spotify2|scdl|soundcloud2|letra|kwai|igstory|gdrive|mediafire|mcplugin|tomp3|shazam|myinstants|pintemp3|pintemp4|instamp3|instamp4|playid|playhq|yt3v2|yt4v2|sc$)/.test(c)) return 'downloads';
  // Stickers extras
  if (/^(fig|figurinha|textosticker|textsticker|txtsticker|pinpacks|pinpack|pinsticker|stickerwm|watermark|sfull2|figubug3|aisticker|jeff|faber|norian|totext|ptvmsg|gerarlink|rvisu|brat2|legenda|figmeme|figraiva|figcoreana|figanime|figroblox|figemoji|figdesenho|figengracada)/.test(c)) return 'stickers';
  // IA extras
  if (/^(copilot|copiloto|chat|ask|chatgpt2|gpt3|gpt4|gpt5|checkia|clearmemory|addai|addmetaai)/.test(c)) return 'ia';
  // Admin extras
  if (/^(unmute|unadmin|calar|fechar|fechar-grupo|abrir|abrir-grupo|everyone|all|whitelist|wladd|wldel|wllist|definirregras|setregras|regras|avisos|aviso|chamar|clearwarn|verwarns|fakeedit|fakemsg|editarmsg|copiar|copymsg|citar|blacklist|unblacklist|antidemote|antiflood|antifigurinha|antistatus|antidoc|antiloc|antifig|antibtn|antilinkgp|antilinkcanal|antilinkhard|antilinksoft|antiporn|antitoxic|antipalavra|x9|captcha|aceitatodos|proibir|multiprefixo|setbammsg|limparrank|resetrank|mantercontador|blockuser|unblockuser|addblacklist|delblacklist|blockcmd|unblockcmd|automsg|banghost|limitmessage|dellimitmessage|aprovar|recusarsolic|addmod|delmod|grantmodcmd|revokemodcmd|listmods|listmodcmds|listautoadm|autorespostas|raidstatus|solicitacoes|antiraid|capturalink|modoraid|parcerias|addparceria|delparceria|addautoadm|addautoadmidia|delautoadm|autorepo|autodl|minmessage|assistente|modobn|modoparceria|modorpg|modolite|autosticker|cmdlimit|fotomenugrupo|infoperso|legendasaiu|legendabv|fotobv|rmfotobv|fotosaiu|rmfotosaiu|soadm|opengp|closegp|actgp|adv|rmadv|listadv|listamute|listblocksgp|listblacklist|apagar|deletar|delete|del|dam|limpar|marcar|totag|sorteio|nomegp|descgrupo|fotogrupo|addregra|delregra|setdesc|setnomegrupo|add|adicionar|addmembro|tempban|tempkick|advertir|warn|unwarn|warnings|resetwarn|inativos|inatividade|atividade|participantes|jid|getjid|convite|link|linkgp|admins|tagadmins|hidetag|out|sair|leave|bye|setprefix|prefixgrupo|groupprefix|settheme|temagrupo|grouptheme|boasvindas|bv|welcome|goodbye|saida|bemvindo)/.test(c)) return 'admin';
  // Jogos extras
  if (/^(coin|dice|d6|dado2|moeda2|ppt2|quiz2|forca2|jogodavelha2|tictactoe2|connect4|uno|memoria|wordle|digitar|batalhanaval|stop|anagrama|dueloquiz|cacapalavras|eununca|vab|chance|quando|sn|cassino|blackjack|slots|crash|apostar|loteria|corrida|leilao|dados|coinflip)/.test(c)) return 'jogos';
  // Economia/RPG extras
  if (/^(ficha|explore|explorar2|rg|perfilrpg|rankrg|nome|rankricos|carteira|inv|equipamentos|toprpg|rankglobal|ranklvl|rpgstats|rpgadd|rpgremove|rpgsetlevel|rpgadditem|rpgremoveitem|rpgresetplayer|rpgresetglobal|dep|sacar|pix|loja|comprar|vender|emprego|demitir|investir|sell|topriqueza|diario|caixa|rara|lendaria|presente|lojapremium|comprarpremium|boost|propriedades|cprop|cprops|tributos|meustats|dungeon|class|casa|auction|mercado|listar|cmerc|meusan|cancelar|duelrpg|arena|torneio|assaltar|crime|guerra|forge|enchant|dismantle|reparar|materiais|precos|receitas|ingredientes|sementes|plantacao|vagas|habilidades|desafiosemanal|desafiomensal|meditar|gear|qg|masmorra|bossrpg|eventos|missoes|conquistas|streak|reivindicar|speedup|prestige|evoluir|pescar|fish|coletar|colher|cacar|plantar|cultivar|cook|eat|vendercomida|trabalhar|minerar|work|mine)/.test(c)) return 'economia';
  // Interações extras
  if (/^(abraco|beijo|casar|divorciar|namorar|terminar|proteger|baterrpg|adotaruser|deserdar|criarcla|convidar|aceitarconvite|recusarconvite|expulsar|rmconvite|casamento|trair|historicotraicao|brincadeira|namoro|relacionamento|casais|familia|arvore|cla|pets|adotar|feed|train|evolve|petbattle|renamepet|petbet|equippet|unequippet|petnome|treinarpet|lojapet|rep|vote|toprep|denunciar|denuncias)/.test(c)) return 'interacoes';
  // Texto extras
  if (/^(cantada|bible|versiculo|filosofo|filosofia2|piada2|charada2|motivacional2|elogio2|reflexao2|fato2|conselho2|conselhobiblico|horoscopo2|cor2|color2|randomcolor|base2|baseconv|encurtar2|short2|curto2|fakequote2|fq2|tagme2|tagme2|mgs2|spoiler|secret|lermais2|upload2|vazar2|renomear2|relevar2|tabela2|conselhos2|getperfil2|getbio2|fazernick2|listaddi2|listaddd2|abv2|bold2|mini2|tiny2|smallcaps2|scaps2|mono2|monospace2|code2|glitch2|zalgo2|calc2|calcular2|math2)/.test(c)) return 'texto';
  // Search extras
  if (/^(tikstalk|ttstalk|gitubstalk|stalkinsta|stalkff|anime2|filme2|aptoide|rbxcodes|gethtml|idcanal|cep|cnpj|ip|clima2|google|noticias|apps|dicionario|wikipedia|pesquisar|resumir|notícias)/.test(c)) return 'search';
  // Logos extras
  if (/^(blackhzx|blood|cemiterio|ffavatar|lolavatar|pubgavatar|amongus|captain|deadpool|blackpink|thor|stone3d|neon2|graffiti2|harrypotter|neonparty|neonglow|neonmetalic|tiktoktxt|battlefield|pubg|naruto|rainbow|shadowsky|smoke|stars|metal|butterfly|cemetery|flaming|gradient|darkgreen|write|advanced|typography|pixel|flag|americanflag|deleting|pornhub|avengers|captainamerica)/.test(c)) return 'logos';
  // Info extras
  if (/^(vip|assinar|myvip|statusbot|statusgp|system|stats|uptime|tempoonline|aiapis|lid|perfilpic|avaliar|suporte|bug|zipbot|gitbot|likeff|infoff|me|dados|meustatus|totalcmd|topcmd|rankativo|rankinativo|rankativos|checkativo|roles|mention|afk|voltei|equipe|subdono|donos|criador|dono|info|perfil|ping)/.test(c)) return 'info';
  // Audio extras
  if (/^(8d|8d2|8d3|bass2|bass3|grave2|grave3|reverb2|reverb3|slowed2|slowed3|slowedreverb2|slowedreverb3|chorus2|chorus3|nightcore|vaporwave|hardcore|robot|chipmunk|squirrel|monster|whisper|pitch|deep|echo|stadium|cave|underwater|telephone|radio|lofi|flanger|phaser|tremolo|vibrato|reverse|karaoke|blown|earrape|fat|smooth|fast|slow|menuaudio)/.test(c)) return 'audio';
  // Owner extras
  if (/^(cmdsocultos|portal18|themechange|themes|broadcast|send|eval|shell|execcase|testcase|viewcase|listcases|downcase|addcase|removicase|reloadcases|runcase|panel|restart|autodecrypt|prefixos|blackhzx|espiar|antidelete)/.test(c)) return 'owner';
  return null;
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
