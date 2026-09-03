# Brasil Play King - Bot Discord

Bot preparado para GitHub + Render.

## 1. Cargo

No Discord, crie um cargo chamado exatamente:

Membro

Dê ao bot permissão de **Gerenciar Cargos** e coloque o cargo do bot acima de `Membro` na hierarquia.

## 2. Discord Developer Portal

Ative:
- Server Members Intent

O token deve ficar somente nas Environment Variables do Render.

Nome da variável:

DISCORD_TOKEN

## 3. Render

Build Command:
npm install

Start Command:
npm start

Environment Variable:
DISCORD_TOKEN = TOKEN_DO_BOT

## 4. Integração

O endpoint `/vincular` recebe:

{
  "guildId": "ID_DO_SERVIDOR",
  "discordId": "ID_DO_USUARIO"
}

Depois de receber os dados, o bot procura o cargo `Membro` e aplica ao usuário.

IMPORTANTE:
O Render não enxerga automaticamente a pasta `Discords/` que fica no servidor SA-MP.
Por isso, a GM precisa enviar o vínculo para o bot por HTTP, ou então precisamos colocar uma ponte/API no servidor SA-MP.

Este projeto já deixa a parte do bot pronta; a próxima etapa é ligar o comando `/vinculardiscord` da GM ao endpoint `/vincular`.
