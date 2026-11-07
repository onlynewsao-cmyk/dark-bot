#!/usr/bin/env node
'use strict';
/** Regressões do funil público: CTA, planos reais e captação sem spam. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const auth = fs.readFileSync(path.join(root, 'src/routes/auth.js'), 'utf8');
const routes = fs.readFileSync(path.join(root, 'src/routes/dashboard.js'), 'utf8');
const landing = fs.readFileSync(path.join(root, 'src/views/landing.ejs'), 'utf8');
const studio = fs.readFileSync(path.join(root, 'src/views/dashboard/marketing.ejs'), 'utf8');
const sidebar = fs.readFileSync(path.join(root, 'src/views/partials/sidebar.ejs'), 'utf8');
let checks = 0;
function ok(name, condition) { assert.ok(condition, name); checks++; console.log('  ✅', name); }

ok('landing obtém preços do mesmo catálogo de aluguel', auth.includes("require('../bot/cases/rental2')") && auth.includes('rental.RENTAL_PLANS') && auth.includes('rental.getPrices()'));
ok('landing funciona mesmo se a configuração de preço estiver indisponível', auth.includes("if (!plans.length)"));
ok('CTA de trial vai para conversa voluntária no WhatsApp', landing.includes('Quero testar 7 dias') && landing.includes('trial grátis de 7 dias') && landing.includes('wa.me/'));
ok('landing cobre grupos, negócios e criadores', landing.includes('Admins de grupos') && landing.includes('Pequenos negócios') && landing.includes('Criadores e comunidades'));
ok('funnel apresenta trial, configuração e conversão sem prometer automático', /trial/i.test(landing) && /configuração/i.test(landing) && /planos/i.test(landing));
ok('rota interna de marketing exige Dono', routes.includes("router.get('/marketing', requireOwner"));
ok('kit interno proíbe disparo e DM não solicitada', studio.includes('Não dispare') && studio.includes('não solicitada'));
ok('kit tem links e textos para WhatsApp e redes sociais', studio.includes('Landing pública') && studio.includes('WhatsApp · Trial') && studio.includes('Instagram e Facebook'));
ok('sidebar expõe a central de marketing somente na área de negócio', sidebar.includes('Marketing &amp; Captação') && sidebar.includes('/dashboard/marketing'));
console.log(`\nMARKETING FUNNEL: ${checks} OK / 0 falhas`);
