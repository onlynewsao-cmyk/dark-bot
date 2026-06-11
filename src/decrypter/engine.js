const { shannonEntropy, utilExtractStrings, extractFieldsFromText } = require('./formats/_util');

class ForensicEngine {
  async analyze(buffer, fileName) {
    const entropy = shannonEntropy(buffer);
    const strings = utilExtractStrings(buffer, 3);
    const text = strings.join('\n');
    
    const fields = extractFieldsFromText(text);

    // Identificação de Protocolo Base
    let proto = 'SSH / TCP';
    if (text.toLowerCase().includes('vmess') || text.toLowerCase().includes('vless')) proto = 'V2RAY / XRAY';
    if (text.toLowerCase().includes('dns') || buffer.includes(0x35)) proto = 'SLOWDNS';
    
    // Busca profunda de SNI (Bugs)
    const hostRegex = /(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]/gi;
    const allSnis = text.match(hostRegex) || [];
    const bug = allSnis.find(s => 
      s.includes('.') && 
      s.length > 5 && 
      !/google|evozi|injector|github|darknet|microsoft|apple|crashlytics|cloudfront|cloudinary/i.test(s)
    );

    // Reconstrução de Payload (Busca agressiva por padrões VPN)
    let payload = strings.find(s => 
      (s.includes('[crlf]') || s.includes('[host_port]') || s.includes('[protocol]')) &&
      (s.includes('GET') || s.includes('CONNECT') || s.includes('POST'))
    ) || '';
    
    if (!payload) {
        const payloadPatterns = [
          /(?:GET|CONNECT|POST|PUT|OPTIONS|PATCH|HEAD).*?\[protocol\].*?\[crlf\]/i,
          /(?:GET|CONNECT|POST|PUT).*?\[crlf\]Host:.*?\[crlf\]/i,
          /CONNECT\s+\[host_port\].*?\[crlf\]/i,
          /(?:GET|POST|CONNECT).*?\[host_port\].*?\[protocol\]/i,
          /\[raw\].*?\[protocol\]/i
        ];
        for (const pattern of payloadPatterns) {
          const match = text.match(pattern);
          if (match) { payload = match[0]; break; }
        }
    }

    // Heurística: Se achou o bug (SNI) mas não o payload completo, reconstrói o padrão do Injector
    if (bug && !payload.includes(bug) && (text.includes('HTTP') || text.includes('6.5.0'))) {
        payload = `CONNECT [host_port] [protocol][crlf]Host: ${bug}[crlf][crlf]`;
    }

    // Captura de Nota/Descrição (Busca por blocos de texto grandes ou específicos)
    let note = text.match(/(?:nota|note|desc|info|criador|by|mensagem).*?[:=]\s*(.*)/i)?.[1] || 
                 text.match(/BY\s+(.*)/i)?.[1] || 
                 strings.find(s => s.length > 25 && !s.includes('http') && !s.includes('[') && !s.includes('/') && !s.includes('.')) ||
                 '🔒 Configuração Protegida';

    return {
      fileName,
      entropy: entropy.toFixed(4),
      host: fields.host || fields.sshHost || 'Servidor Interno',
      port: fields.port || fields.sshPort || '443',
      user: fields.sshUser || fields.user || 'Nativo',
      pass: fields.sshPass || fields.pass || 'Nativo',
      sni: bug || fields.sni || 'Nenhum',
      payload: payload,
      note: note.trim(),
      protocol: proto,
      isProtected: entropy > 7.5
    };
  }
}

module.exports = new ForensicEngine();
