const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const cron = require("node-cron");
const { translate } = require("@vitalets/google-translate-api");
require("dotenv").config();
const fs = require("fs");

// Telegram Token
const token = process.env.TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Foydalanuvchilarni saqlash uchun fayl
const usersFile = "users.json";

// Foydalanuvchilarni yuklash yoki yangi fayl yaratish
let users = [];
if (fs.existsSync(usersFile)) {
  users = JSON.parse(fs.readFileSync(usersFile));
}

// Foydalanuvchi qo'shish funksiyasi
const addUser = (chatId) => {
  if (!users.includes(chatId)) {
    users.push(chatId);
    fs.writeFileSync(usersFile, JSON.stringify(users));
  }
};

// Start komandasi
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  addUser(chatId);

  // Agar foydalanuvchi ro'yxatda bo'lmasa, qo'shish
  if (!users.includes(chatId)) {
    users.push(chatId);
    const imageUrl = await getRandomImage();
    const fact = await getRandomFact();

    bot.sendPhoto(chatId, imageUrl, {
      caption: `🔍 **Bugungi Fakt:**\n\n${fact}`,
      parse_mode: "Markdown",
    });

    bot.sendMessage(
      chatId,
      "Salom! Sizga har kuni soat 07:00 da qiziqarli faktlar va ma'lumotlar yuborib turamiz.",
    );
  } else {
    bot.sendMessage(
      chatId,
      "Siz ro'yxatdasiz, har kuni soat 07:00 da yangi faktlar olasiz.",
    );
  }
});

// /stop komandasi
bot.onText(/\/stop/, (msg) => {
  const chatId = msg.chat.id;

  // Foydalanuvchini ro'yxatdan olib tashlash
  users = users.filter((id) => id !== chatId);
  fs.writeFileSync(usersFile, JSON.stringify(users));
  bot.sendMessage(chatId, "Eslatmalarni to'xtatdingiz.");
});

let factEn = "";

// Tasodifiy fakt olish funksiyasi
async function getRandomFact() {
  try {
    const response = await axios.get(
      "https://uselessfacts.jsph.pl/random.json?language=en",
    );

    factEn = response.data.text;

    return await translateText(response.data.text);
  } catch (error) {
    console.error("Fakt olishda xatolik:", error);
    return "Hozircha fakt olishda muammo yuz berdi.";
  }
}

async function translateText(text) {
  const response = await translate(text, { from: "en", to: "uz" });
  return response.text;
}

// Unsplash yoki boshqa API orqali tasodifiy rasmni olish
async function getRandomImage() {
  const response = await axios.get("https://api.unsplash.com/photos/random", {
    params: {
      client_id: process.env.UNSPLASH_API_KEY, // Unsplash API kalitingizni kiriting
      query: "relax", // Bu yerda faktga mos kategoriya qo'yishingiz mumkin
    },
  });
  return response.data.urls.regular; // Rasmning URL'ini qaytarish
}

// Har kuni tasodifiy faktni olish va yuborish
cron.schedule(
  "*/10 * * * * *",
  async () => {
    console.log("Har kuni fakt yuborish boshlanmoqda...");

    const fact = await getRandomFact();
    const imageUrl = await getRandomImage();

    users.forEach((chatId) => {
      bot.sendPhoto(chatId, imageUrl, {
        caption: `🔍 **Bugungi Fakt:**\n\n**🇺🇿Uz:**\n${fact}\n\n**🇬🇧Eng:**\n${factEn}\n\n🤖@factkunuz_bot`,
        parse_mode: "Markdown",
      });
      // bot.sendMessage(chatId, `🔍 **Bugungi Fakt:**\n\n${fact}`, {
      //   parse_mode: "Markdown",
      // });
    });
  },
  {
    timezone: "Asia/Tashkent", // O'zingizning vaqt zonangizga moslang
  },
);

async function downloadImage(url, dest) {
  await download.image({ url, dest });
}

async function sendImage(chatId, url, fact) {
  const imagePath = "./image.jpg";
  await downloadImage(url, imagePath);
  bot.sendPhoto(chatId, imagePath, { caption: fact });
}

// Tasodifiy Wikipedia maqolasini olish
bot.onText(/\/wiki/, async (msg) => {
  const chatId = msg.chat.id;
  const url =
    "https://en.wikipedia.org/w/api.php?action=query&list=random&rnlimit=1&format=json";

  try {
    const response = await axios.get(url);
    const articleTitle = response.data.query.random[0].title;
    bot.sendMessage(chatId, `Tasodifiy Wikipedia maqola: ${articleTitle}`);
  } catch (error) {
    bot.sendMessage(chatId, "Maqola olishda xatolik yuz berdi.");
  }
});
