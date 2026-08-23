# Auditoria detalhada — AURA (modo original) vs ASSISTENTE (modo padrão)

**Data:** 23 de agosto de 2026
**Ramo:** `arena/01a02f31-dark-bot`
**Método:** leitura integral dos módulos `src/aura/`, verificação programática de
catálogo→executor, e execução das 17 suites de teste dedicadas (452 verificações).

---

## 0. Como o bot escolhe entre as duas

`src/aura/auraModes.js` define os dois modos:

| | 🌹 **AURA** | 🤖 **ASSISTENTE** |
|---|---|---|
| Onde vive | PV do Dono (sempre) + grupos onde o Dono a invocou | Todos os outros grupos (padrão) |
| Persistência | `GroupSettings.auraMode='aura'` | implícito |
| Persona | 19 anos, OTOME, leal ao Dark, emotiva, ciumenta | profissional, neutra, estilo Meta AI |
| Responde por | `auraHuman.auraRespond()` | `auraModes.assistantRespond()` |
| Invocação | `.aura` / "aura acorda" (só o Dono) | automática |
| Dormir | `.aura dormir` → volta a assistente | — |

No `commandHandler.js` (~linha 1918) a bifurcação é:
`if (auraAwake || isPv) → aura.auraRespond(...)  else → auraModes.assistantRespond(...)`.

Ambas partilham o mesmo motor de IA, memória (`auraMemory`), visão (Gemini),
voz (ElevenLabs/fallback) e sanitização — muda a **persona** e o **tom**.

---

## 1. 🌹 AURA — funções e habilidades verificadas

### 1.1 Cérebro (`auraBrain.js`) — 55 capacidades
Catálogo com gatilhos naturais em PT. Verificado programaticamente:
**55/55 capacidades têm execução real em `auraExec.js`** (nenhuma morta, nenhum case extra).

Por permissão (`podeFazer` respeitado — teste confirma):
- **todos (12):** quem_escreveu, o_que_escreveu, respeitar, reagir_msg, ver_status, canal_stats, canal_info, listar_admins, info_grupo, lembrar, esquecer, recordar
- **admin (4):** foto_grupo, listar_membros, promover_admin, rebaixar_admin
- **dono (39):** modos de chat, ignorar/designorar, xingar/zoar/elogiar, postar_status, 16 operações de canal, entrar_link, reencaminhar, sair_grupo, foto_perfil, limpar_chat, agendar/parar

Router em 3 camadas (custo 0 ms em conversa normal):
1. **Modos por chat** (Map em memória) → 0 ms
2. **Catálogo** (regex de gatilhos) → 0 ms
3. **Router IA** — só se `pareceOrdem()` passar (portão de verbos de comando)

### 1.2 Executor (`auraExec.js`) — 55 casos
Cada `case` liga a função **real**: `megaActions` (111 fn), `advancedActions` (27 fn),
`auraCanais` (30 fn), `auraHistorico` (12 fn), `auraGrupo`, `auraMemory`, `auraAgenda`.
Atitude (xingar/zoar/elogiar/respeitar) devolve `gerar` → texto sai da IA no estilo dela.

### 1.3 Comandos por conversa (`auraCommands.js`) — sem prefixo
- **58 mapeamentos frase→comando**, 43 comandos cobertos (play, video, sticker, saldo,
  daily, admins, menu, ban, promote, fechar, abrir, tagall, warn, antilink, welcome…)
- **24 comandos BLOQUEADOS** por conversa (irreversíveis): eval/shell, broadcast,
  restart, adddono/removedono, addcase/delcase — esses exigem prefixo escrito.

### 1.4 Comportamentos directos (no `commandHandler`, só Dono)
Canta 🎵, sussurra, ri (regex com fronteira p/ não apanhar "cria"), silêncio
temporizado, voz-directa, defesa imediata do Dark (`detectDarkAttack`→`getDarkDefense`).

