require("dotenv").config();

const fs = require("fs");
const path = require("path");
const express = require("express");
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const PORT = Number(process.env.PORT || 10000);
const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const API_SECRET = process.env.API_SECRET;

if (!TOKEN) {
  console.error("ERRO: DISCORD_TOKEN não configurado.");
  process.exit(1);
}
if (!API_SECRET) {
  console.error("ERRO: API_SECRET não configurado.");
  process.exit(1);
}

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "links.json");
fs.mkdirSync(DATA_DIR, { recursive: true });

function loadLinks() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    return Array.isArray(data.links) ? data.links : [];
  } catch (e) {
    console.error("Erro lendo links.json:", e);
    return [];
  }
}

function saveLinks(links) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ links }, null, 2), "utf8");
}

let links = loadLinks();

function key(nick) {
  return String(nick || "").trim().toLowerCase();
}

function validNick(nick) {
  return /^[A-Za-z0-9_]{3,24}$/.test(String(nick || ""));
}

function byNick(nick) {
  return links.find(x => x.nickKey === key(nick));
}

function byDiscord(id) {
  return links.find(x => x.discordId === id);
}

function linkNick(nick, discordId, username) {
  const nickKey = key(nick);
  const sameNick = byNick(nick);
  const sameDiscord = byDiscord(discordId);

  if (sameNick && sameNick.discordId !== discordId)
    return { ok:false, error:"Esse Nick SA-MP já está vinculado a outro Discord." };

  if (sameDiscord && sameDiscord.nickKey !== nickKey)
    return { ok:false, error:"Esse Discord já está vinculado a outro Nick SA-MP." };

  const record = {
    nick: String(nick).trim(),
    nickKey,
    discordId,
    discordUsername: username || "",
    linkedAt: new Date().toISOString()
  };

  links = links.filter(x => x.nickKey !== nickKey && x.discordId !== discordId);
  links.push(record);
  saveLinks(links);
  return { ok:true, record };
}

function unlinkNick(nick) {
  const before = links.length;
  links = links.filter(x => x.nickKey !== key(nick));
  if (links.length !== before) saveLinks(links);
  return before !== links.length;
}

function auth(req, res, next) {
  if (req.headers.authorization !== `Bearer ${API_SECRET}`)
    return res.status(401).json({ok:false,error:"Não autorizado."});
  next();
}

const app = express();
app.use(express.json({limit:"32kb"}));

app.get("/", (_req,res) => res.send("Brasil Play King Discord Bot online."));
app.get("/health", (_req,res) => res.json({
  ok:true, botReady:client.isReady(), time:new Date().toISOString()
}));

app.post("/api/link", auth, (req,res) => {
  const {nick, discordId, discordUsername} = req.body || {};
  if (!validNick(nick))
    return res.status(400).json({ok:false,error:"Nick SA-MP inválido."});
  if (!/^\d{17,20}$/.test(String(discordId || "")))
    return res.status(400).json({ok:false,error:"Discord User ID inválido."});

  const result = linkNick(nick, String(discordId), discordUsername);
  if (!result.ok)
    return res.status(409).json(result);

  return res.status(200).json({
    ok: true,
    nick: result.record.nick,
    discordId: result.record.discordId,
    discordUsername: result.record.discordUsername
  });
});

app.post("/api/unlink", auth, (req,res) => {
  const {nick} = req.body || {};
  if (!validNick(nick))
    return res.status(400).json({ok:false,error:"Nick inválido."});
  return res.json({ok:true,removed:unlinkNick(nick)});
});

app.get("/api/link/:nick", auth, (req,res) => {
  const record = byNick(req.params.nick);
  if (!record)
    return res.status(404).json({ok:false,error:"Vinculação não encontrada."});
  return res.json({ok:true,...record});
});

const client = new Client({
  intents:[GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const commands = [
  new SlashCommandBuilder().setName("ping").setDescription("Verifica se o bot está online."),
  new SlashCommandBuilder().setName("id").setDescription("Mostra seu Discord User ID."),
  new SlashCommandBuilder()
    .setName("vincular").setDescription("Vincula seu Discord a um Nick SA-MP.")
    .addStringOption(o => o.setName("nick").setDescription("Seu Nick SA-MP.").setRequired(true)),
  new SlashCommandBuilder().setName("minha-vinculacao").setDescription("Mostra sua vinculação."),
  new SlashCommandBuilder().setName("desvincular").setDescription("Remove sua vinculação.")
].map(x => x.toJSON());

async function registerCommands() {
  const rest = new REST({version:"10"}).setToken(TOKEN);
  if (GUILD_ID) {
    await rest.put(Routes.applicationGuildCommands(client.user.id, GUILD_ID), {body:commands});
    console.log("Comandos registrados no servidor BPK.");
  } else {
    await rest.put(Routes.applicationCommands(client.user.id), {body:commands});
    console.log("Comandos globais registrados.");
  }
}

client.once("ready", async () => {
  console.log(`Bot conectado como ${client.user.tag}`);
  try { await registerCommands(); }
  catch(e) { console.error("Erro registrando comandos:", e); }
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  try {
    if (interaction.commandName === "ping")
      return interaction.reply({content:"🏓 BPK Bot está online!",ephemeral:true});

    if (interaction.commandName === "id")
      return interaction.reply({
        content:`Seu Discord User ID é: \`${interaction.user.id}\``,
        ephemeral:true
      });

    if (interaction.commandName === "vincular") {
      const nick = interaction.options.getString("nick", true).trim();
      if (!validNick(nick))
        return interaction.reply({
          content:"❌ Nick inválido. Use letras, números e `_`.",
          ephemeral:true
        });

      const result = linkNick(nick, interaction.user.id, interaction.user.tag);
      if (!result.ok)
        return interaction.reply({content:`❌ ${result.error}`,ephemeral:true});

      return interaction.reply({
        content:`✅ Vinculado!\nNick: \`${result.record.nick}\`\nDiscord ID: \`${result.record.discordId}\`\n\n⚠️ O bot não armazena sua senha SA-MP.`,
        ephemeral:true
      });
    }

    if (interaction.commandName === "minha-vinculacao") {
      const record = byDiscord(interaction.user.id);
      if (!record)
        return interaction.reply({content:"ℹ️ Você não possui vinculação.",ephemeral:true});
      return interaction.reply({
        content:`🔗 Nick vinculado: \`${record.nick}\`\nDiscord ID: \`${record.discordId}\``,
        ephemeral:true
      });
    }

    if (interaction.commandName === "desvincular") {
      const record = byDiscord(interaction.user.id);
      if (!record)
        return interaction.reply({content:"ℹ️ Você não possui vinculação.",ephemeral:true});
      unlinkNick(record.nick);
      return interaction.reply({
        content:`✅ Vinculação de \`${record.nick}\` removida.`,
        ephemeral:true
      });
    }
  } catch(e) {
    console.error(e);
    if (interaction.replied)
      await interaction.followUp({content:"❌ Erro interno.",ephemeral:true});
    else
      await interaction.reply({content:"❌ Erro interno.",ephemeral:true});
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API ouvindo na porta ${PORT}`);
});

client.login(TOKEN);
