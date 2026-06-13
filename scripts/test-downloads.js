const downloader = require('../src/bot/downloader');
const mediaHandler = require('../src/bot/mediaHandler');

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT '+ms+'ms')), ms));
}
async function run(name, fn, ms=60000) {
  const t = Date.now();
  try {
    const r = await Promise.race([fn(), timeout(ms)]);
    const dt = Date.now()-t;
    let ok = false;
    let summary = '';
    if (Array.isArray(r)) { ok = r.length > 0 && !!r[0]?.url; summary = `${r.length} itens; first=${r[0]?.url?.slice(0,80)}`; }
    else { ok = !!r?.url; summary = JSON.stringify({title:r?.title?.slice?.(0,60)||r?.title, quality:r?.quality, duration:r?.duration, mime:r?.mimetype, url: !!r?.url, size:r?.size}).slice(0,300); }
    console.log(`${ok?'✅':'⚠️'} ${name} ${dt}ms ${summary}`);
    return {name, ok, dt, r};
  } catch (e) {
    const dt = Date.now()-t;
    console.log(`❌ ${name} ${dt}ms ${e.message}`);
    return {name, ok:false, dt, error:e.message};
  }
}

(async () => {
  const tests = [];
  tests.push(await run('youtubeSearch', () => downloader.youtubeSearch('lofi hip hop'), 20000));
  tests.push(await run('play/youtubeAudio', () => downloader.youtubeAudio('lofi hip hop'), 70000));
  tests.push(await run('play2/youtubeAudioSavefrom', () => downloader.youtubeAudioSavefrom('lofi hip hop'), 70000));
  tests.push(await run('play3/youtubeAudioAuto', () => downloader.youtubeAudioAuto('lofi hip hop'), 80000));
  tests.push(await run('video/youtubeVideo', () => downloader.youtubeVideo('lofi hip hop'), 70000));
  tests.push(await run('video2/youtubeVideoSavefrom', () => downloader.youtubeVideoSavefrom('lofi hip hop'), 90000));
  tests.push(await run('pinterestSearch', () => downloader.pinterestSearch('anime dark'), 30000));
  tests.push(await run('soundcloud', () => downloader.soundcloud('lofi hip hop'), 60000));
  tests.push(await run('mediafire', () => downloader.mediafire('https://www.mediafire.com/file/b9kfcxf3umrgn8l/T%C3%81+L%C3%81+DJUM%E2%8F%B3%EF%B8%8F.ehi/file'), 30000));

  const pin = tests.find(x => x.name === 'pinterestSearch' && x.ok)?.r?.[0]?.url;
  if (pin) {
    const t = Date.now();
    try {
      const buf = await Promise.race([mediaHandler.fetchBuffer(pin), timeout(20000)]);
      console.log(`✅ pinterest image fetch ${Date.now()-t}ms bytes=${buf.length}`);
    } catch(e) { console.log(`❌ pinterest image fetch ${Date.now()-t}ms ${e.message}`); }
  }

  const failed = tests.filter(x => !x.ok);
  console.log('\nSUMMARY:', `${tests.length-failed.length}/${tests.length} testes principais OK`);
  if (failed.length) {
    console.log('FAILED:', failed.map(x => `${x.name}: ${x.error || 'sem url'}`).join(' | '));
    process.exitCode = 2;
  }
})();