### 1.5 Módulos de suporte (todos carregam, exports verificados)
`auraHuman` (27 fn), `auraTalk`, `auraAssunto`, `auraMedia` (11 fn — vê imagem/vídeo,
ouve áudio, lê doc/link), `auraVoz` (8 fn), `auraHistorico`, `auraCanais` (30 fn),
`auraAgenda` (10 temas), `auraMemory`, `auraIntent` (acorda/dorme), `auraSanitizer`,
`offlineResponses`.

### 1.6 Resultado dos testes — AURA
**16 suites, 419 verificações, 0 falhas:**
auramodes 26 · aurabrain 21 · auracmds 22 · auraviva 16 · aurafaltava 19 ·
auraconvite 17 · auracriarcanal 17 · auravoz 21 · auravozreal 22 · auravozcompleta 27 ·
auramidia 28 · auraetapa3 45 · auraetapa4 39 · auraetapa5 40 · auraetapa6 41 · auracom 18

Prova funcional extra (executada agora): detecção correcta de 7 ordens
("fala só por áudio"→modo_so_audio, "zoa o @marcos"→zoar, "lembra…"→lembrar…)
e **nenhum** falso positivo em conversa normal ("bom dia", "estás bonita").

---

## 2. 🤖 ASSISTENTE — funções e habilidades verificadas

### 2.1 Persona (`buildAssistantPrompt`)
Profissional, sem romance/ciúmes/"Dark"/memória afectiva. Regras verificadas:
- fala como pessoa; NUNCA diz "sou uma IA / assistente virtual / fui programada"
- respostas curtas (1-3 frases), **sem emojis**, sem fórmulas de call-center
- pode ter opiniões leves; desvia perguntas pessoais sem sermão
- **executa, não só explica** (não responde "usa o comando X")
- se pedirem zoeira, ENTRA no jogo (não cita diretrizes/leis)
- injecta contexto (grupo, nº pessoas, Dono/VIP/admin) e **memória** da pessoa

### 2.2 Resposta (`assistantRespond`)
IA com a persona neutra + memória → sanitização dupla → fallback offline.

### 2.3 Sanitização (`_sanitize`) — rede de segurança à saída
Remove: falas de robô (6 regex), call-center (6 regex), tratamentos afectuosos,
marcadores `[STICKER|IMAGE|CMD]`, raciocínio `<think>`, asteriscos de acção,
**todos os emojis**. Se sobrar <2 chars → vazio → fallback.

### 2.4 Fallback offline (`assistantFallback`) — sem IA
Cobre: saudações, como-estás, quem-és, o-que-fazes, obrigado, despedida,
**hora e data reais** (sem IA), piada, triste, zangado, clima, genérico.
Variantes aleatórias (não repete a mesma frase).

### 2.5 Resultado dos testes — ASSISTENTE
**1 suite dedicada, 33 verificações, 0 falhas** (test:auraassistente):
prompt/memória/contexto 6 · respond+sanitização 6 · fallback rico 19 ·
sem vazamento de persona 2.
(As 26 verificações de `test:auramodes` também cobrem a persona do assistente.)

---

## 3. Isolamento entre os modos (verificado)
- Invocar a Aura num grupo **não afecta** outro grupo (isolamento por `groupJid`).
- Persona da Aura (namorada/OTOME/19 anos/brasileira/"meu Dark") está **ausente**
  do prompt do assistente — 11 verificações negativas passam.
- Fallback do assistente não usa tratamento afectuoso nem emojis.
- Sanitização dupla: mesmo que o modelo deixe escapar intimidade, é limpa à saída.

---

## 4. Veredicto

| | Estado |
|---|---|
| 🌹 AURA — 55 capacidades + executor + comandos por conversa + comportamentos | ✅ tudo ligado e funcional |
| 🤖 ASSISTENTE — persona + resposta + sanitização + fallback | ✅ tudo ligado e funcional |
| Isolamento Aura↔Assistente | ✅ sem vazamento de persona |
| Testes | ✅ **452 verificações, 0 falhas** |

Nenhuma função morta encontrada nestes dois modos. A única correcção feita nesta
auditoria (feed live do dashboard, commit `735af8b`) era do canal bot↔dashboard,
não da Aura/Assistente — ambas já estavam 100% operacionais.
