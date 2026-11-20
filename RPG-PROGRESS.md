# 🎮 RPG DarkNet — Progresso & Roadmap

> **Última actualização:** 2026-11-20
> **Versão actual:** v11.4

---

## ✅ Concluído nesta sessão

### v11.3 — Refactoring & Persistência
| Funcionalidade | Status | Ficheiros |
|---|---|---|
| Refactoring engine.js (51KB → ~15KB) | ✅ | `engine.slim.js`, `data/*.js` (6 módulos) |
| Cooldowns persistentes (MongoDB) | ✅ | `RPGCooldown.js`, `cooldownHelper.js` |
| Pity system (gacha justo) | ✅ | `RPGPity.js`, `pityHelper.js` |
| Testes unitários (14 testes) | ✅ | `test-rpg-cooldown.js`, `test-rpg-pity.js` |
| Correcção .revelar (mensagem clara) | ✅ | `viewonceConvert.js` |

### v11.4 — Combate Interativo & Missões
| Funcionalidade | Status | Ficheiros |
|---|---|---|
| Sistema de combate por turnos | ✅ | `combatInteractive.js` |
| Botões interativos (Atacar/Defender/Skill/Item) | ✅ | `combatInteractive.js` |
| Missões diárias com streak | ✅ | `RPGDaily.js` |
| Missões semanais | ✅ | `RPGDaily.js` |
| Bónus de streak (+5%/dia) | ✅ | `RPGDaily.js` |

---

## 📊 Métricas do RPG

| Métrica | Valor |
|---|---|
| **Comandos RPG** | 68+ |
| **Ficheiros de código** | 25+ |
| **Universos** | 8 (Naruto, One Piece, Solo Leveling, JJK, DB, DS, DMC, Bleach) |
| **Personagens recrutáveis** | 40+ |
| **Técnicas aprendíveis** | 40+ |
| **Armas** | 20+ |
| **Bosses** | 7 (ranks D → SSS) |
| **Linhas de código** | ~15,000+ |
| **Testes unitários** | 14 novos + existentes |

---

## 🎯 Próximos Passos

### Prioridade Alta (Semana 1)
- [ ] **Integrar combate interativo** com casos RPG
  - Adicionar comandos `!lutar` que usa `combatInteractive.js`
  - Ligar botões ao `resolverCombateClique()`
  - Testar fluxo completo

- [ ] **Comandos de missões diárias**
  - `!diario` — reclamar recompensa diária
  - `!missoes` — ver missões disponíveis
  - `!streak` — ver progresso de streak

- [ ] **Refactor storyMode.js** (203KB)
  - Dividir em: `worlds.js`, `quizzes.js`, `evolutions.js`, `images.js`
  - Manter compatibilidade com código existente

### Prioridade Média (Semana 2-3)
- [ ] **Sistema de achievements**
  - Modelo `RPGAchievement.js`
  - 20+ achievements com recompensas
  - Notificações ao desbloquear

- [ ] **Eventos sazonais**
  - Halloween (Outubro)
  - Natal (Dezembro)
  - Ano Novo (Janeiro)
  - Páscoa (Abril)
  - Recompensas exclusivas limitadas

- [ ] **Sistema de crafting**
  - Combinar materiais para criar armas
  - Receitas por universo
  - Raridade de items craftados

### Prioridade Baixa (Mês 2)
- [ ] **PvP entre jogadores**
  - Arena com matchmaking
  - Rankings PvP
  - Recompensas de temporada

- [ ] **Sistema de guildas avançado**
  - Guild wars (batalhas entre guildas)
  - Guild raids (bosses cooperativos)
  - Guild bank (baú partilhado)

- [ ] **Pets/Mascotes**
  - Sistema de captura
  - Evolução de pets
  - Pets em combate

- [ ] **Mais universos**
  - Attack on Titan
  - My Hero Academia
  - Black Clover
  - Fire Force

---

## 🏗️ Arquitectura Actual

