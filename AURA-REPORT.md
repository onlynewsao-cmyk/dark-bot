# Auditoria específica — AURA

**Data:** 22 de agosto de 2026  
**Âmbito:** módulos em `src/aura/`, integração com o roteador de mensagens, comandos e IA.

## Resultado de validação

- **28 módulos AURA** carregados isoladamente com `require()` sem falhas de importação ou arranque.
- **26 scripts `test-aura-*.js`** executados um a um: **26 aprovados, 0 falhas**.
- A suite oficial (`npm test`) também passou; nela estão incluídos os principais testes AURA e a auditoria do catálogo de comandos.

## Cobertura que passou

- Modos AURA e Assistente, isolamento entre grupos e PV do dono.
- Interpretação de linguagem natural e bloqueio de comandos explícitos, para não responder indevidamente a `!menu`, `.play`, `$saldo`, etc.
- Permissões por dono, admin, VIP e utilizador livre.
- Acções de grupo, comunidade, criação de canal, convite, agenda e execução de intenções.
- Memória, contexto, assunto, voz, imagens/mídia e respostas offline.
- Pair code, QR e comportamento de sessão testado na suite principal.
- Fallback de IA: quando uma API de IA está indisponível, a AURA devolve resposta dinâmica em vez de expor erros técnicos no WhatsApp.

## Verificação de Render/UptimeRobot

O `render.yaml` está preparado para Render Free:

- `/health` é usado como health check do Render.
- `/ping` é uma resposta leve de 200 para UptimeRobot, com orientação de monitorização a cada 5 minutos.
- A aplicação usa `PORT` e `trust proxy`, adequados ao proxy do Render.
- `APP_URL` tem de coincidir exactamente com a URL activa no Render; é esta variável que o keep-alive interno usa.

A consulta pública à URL configurada respondeu com a página **“Render - Application loading”**. Isto é o cold start normal do plano Free — não é evidência de falha da AURA. Para confirmar em produção, aguarde a aplicação acordar e consulte `/health` ou o diagnóstico autenticado do painel.

## Pontos de atenção operacionais

1. **IA:** confirme no Render que pelo menos `GROQ_API_KEY` ou `GEMINI_API_KEY` está presente e válida. Sem uma delas, a AURA continua a responder pelo fallback local, mas não terá respostas generativas reais.
2. **Voz:** sem `ELEVENLABS_API_KEY` e sem o binário `espeak` no container, pedidos de voz caem correctamente em fallback de texto. Se voz real for requisito, configure o fornecedor de voz no Render.
3. **MongoDB:** a AURA depende do MongoDB para memória persistente, agendamentos e configurações. Mantenha o Atlas acessível pela allowlist de rede e valide `MONGODB_URI` no painel do Render.
4. **Dependências:** existem vulnerabilidades transitivas identificadas no `npm audit`, sobretudo nas cadeias de `axios`, `sharp` e `wa-sticker-formatter`. Não houve mudança forçada de versões, para evitar quebrar o bot conectado; deve ser feita actualização controlada.
5. **Segredos:** uma chave GitHub que foi partilhada em texto simples deve ser revogada e recriada. Nenhuma chave foi guardada nos ficheiros de relatório.

## Conclusão

Não foi encontrado erro funcional reproduzível na AURA no ambiente de testes. A causa mais provável de qualquer falha que apareça apenas em produção será configuração/estado externo (chave de IA, MongoDB, sessão WhatsApp, cold start ou serviço de voz), e não uma falha detectável nos módulos AURA actuais.
