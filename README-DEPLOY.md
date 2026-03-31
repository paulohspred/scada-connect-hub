# Deploy no Ubuntu 24.04 (RC-Gateway)
Este guia ensina a enviar o sistema atual limpo e pronto para o seu servidor online.

## 1. Enviando os Arquivos para o Servidor (VPS)
Você precisa copiar este repositório/arquivos para o Ubuntu.
Se estiver usando o Git:
```bash
git clone https://seu-link-do-repositorio
cd scada-connect-hub
```

Ou, se baixou o `.zip` e transferiu via FTP/SCP:
```bash
unzip scada-connect-hub.zip
cd scada-connect-hub
```

## 2. Iniciar Instalação com 1 Comando
Com a pasta do repositório aberta no console SSH (`Ubuntu`), rode como Administrador:
```bash
sudo bash vps-install.sh
```

**O que o Instalador vai perguntar:**
- **Domínio/IP:** Digite o IP público da sua máquina virtual (ex: `160.200.5.2` ou `painel.meudominio.com`).
   *Este IP será injetado no Gateway para liberar o firewall*

**O que o Instalador vai fazer sozinho:**
1. Instalar o Docker Engine.
2. Instalar Node.js.
3. Subir de forma blindada todos os serviços do Banco (`Supabase`)
4. Recopilar a Aplicação Web Nginx configurada para as Chaves Criptográficas que acabaram de nascer.
5. Iniciar seu Painel na porta `80` convencional.

## 3. Acessando Pela Primeira Vez
Após a mensagem de sucesso do script (🚀 INSTALAÇÃO FINALIZADA COM SUCESSO!), abra seu navegador:
`http://COLOQUE_AQUI_O_SEU_IP`

O login mestre padrão do sistema é:
**admin@rcgateway.com**
**Admin@1234**