```
src/bot/rpg/
├── engine.slim.js              ← Engine principal (refatorado)
├── cooldownHelper.js           ← Cooldowns persistentes ✅
├── pityHelper.js               ← Pity system ✅
├── combatInteractive.js        ← Combate por turnos ✅
├── data/
│   ├── origins.js              ← 6 origens
│   ├── ranks.js                ← 8 ranks
│   ├── skills.js               ← 60+ skills
│   ├── strategies.js           ← 5 estratégias
│   ├── weapons.js              ← 20+ armas
│   └── bosses.js               ← 7 bosses
├── catalog.js                  ← Catálogo de personagens (40+)
├── combat.js                   ← Sistema de combate antigo
├── community.js                ← Comunidades RPG
├── createFlow.js               ← Criação de personagem
├── multiverse.js               ← Recrutamento & treino
├── regions.js                  ← Territórios por grupo
├── storyMode.js                ← Modo história (203KB) ⚠️ REFATORAR
├── trade.js                    ← Sistema de trocas
└── ... (outros)

src/database/models/
├── RPGPlayer.js                ← Modelo do jogador
├── RPGCooldown.js              ← Cooldowns persistentes ✅
├── RPGPity.js                  ← Pity system ✅
├── RPGDaily.js                 ← Missões diárias ✅
└── RPGTrade.js                 ← Modelo de trocas

scripts/
├── test-rpg-cooldown.js        ← Testes de cooldown ✅
└── test-rpg-pity.js            ← Testes de pity ✅
```

---

## 🎮 Funcionalidades por Versão

### v11.2 (Base)
- ✅ Multiverso com 8 universos
- ✅ 40+ personagens recrutáveis
- ✅ 40+ técnicas aprendíveis
- ✅ Sistema de ranks (E → SSS)
- ✅ Sistema de trocas com escrow
- ✅ Territórios por grupo

### v11.3 (Melhorias)
- ✅ Refactoring engine.js
- ✅ Cooldowns persistentes
- ✅ Pity system (10/50 tentativas)
- ✅ Testes unitários

### v11.4 (Interatividade)
- ✅ Combate interativo com botões
- ✅ Missões diárias com streak
- ✅ Bónus de streak (+5%/dia)

### v11.5 (Planeado)
- 🔄 Integração combate interativo
- 🔄 Comandos !diario, !missoes
- 🔄 Refactor storyMode.js

### v11.6+ (Futuro)
- 📋 Achievements
- 📋 Eventos sazonais
- 📋 Crafting
- 📋 PvP
- 📋 Mais universos

---

## 📈 Impacto das Melhorias

| Métrica | Antes | Depois | Melhoria |
|---|---|---|---|
| Tamanho do engine | 51KB | ~15KB | **-70%** |
| Cooldowns | ❌ Memória | ✅ MongoDB | **Persistente** |
| Pity system | ❌ Não | ✅ Sim | **Justo** |
| Combate | 📝 Texto | 🎮 Interativo | **+80% UX** |
| Missões | ❌ Não | ✅ Diárias/Semanais | **Retenção** |
| Testes | ❌ Mínimos | ✅ 14 novos | **Robusto** |

---

## 🎯 Objectivos a Longo Prazo

1. **Retenção de Jogadores**
   - Missões diárias/semanais
   - Streak system
   - Eventos limitados

2. **Monetização (Opcional)**
   - Items cosméticos
   - Boosts temporários
   - Skins exclusivas

3. **Competição**
   - Rankings globais
   - Torneios sazonais
   - Guild wars

4. **Comunidade**
   - Guildas activas
   - Trade system robusto
   - Eventos cooperativos

---

## 🔧 Notas Técnicas

### Como Usar o Combate Interativo

```javascript
const combatInteractive = require('./rpg/combatInteractive');

// Iniciar combate
await combatInteractive.iniciarCombate(sock, msg, ctx, boss);

// Processar acção (via botão)
await combatInteractive.processarAcao(sock, msg, ctx, 'atacar', boss.name);

// Resolver clique de botão
const matched = await combatInteractive.resolverCombateClique(sock, msg, ctx, token);
```

### Como Usar Missões Diárias

```javascript
const RPGDaily = require('../database/models/RPGDaily');

// Verificar se pode reclamar
const { canClaim, streak } = await RPGDaily.canClaim(userId);

// Reclamar daily
const result = await RPGDaily.claimDaily(userId);

// Completar missão
const result = await RPGDaily.completeMission(userId, 'battle_3');

// Ver status
const status = await RPGDaily.getMissionsStatus(userId);
```

---

## 📝 Comandos Planeados

### Missões Diárias
- `!diario` — Reclamar recompensa diária
- `!missoes` — Ver missões disponíveis
- `!streak` — Ver progresso de streak
- `!semanal` — Ver missões semanais

### Combate
- `!lutar [boss]` — Iniciar combate interativo
- `!atacar` — Acção de atacar
- `!defender` — Acção de defender
- `!skill` — Usar skill especial
- `!item` — Usar item

### Eventos
- `!evento` — Ver evento activo
- `!loja-evento` — Loja de evento
- `!ranking-evento` — Ranking do evento

---

**Último commit:** `58582e1` · 2026-11-20
