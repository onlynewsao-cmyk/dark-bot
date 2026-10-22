#!/usr/bin/env python3
"""Run the reviewed offline subset; do not boot the application or run blanket npm test."""
import argparse
import concurrent.futures
import datetime
import hashlib
import json
import os
import pathlib
import re
import subprocess
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--output', default='docs/fixes-2026-10-18')
args = parser.parse_args()
DEST = (ROOT / args.output).resolve()
if ROOT not in DEST.parents: raise SystemExit('Output must be inside the project')
DEST.mkdir(parents=True, exist_ok=True)
EXISTING = [
 'test-ai-timeout.js', 'test-wa-timeout.js', 'test-aura-confirmation.js',
 'test-aura-learning-schedule.js', 'test-menu-gif-policy.js', 'test-roles.js',
 'test-aura-modes.js', 'test-channel-and-status-fixes.js', 'test-group-events-participants.js',
 'test-pv-command-aura-fix.js', 'test-prefixo-auto.js', 'test-menu-routing.js',
 'test-sticker-global.js', 'test-video-whatsapp.js',
]
NEW = [
 'test-aura-bugfixes.js', 'test-request-cache-isolation.js', 'test-ai-context-cache.js',
 'test-control-security.js', 'test-handler-conversation-controls.js', 'test-aura-language.js',
 'test-conversation-memory.js', 'test-message-router-controls.js',
 'test-aura-context.js', 'test-ai-cancellation.js', 'test-conversation-cancellation.js',
]
ENV = { 'PATH': os.environ.get('PATH', '/usr/bin:/bin'), 'HOME': '/home/user',
 'LANG': 'C.UTF-8', 'TZ': 'Africa/Luanda', 'NODE_ENV': 'test' }

def run_script(name):
    env = dict(ENV)
    if name == 'test-control-security.js': env['DARK_TEST_ALLOW_LOCAL'] = '1'
    start = time.monotonic()
    script = 'scripts/' + name
    try:
        result = subprocess.run(['node', '-r', './scripts/helpers/offline-guard.js', script], cwd=ROOT,
            env=env, capture_output=True, text=True, timeout=50)
        output = result.stdout + '\n' + result.stderr
        guards = re.findall(r'\[OFFLINE_GUARD\] (\{[^\n]*\})', output)
        summaries = [line for line in output.splitlines() if re.search(r'OK|RESULTADO|verificaç|passaram|PASSED|FALH|falha', line, re.I)]
        item = { 'script': script, 'exit_code': result.returncode, 'timed_out': False,
            'duration_seconds': round(time.monotonic() - start, 3),
            'guard_blocks': json.loads(guards[-1]) if guards else {}, 'summary': summaries[-4:] }
        if result.returncode: item['failure_tail'] = output[-9000:]
    except subprocess.TimeoutExpired:
        item = { 'script': script, 'exit_code': None, 'timed_out': True, 'duration_seconds': 50 }
    return item

# Parse only: no evaluation of source/fixtures/templates.
paths = subprocess.check_output(['git', 'ls-files', '-co', '--exclude-standard', '-z'], cwd=ROOT).decode().split('\0')
js_files = sorted({p for p in paths if p.endswith('.js')})
ejs_files = sorted({p for p in paths if p.endswith('.ejs')})
parse_code = r'''
const fs = require('fs'), vm = require('vm'), Module = require('module'), ejs = require('ejs');
const input = JSON.parse(fs.readFileSync(0, 'utf8'));
const out = { js: { total: input.js.length, passed: 0, failures: [] }, ejs: { total: input.ejs.length, passed: 0, failures: [] } };
for (const file of input.js) {
  try {
    let source = fs.readFileSync(file, 'utf8').replace(/^#![^\n]*\n/, '');
    if (file === 'scripts/fixtures/case-pin-systemzone.js') source = 'async function fixture(command) { switch(command) { ' + source + '\n} }';
    new vm.Script(Module.wrap(source), { filename: file }); out.js.passed++;
  } catch (error) { out.js.failures.push({ file, error: error.message }); }
}
for (const file of input.ejs) {
  try { ejs.compile(fs.readFileSync(file, 'utf8'), { filename: file }); out.ejs.passed++; }
  catch (error) { out.ejs.failures.push({ file, error: error.message }); }
}
console.log(JSON.stringify(out));
'''
parsed = subprocess.run(['node', '-e', parse_code], input=json.dumps({'js': js_files, 'ejs': ejs_files}),
    cwd=ROOT, env=ENV, text=True, capture_output=True, timeout=50)
if parsed.returncode:
    print(parsed.stderr); sys.exit(1)
syntax = json.loads(parsed.stdout)
results = []
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    for item in pool.map(run_script, EXISTING + NEW + ['smoke-local.js']):
        results.append(item)
        print(('OK   ' if item['exit_code'] == 0 else 'FAIL ') + item['script'], flush=True)
status = subprocess.run(['git', 'diff', '--check'], cwd=ROOT, capture_output=True, text=True)
report = {
 'generated_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'base_commit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
 'branch': subprocess.check_output(['git', 'branch', '--show-current'], cwd=ROOT, text=True).strip(),
 'node': subprocess.check_output(['node', '--version'], cwd=ROOT, text=True).strip(),
 'guard': 'Credential-stripped subprocesses; dotenv disabled; DB/child/external network blocked. Only security test permits literal loopback. Test mocks may replace guard methods; not a security sandbox.',
 'syntax': syntax, 'tests': results,
 'linguistic_corpus': { 'scenarios': len(json.loads((ROOT / 'scripts/fixtures/aura-language-corpus.json').read_text())['scenarios']), 'type': 'template-derived linguistic assertions, not 1423 new commands or live model evaluations' },
 'diff_check': {'exit_code': status.returncode, 'details': status.stdout + status.stderr},
 'not_executed': ['production bootstrap', 'real MongoDB', 'real WhatsApp accounts', 'provider calls', 'Northflank deployment', 'adult-resource requests', 'blanket npm test', 'native media integration'],
 'source_sha256': {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in js_files if p.startswith('src/')},
}
(DEST / 'validation-results.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
failures = len(syntax['js']['failures']) + len(syntax['ejs']['failures']) + sum(item['exit_code'] != 0 for item in results) + (status.returncode != 0)
print(json.dumps({'syntax': syntax, 'scripts_passed': sum(item['exit_code'] == 0 for item in results), 'scripts_total': len(results), 'failures': failures}, ensure_ascii=False))
sys.exit(1 if failures else 0)
