# Brasil Play King — Discord Bot

Bot inicial do BPK para rodar no Render e preparar a ponte com a GM SA-MP.

## Comandos
- `/ping` — testa o bot
- `/id` — mostra o Discord User ID
- `/vincular nick:SEU_NICK` — vincula Discord + Nick SA-MP
- `/minha-vinculacao` — mostra a vinculação
- `/desvincular` — remove a vinculação

## Render
Build Command: `npm install`
Start Command: `npm start`

Variáveis de ambiente:
- `DISCORD_TOKEN`
- `GUILD_ID`
- `API_SECRET`
- `PORT` (o Render pode fornecer automaticamente)

## Segurança
NUNCA coloque o token no GitHub. Ele deve ficar somente nas Environment Variables do Render.

O bot não armazena a senha da conta SA-MP.

## API da futura ponte com a GM
- GET `/health`
- POST `/api/link`
- POST `/api/unlink`
- GET `/api/link/:nick`

As rotas `/api/*` usam:
`Authorization: Bearer SUA_API_SECRET`

## Persistência
O arquivo JSON é para teste inicial. O filesystem de um serviço gratuito do Render pode ser efêmero; para produção, troque o armazenamento por banco persistente.
