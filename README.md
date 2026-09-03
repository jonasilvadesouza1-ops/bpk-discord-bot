# Brasil Play King - Bot Discord

Bot do BPK para GitHub + Render.

## Variáveis no Render

DISCORD_TOKEN = token do bot
API_SECRET = senha secreta criada por você
GUILD_ID = ID do servidor Discord

## Discord

Crie o cargo exatamente:

Membro

O bot precisa ter:
- Ver canais
- Enviar mensagens
- Gerenciar cargos

O cargo `Membro` precisa estar ABAIXO do cargo do bot na hierarquia.

No Developer Portal, ative:
- Server Members Intent

## Fluxo final

A GM confirma o vínculo e chama:

POST /vincular

Authorization:
Bearer SUA_API_SECRET

JSON:
{
  "nick": "NickDoJogador",
  "discordId": "123456789012345678"
}

O bot:
1. verifica se a conta já está vinculada;
2. verifica se o Discord já pertence a outra conta;
3. aplica o cargo Membro;
4. registra o vínculo.

A recuperação de conta não é feita por este bot: deve ser tratada pela administração no ticket.

IMPORTANTE:
Este bot mantém os vínculos em memória. A GM continua sendo a fonte oficial. Para o vínculo sobreviver a reinícios do Render, a GM/API precisa reenviar os vínculos existentes ou devemos adicionar um banco persistente na próxima integração. Não coloque o token do bot no GitHub.
