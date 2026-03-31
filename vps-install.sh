#!/bin/bash
set -e

echo "=========================================================="
echo " RC Gateway - Instalador Automático de Produção (Ubuntu) "
echo "=========================================================="

if [ "$EUID" -ne 0 ]; then
  echo "ERRO: Rode este script como ROOT (su - ou sudo bash vps-install.sh)"
  exit 1
fi

echo "Digite o IP PÚBLICO do seu servidor Ubuntu para expor a Interface."
echo "Exemplo: 172.10.1.200 ou admin.suaempresa.com"
read -p "Domínio/IP (Sem http://): " DOMAIN_IP

if [ -z "$DOMAIN_IP" ]; then
    echo "Cancelado. O domínio não pode ser vazio."
    exit 1
fi

echo ""
echo "[1/4] Atualizando Ubuntu e Instalando Dependências Nativas..."
apt-get update -y
apt-get install -y ca-certificates curl gnupg git jq lsb-release

if ! command -v docker &> /dev/null; then
    echo "Instalando Docker Engine..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
fi

if ! command -v node &> /dev/null; then
    echo "Instalando Node.js (Ambiente CLI Supabase)..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

echo ""
echo "[2/4] Iniciando o Banco de Dados Industrial (Supabase Local)..."
npm install --ignore-scripts

# Garante que as rotas aceitem IPs publicos nas respostas de autenticação
sed -i "s|site_url = .*|site_url = \"http://$DOMAIN_IP\"|g" supabase/config.toml
sed -i "s|additional_redirect_urls = \[.*\].*|additional_redirect_urls = [\"http://$DOMAIN_IP\", \"https://$DOMAIN_IP\"]|g" supabase/config.toml

# Start Supabase Platform (Banco, Auth, Storage e Functions)
npx supabase start

echo ""
echo "[3/4] Extraindo Chaves de Segurança..."
STATUS_JSON=$(npx supabase status -o json)
API_URL=$(echo $STATUS_JSON | jq -r .API_URL)
ANON_KEY=$(echo $STATUS_JSON | jq -r .ANON_KEY)

echo "VITE_SUPABASE_URL=http://$DOMAIN_IP" > .env
echo "VITE_SUPABASE_PUBLISHABLE_KEY=$ANON_KEY" >> .env
echo "VITE_UPDATE_AGENT_URL=http://$DOMAIN_IP/update-agent" >> .env

echo ""
echo "[4/4] Compilando Web e Aplicando Proxy Front-End Nginx..."
# Atualiza Docker Compose para expor a porta 80 nativa do Servidor
sed -i 's/- "8080:80"/- "80:80"/g' docker-compose.yml

docker compose up --build -d

echo "=========================================================="
echo "🚀 INSTALAÇÃO FINALIZADA COM SUCESSO!"
echo "📍 Acesse seu Dashboard em: http://$DOMAIN_IP"
echo "=========================================================="
