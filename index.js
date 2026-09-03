const express = require("express");
const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.DISCORD_TOKEN;
const API_SECRET = process.env.API_SECRET;
const GUILD_ID = process.env.GUILD_ID;
const MEMBER_ROLE_NAME = "Membro";

if (!TOKEN) {
  console.error("ERRO: DISCORD_TOKEN nao configurado.");
  process.exit(1);
}
if (!API_SECRET) {
  console.error("ERRO: API_SECRET nao configurado.");
  process.exit(1);
}
if (!GUILD_ID) {
  console.error("ERRO: GUILD_ID nao configurado.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.GuildMember]
});

// Vínculos mantidos em memória para o bot.
// A GM continua sendo a fonte oficial do vínculo da conta.
const links = new Map(); // nick -> discordId
const reverseLinks = new Map(); // discordId -> nick

function authorized(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ")
    ? header.slice(7)
    : "";
  return token === API_SECRET;
}

function cleanNick(nick) {
  return String(nick || "").trim().toLowerCase();
}

async function getMemberRole(guild) {
  return guild.roles.cache.find(
    role => role.name.toLowerCase() === MEMBER_ROLE_NAME.toLowerCase()
  );
}

async function giveMemberRole(discordId) {
  const guild = await client.guilds.fetch(GUILD_ID);
  const member = await guild.members.fetch(discordId);
  const role = await getMemberRole(guild);

  if (!role) {
    throw new Error(`Cargo "${MEMBER_ROLE_NAME}" nao encontrado.`);
  }

  if (role.position >= guild.members.me.roles.highest.position) {
    throw new Error(`O cargo "${MEMBER_ROLE_NAME}" precisa ficar abaixo do cargo do bot.`);
  }

  if (!member.roles.cache.has(role.id)) {
    await member.roles.add(role, "Conta SA-MP vinculada");
  }

  return role.id;
}

async function removeMemberRole(discordId) {
  const guild = await client.guilds.fetch(GUILD_ID);
  const member = await guild.members.fetch(discordId);
  const role = await getMemberRole(guild);

  if (role && member.roles.cache.has(role.id)) {
    await member.roles.remove(role, "Desvinculacao administrativa");
  }
}

app.get("/", (req, res) => {
  res.send("Brasil Play King - Bot online.");
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    bot: client.user?.tag || null,
    guild: GUILD_ID
  });
});

// GM -> Bot: cria vínculo e dá o cargo Membro.
// Regras:
// - uma conta do jogo só pode ter um Discord;
// - um Discord só pode estar ligado a uma conta;
// - a GM deve ser a fonte oficial do vínculo.
app.post("/vincular", async (req, res) => {
  try {
    if (!authorized(req)) {
      return res.status(401).json({ ok: false, error: "Nao autorizado." });
    }

    const nick = cleanNick(req.body.nick);
    const discordId = String(req.body.discordId || "").trim();

    if (!nick || !discordId) {
      return res.status(400).json({
        ok: false,
        error: "nick e discordId sao obrigatorios."
      });
    }

    const oldDiscord = links.get(nick);
    const oldNick = reverseLinks.get(discordId);

    if (oldDiscord && oldDiscord !== discordId) {
      return res.status(409).json({
        ok: false,
        error: "Esta conta SA-MP ja possui um Discord vinculado."
      });
    }

    if (oldNick && oldNick !== nick) {
      return res.status(409).json({
        ok: false,
        error: "Este Discord ja esta vinculado a outra conta SA-MP."
      });
    }

    const roleId = await giveMemberRole(discordId);

    links.set(nick, discordId);
    reverseLinks.set(discordId, nick);

    return res.json({
      ok: true,
      message: "Vinculo criado e cargo Membro aplicado.",
      nick,
      discordId,
      roleId
    });
  } catch (err) {
    console.error("VINCULAR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Falha ao vincular."
    });
  }
});

app.get("/vincular/:nick", (req, res) => {
  if (!authorized(req)) {
    return res.status(401).json({ ok: false, error: "Nao autorizado." });
  }

  const nick = cleanNick(req.params.nick);
  const discordId = links.get(nick) || null;

  res.json({
    ok: true,
    linked: Boolean(discordId),
    nick,
    discordId
  });
});

app.post("/desvincular", async (req, res) => {
  try {
    if (!authorized(req)) {
      return res.status(401).json({ ok: false, error: "Nao autorizado." });
    }

    const nick = cleanNick(req.body.nick);

    if (!nick) {
      return res.status(400).json({ ok: false, error: "nick obrigatorio." });
    }

    const discordId = links.get(nick);

    if (!discordId) {
      return res.status(404).json({
        ok: false,
        error: "Essa conta nao possui vinculo neste bot."
      });
    }

    // Desvinculação é operação administrativa. Não é usada pelo jogador.
    await removeMemberRole(discordId);

    links.delete(nick);
    reverseLinks.delete(discordId);

    res.json({
      ok: true,
      message: "Vinculo removido e cargo Membro retirado.",
      nick,
      discordId
    });
  } catch (err) {
    console.error("DESVINCULAR:", err);
    res.status(500).json({
      ok: false,
      error: err.message || "Falha ao desvincular."
    });
  }
});

const commands = [
  new SlashCommandBuilder()
    .setName("vincular")
    .setDescription("Vincula seu Discord a uma conta SA-MP")
    .addStringOption(option =>
      option
        .setName("nick")
        .setDescription("Nick exato da sua conta no SA-MP")
        .setRequired(true)
    )
].map(command => command.toJSON());

client.once(Events.ClientReady, async c => {
  console.log(`Bot conectado como ${c.user.tag}`);

  try {
    const rest = new REST({ version: "10" }).setToken(TOKEN);
    await rest.put(
      Routes.applicationGuildCommands(c.user.id, GUILD_ID),
      { body: commands }
    );
    console.log("Comando /vincular registrado.");
  } catch (err) {
    console.error("ERRO AO REGISTRAR COMANDOS:", err);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "vincular") return;

  const nick = cleanNick(interaction.options.getString("nick"));

  if (links.has(nick)) {
    return interaction.reply({
      content: "Essa conta SA-MP ja possui um Discord vinculado.",
      ephemeral: true
    });
  }

  return interaction.reply({
    content:
      "Para concluir o vinculo, use o sistema de vinculacao dentro do SA-MP. " +
      "Depois que a GM confirmar o vinculo, o bot aplicara automaticamente o cargo `Membro`.",
    ephemeral: true
  });
});

client.on(Events.Error, console.error);

app.listen(PORT, () => {
  console.log(`API ativa na porta ${PORT}`);
});

client.login(TOKEN);
