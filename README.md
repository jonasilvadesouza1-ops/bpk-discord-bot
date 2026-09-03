# BPK Discord Bot — FINAL

## Render
Environment Variables:

DISCORD_TOKEN = token do bot
API_SECRET = mesma chave que sera usada pela GM
GUILD_ID = ID do servidor Discord

Build Command:
npm install

Start Command:
npm start

## Discord
Crie o cargo exatamente:

Membro

O cargo Membro deve ficar ABAIXO do cargo do bot.

O bot precisa conseguir:
- Ver canais
- Enviar mensagens
- Gerenciar cargos

No Developer Portal, ative:
- Server Members Intent

## Funcionamento
1. A conta SA-MP solicita a vinculacao.
2. A GM confirma que aquela conta ainda nao possui vinculo.
3. A GM envia o Discord ID para POST /vincular.
4. O bot coloca o cargo Membro.
5. As permissoes dos canais sao dadas ao cargo Membro no Discord.
6. Recuperacao fica somente com a administracao pelo ticket.

IMPORTANTE:
Este bot nao guarda vinculos em memoria. Isso evita perder dados quando o Render reinicia.
A regra de "uma vinculacao por conta" precisa ficar persistente na GM/conta do jogador.

NAO coloque o token real no GitHub.
