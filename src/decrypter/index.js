const ehi = require('./formats/ehi');
const chapéu = require('./formats/chapéu');
const npv = require('./formats/npv');
const darktunnel = require('./formats/darktunnel');
const tlstunnel = require('./formats/tlstunnel');
const openvpn = require('./formats/openvpn');
const ssh = require('./formats/ssh');
const jsonFormat = require('./formats/json');
const netmod = require('./formats/netmod');
const anytunnel = require('./formats/anytunnel');
const bdnet = require('./formats/bdnet');
const wyrvpn = require('./formats/wyrvpn');
const wireguard = require('./formats/wireguard');
const textFormat = require('./formats/text');
const apnalite = require('./formats/apnalite');

/**
 * NÚCLEO MESTRE DE CRIPTOGRAFIA v3.0
 * Suporta TODOS os formatos VPN conhecidos.
 * Reconhecimento automático por extensão E por conteúdo (blind decrypt).
 */

// Mapa completo de extensão → analisador
const EXT_MAP = {
  // Injetor HTTP
  ehi: ehi, ehic: ehi,
  // Túnel HA Plus
  chapéu: chapéu,
  // Túnel NPV
  npv: npv, npv4: npv, npv7: npv, npv8: npv, npvt: npv,
  // Túnel Escuro
  escuro: túnel escuro, escuro: túnel escuro,
  // Túnel TLS
  tls: túnel tls,
  // OpenVPN / WireGuard
  ovpn: openvpn, conf: wireguard,
  // SSH / SSL
  ssh: ssh, ssl: ssh,
  // JSON genérico
  json: formato JSON,
  // NetMod
  nm: netmod, nmess: netmod,
  // AnyTunnel
  qualquer: qualquer túnel,
  // Texto/URI
  txt: textFormat, log: textFormat, cfg: textFormat, ini: textFormat,
};

// Mapa de esquema URI → analisador (para detecção em texto/clipboard)
const URI_MAP = {
  'bdnet://': bdnet,
  'bd://': bdnet,
  'apnalite://': apnalite,
  'apna://': apnalite,
  'wyrvpn://': wyrvpn,
  'wyr://': wyrvpn,
  'vmess://': formato de texto,
  'vless://': formato de texto,
  'trojan://': formato de texto,
  'ss://': formato de texto,
  'ssr://': formato de texto,
  'ssh://': ssh,
  'histeria://': formato de texto,
  'hysteria2://': formato de texto,
  'tuic://': formato de texto,
  'warp://': formato de texto,
};

/**
 * Detecta formato por conteúdo (magic bytes, estrutura, etc)
 */
função detectarPorConteúdo(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return null;

  const str = buffer.toString('utf8').trim();

  // Hex puro do BDNet (começa com 4f07...)
  se (/^[0-9a-fA-F]{50,}$/.test(str) && str.startsWith('4f07')) retorne bdnet;

  // JSON válido
  se ((str.startsWith('{') && str.endsWith('}')) || (str.startsWith('[') && str.endsWith(']'))) {
    tentar {
      JSON.parse(str);
      retornar jsonFormat;
    } pegar {}
  }

  // WireGuard INI
  if (str.includes('[Interface]') && str.includes('PrivateKey')) return wireguard;

  // OpenVPN
  if (str.includes('client') && (str.includes('remote ') || str.includes('dev tun'))) return openvpn;

  // Configuração SSH
  if (str.includes('Host=') || str.includes('Port=') || str.includes('ssh_host')) return ssh;

  // Esquemas URI sem texto
  para (const [prefixo, analisador] de Object.entries(URI_MAP)) {
    se (str.toLowerCase().startsWith(prefix)) retorne parser;
  }

  // JSON codificado em Base64 (comum em vários túneis)
  tentar {
    const decodificado = Buffer.from(str, 'base64').toString('utf8');
    if (decoded.startsWith('{') || decoded.includes('"host"')) return jsonFormat;
  } pegar {}

  retornar nulo;
}

/**
 * Função principal de descriptografia.
 * @param {string} fileName - Nome do arquivo (com extensão)
 * @param {Buffer} buffer - Conteúdo binário
 */
função assíncrona descriptografar(nomeDoArquivo, buffer) {
  const ext = fileName.split('.').pop().toLowerCase();
  seja resultado = nulo;
  let usedFormat = ext.toUpperCase();

  tentar {
    // 1. Tentar por extensão (correspondência exata)
    const parser = EXT_MAP[ext];
    se (analisador) {
      tentar {
        resultado = aguarde parser.parse(buffer);
        se (resultado) formatoUsado = resultado.formato || ext.toUpperCase();
      } catch (e) {
        // Analisador da extensão falhou — tente detecção por conteúdo
      }
    }

    // 2. Se falhou, tente detecção automática de conteúdo
    se (!resultado) {
      const detected = detectByContent(buffer);
      se (detectado) {
        tentar {
          resultado = aguarde detectado.parse(buffer);
          se (resultado) formatoUsado = resultado.formato || 'DETECÇÃO AUTOMÁTICA';
        } catch (e) {}
      }
    }

    // 3. Se ainda falhou, blind decrypt (tenta todos)
    se (!resultado) {
      resultado = aguarda blindDecrypt(buffer);
      se (resultado) formatoUsado = resultado.formato || 'FORÇA BRUTA';
    }

    se (!resultado) {
      throw new Error(`Formato .${ext} não suportado ou criptografia desconhecida. Formatos suportados: ${Object.keys(EXT_MAP).join(', ')}`);
    }

    retornar {
      sucesso: verdadeiro,
      nomeDoArquivo,
      formato: formatoUsado,
      extraídoEm: novo Date().toISOString(),
      ...resultado,
    };
  } catch (erro) {
    throw new Error(`Falha na Extração: ${err.message}`);
  }
}

/**
 * Detecta se um texto contém URI de VPN válido
 * @param {string} text - Texto a analisar
 * @returns {{ scheme: string, parser: object } | null}
 */
função detectarURI(texto) {
  const t = (texto || '').trim().toLowerCase();
  para (const [prefixo, analisador] de Object.entries(URI_MAP)) {
    se (t.startsWith(prefix)) {
      retornar { esquema: prefixo.replace('://', ''), analisador };
    }
  }
  retornar nulo;
}

/**
 * Tenta todos os descriptografadores por ordem de probabilidade
 */
função assíncrona blindDecrypt(buffer) {
  const todosOsParsers = [
    ehi, chapéu, npv, túnel escuro, túnel tls,
    jsonFormat, netmod, anytunnel, apnalite,
    bdnet, wyrvpn, ssh, openvpn, wireguard, textFormat,
  ];
  para (const f de todos os analisadores sintáticos) {
    tentar {
      const res = await f.parse(buffer);
      se (res) retorne res;
    } catch (e) {}
  }
  retornar nulo;
}

/**
 * Lista de todas as extensões suportadas (para UI)
 */
const SUPPORTED_EXTENSIONS = [...new Set(Object.keys(EXT_MAP))].sort();
const SUPPORTED_URIS = Object.keys(URI_MAP);

module.exports = { decrypt, detectURI, blindDecrypt, SUPPORTED_EXTENSIONS, SUPPORTED_URIS };
