const express = require("express");
const {
  Client,
  GatewayIntentBits,
  Events,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.DISCORD_TOKEN;
const API_SECRET = process.env.API_SECRET;
const GUILD_ID = process.env.GUILD_ID;
const ROLE_NAME = "Membro";

if (!TOKEN || !API_SECRET || !GUILD_ID) {
  console.error("Faltam variaveis: DISCORD_TOKEN, API_SECRET ou GUILD_ID.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

function authorized(req) {
  const auth = req.headers.authorization || "";
  const bodySecret = String(req.body.secret || "").trim();
  const querySecret = String(req.query.secret || "").trim();
  return auth === `Bearer ${API_SECRET}` || bodySecret === API_SECRET || querySecret === API_SECRET;
}

async function getGuild() {
  return await client.guilds.fetch(GUILD_ID);
}

async function getMemberRole(guild) {
  return guild.roles.cache.find(
    role => role.name.toLowerCase() === ROLE_NAME.toLowerCase()
  );
}

/*
  ROTA PRINCIPAL:
  A GM chama esta rota depois de confirmar que a conta pode ser vinculada.

  POST /vincular
  Header:
    Authorization: Bearer SUA_API_SECRET

  JSON:
    {
      "discordId": "ID_DO_USUARIO"
    }

  O bot apenas aplica o cargo Membro.
  A GM continua responsável por impedir uma conta de ser vinculada mais de uma vez.
  Assim, o bot não perde vínculos quando o Render reinicia.
*/
app.post("/vincular", async (req, res) => {
  try {
    if (!authorized(req)) {
      return res.status(401).json({
        ok: false,
        error: "Nao autorizado."
      });
    }

    const discordId = String(req.body.discordId || "").trim();

    if (!/^\d{17,20}$/.test(discordId)) {
      return res.status(400).json({
        ok: false,
        error: "discordId invalido."
      });
    }

    const guild = await getGuild();
    const member = await guild.members.fetch(discordId);
    const role = await getMemberRole(guild);

    if (!role) {
      return res.status(404).json({
        ok: false,
        error: 'Crie no Discord o cargo "Membro".'
      });
    }

    if (!guild.members.me) {
      await guild.members.fetchMe();
    }

    if (role.position >= guild.members.me.roles.highest.position) {
      return res.status(409).json({
        ok: false,
        error: 'O cargo "Membro" precisa ficar abaixo do cargo do bot.'
      });
    }

    if (!member.roles.cache.has(role.id)) {
      await member.roles.add(role, "Vinculacao de conta SA-MP");
    }

    return res.status(200).send("OK");
  } catch (error) {
    console.error("VINCULAR:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Erro ao aplicar o cargo."
    });
  }
});

/*
  ROTA DE CONSULTA:
  Permite que a GM confirme se o usuario possui o cargo Membro.
*/
app.get("/status/:discordId", async (req, res) => {
  try {
    if (!authorized(req)) {
      return res.status(401).json({
        ok: false,
        error: "Nao autorizado."
      });
    }

    const discordId = String(req.params.discordId);
    const guild = await getGuild();
    const member = await guild.members.fetch(discordId);
    const role = await getMemberRole(guild);

    if (!role) {
      return res.status(404).json({
        ok: false,
        error: 'Cargo "Membro" nao encontrado.'
      });
    }

    return res.json({
      ok: true,
      discordId,
      linked: member.roles.cache.has(role.id),
      roleId: role.id
    });
  } catch (error) {
    console.error("STATUS:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Erro ao consultar."
    });
  }
});

/*
  ROTA ADMINISTRATIVA:
  Remove o cargo Membro.
  Nao existe comando de jogador para recuperar ou desvincular conta.
*/
app.post("/remover-membro", async (req, res) => {
  try {
    if (!authorized(req)) {
      return res.status(401).json({
        ok: false,
        error: "Nao autorizado."
      });
    }

    const discordId = String(req.body.discordId || "").trim();
    const guild = await getGuild();
    const member = await guild.members.fetch(discordId);
    const role = await getMemberRole(guild);

    if (!role) {
      return res.status(404).json({
        ok: false,
        error: 'Cargo "Membro" nao encontrado.'
      });
    }

    if (member.roles.cache.has(role.id)) {
      await member.roles.remove(role, "Acao administrativa");
    }

    return res.json({
      ok: true,
      message: "Cargo Membro removido.",
      discordId
    });
  } catch (error) {
    console.error("REMOVER:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Erro ao remover cargo."
    });
  }
});

app.get("/", (req, res) => {
  res.send("Brasil Play King - Bot online.");
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    bot: client.user ? client.user.tag : null
  });
});

const commands = [
  new SlashCommandBuilder()
    .setName("vincular")
    .setDescription("Mostra como vincular sua conta SA-MP ao Discord.")
].map(c => c.toJSON());

client.once(Events.ClientReady, async bot => {
  console.log(`Bot online: ${bot.user.tag}`);

  try {
    const rest = new REST({ version: "10" }).setToken(TOKEN);

    await rest.put(
      Routes.applicationGuildCommands(bot.user.id, GUILD_ID),
      { body: commands }
    );

    console.log("Comando /vincular registrado.");
  } catch (error) {
    console.error("ERRO AO REGISTRAR COMANDO:", error);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "vincular") {
    await interaction.reply({
      content:
        "Para vincular sua conta, use o sistema de vinculacao dentro do SA-MP.\n\n" +
        "Depois que a vinculacao for confirmada, o cargo **Membro** sera aplicado automaticamente.\n" +
        "Recuperacao de conta: somente pela administracao no ticket.",
      ephemeral: true
    });
  }
});

client.on(Events.Error, error => {
  console.error("DISCORD:", error);
});

app.listen(PORT, () => {
  console.log(`API ativa na porta ${PORT}`);
});

client.login(TOKEN);
