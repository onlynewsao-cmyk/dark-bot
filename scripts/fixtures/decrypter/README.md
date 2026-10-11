# Fixtures do VPN Decrypter

- `openvpn-upstream-client.conf` é o exemplo de cliente OpenVPN 2.6 publicado no repositório oficial OpenVPN (`sample/sample-config-files/client.conf`), baixado em 2026-10-11. Não contém certificado, chave ou acesso ativo. O teste de integração envia este ficheiro real de configuração para a mesma rota `POST /api/decrypt` usada pelo dashboard.
- `v2box-export.v2box` é uma exportação estrutural segura de V2Box/sing-box, com domínio `.example.test` e UUID de teste. Ela comprova a normalização do formato moderno sem guardar credenciais de terceiros.

Não usar estas fixtures como configurações de conexão.
