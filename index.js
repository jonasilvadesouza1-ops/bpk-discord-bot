const express = require("express");
const {
  Client,
  GatewayIntentBits,
  Partials,
  Events
} = require("discord.js");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.DISCORD_TOKEN;
const MEMBER_ROLE_NAME = "Membro";

if (!TOKEN) {
  console.error("ERRO: configure DISCORD_TOKEN nas Environment Variables do Render.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.GuildMember]
});

app.get("/", (req, res) => {
  res.send("Brasil Play King - Bot online.");
});

app.get("/health", (req, res) => {
  res.json({ ok: true, bot: client.user?.tag || null });
});

/*
  Endpoint reservado para a integração com a GM.
  A GM deverá enviar o Discord ID do jogador depois do vínculo.
  Exemplo:
  POST /vincular
  {
    "guildId": "ID_DO_SERVIDOR",
    "discordId": "ID_DO_USUARIO"
  }

  O bot então coloca o cargo "Membro".
*/
app.post("/vincular", async (req, res) => {
  try {
    const { guildId, discordId } = req.body;

    if (!guildId || !discordId) {
      return res.status(400).json({
        ok: false,
        error: "guildId e discordId são obrigatórios."
      });
    }

    const guild = await client.guilds.fetch(guildId);
    const member = await guild.members.fetch(discordId);
    const role = guild.roles.cache.find(
      r => r.name.toLowerCase() === MEMBER_ROLE_NAME.toLowerCase()
    );

    if (!role) {
      return res.status(404).json({
        ok: false,
        error: `Cargo "${MEMBER_ROLE_NAME}" não encontrado.`
      });
    }

    if (!member.roles.cache.has(role.id)) {
      await member.roles.add(role, "Conta SA-MP vinculada");
    }

    return res.json({
      ok: true,
      message: `Cargo ${MEMBER_ROLE_NAME} aplicado.`,
      discordId,
      roleId: role.id
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      ok: false,
      error: "Não foi possível aplicar o cargo."
    });
  }
});

client.once(Events.ClientReady, c => {
  console.log(`Bot conectado como ${c.user.tag}`);
  console.log(`Cargo configurado: ${MEMBER_ROLE_NAME}`);
});

client.on(Events.Error, console.error);

app.listen(PORT, () => {
  console.log(`Servidor web ativo na porta ${PORT}`);
});

client.login(TOKEN);
