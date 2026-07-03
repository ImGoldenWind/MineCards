import crypto from "node:crypto";
import { query, transaction } from "./db.mjs";

const COOLDOWN_SECONDS = 6 * 60 * 60;
const ADMIN_TELEGRAM_ID = Number(process.env.ADMIN_TELEGRAM_ID ?? 0);
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const TELEGRAM_AUTH_MAX_AGE_SECONDS = Number(process.env.TELEGRAM_AUTH_MAX_AGE_SECONDS ?? 604800);
const MAX_ADMIN_REWARD_COUNT = Number(process.env.MAX_ADMIN_REWARD_COUNT ?? 1000);
const CRON_SECRET = process.env.CRON_SECRET ?? "";

function jsonError(res, status, message) {
  res.status(status).json({ error: message });
}

function intValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : 0;
}

function positiveInt(value) {
  const number = intValue(value);
  return number > 0 ? number : 0;
}

function makeHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function verifyTelegramInitData(initData) {
  if (!TELEGRAM_BOT_TOKEN) {
    throw makeHttpError(503, "TELEGRAM_BOT_TOKEN is required for Telegram auth");
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");

  if (!hash) {
    throw makeHttpError(401, "Telegram auth hash is missing");
  }

  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = crypto.createHmac("sha256", "WebAppData").update(TELEGRAM_BOT_TOKEN).digest();
  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  const expected = Buffer.from(hash, "hex");
  const actual = Buffer.from(calculatedHash, "hex");

  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    throw makeHttpError(401, "Telegram auth is invalid");
  }

  const authDate = Number(params.get("auth_date") ?? 0);

  if (!Number.isFinite(authDate) || authDate <= 0) {
    throw makeHttpError(401, "Telegram auth date is missing");
  }

  if (TELEGRAM_AUTH_MAX_AGE_SECONDS > 0 && Date.now() / 1000 - authDate > TELEGRAM_AUTH_MAX_AGE_SECONDS) {
    throw makeHttpError(401, "Telegram auth is expired");
  }

  const userRaw = params.get("user");

  if (!userRaw) {
    throw makeHttpError(401, "Telegram user is missing");
  }

  let user;

  try {
    user = JSON.parse(userRaw);
  } catch {
    throw makeHttpError(401, "Telegram user payload is invalid");
  }

  if (!positiveInt(user.id)) {
    throw makeHttpError(401, "Telegram user id is invalid");
  }

  return user;
}

function getTelegramUser(req) {
  const initData = req.get("x-telegram-init-data");

  if (!initData) return null;

  return verifyTelegramInitData(initData);
}

function requireTelegramUser(req) {
  const telegramUser = getTelegramUser(req);

  if (!telegramUser) {
    throw makeHttpError(401, "Telegram Mini App auth is required");
  }

  return telegramUser;
}

function requireTelegramAdmin(req) {
  if (!positiveInt(ADMIN_TELEGRAM_ID)) {
    throw makeHttpError(503, "ADMIN_TELEGRAM_ID is not configured");
  }

  const telegramUser = requireTelegramUser(req);

  if (Number(telegramUser.id) !== ADMIN_TELEGRAM_ID) {
    throw makeHttpError(403, "Admin access denied");
  }

  return telegramUser;
}

async function findUserByTelegramId(telegramId) {
  const users = await query("SELECT * FROM users WHERE telegram_id = ?", [telegramId]);
  return users[0] ?? null;
}

async function sendReadyNotification(telegramId, firstName) {
  if (!TELEGRAM_BOT_TOKEN) {
    return { skipped: true, reason: "TELEGRAM_BOT_TOKEN is not configured" };
  }

  const text = `🔥 Привет, ${firstName ?? ""}! Твоя карточка уже доступна для сбора в мини-игре!`;
  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: telegramId,
      text,
      disable_notification: false,
    }),
  });

  return response.json();
}

function handleApiError(res, error, fallbackStatus = 500) {
  const status = error?.status ?? fallbackStatus;
  const message = status >= 500 ? "SERVER_ERROR" : error.message;

  if (status >= 500) {
    console.error(error);
  }

  jsonError(res, status, message);
}

function requireCronSecret(req) {
  if (!CRON_SECRET) {
    throw makeHttpError(503, "CRON_SECRET is not configured");
  }

  const auth = req.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const providedSecret = bearer || req.get("x-cron-secret") || "";
  const expected = Buffer.from(CRON_SECRET);
  const actual = Buffer.from(providedSecret);

  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    throw makeHttpError(401, "Cron access denied");
  }
}

function pickWeightedCard(cards) {
  const weightedCards = cards
    .map((card) => ({
      card,
      weight: Math.max(0, Math.round(Number(card.drop_rate ?? 0) * 1_000_000)),
    }))
    .filter(({ weight }) => weight > 0);
  const totalWeight = weightedCards.reduce((sum, { weight }) => sum + weight, 0);

  if (!totalWeight) {
    throw makeHttpError(500, "Card drop rates are not configured");
  }

  const roll = crypto.randomInt(totalWeight);
  let accumulator = 0;

  for (const { card, weight } of weightedCards) {
    accumulator += weight;

    if (roll < accumulator) {
      return card;
    }
  }

  return weightedCards[weightedCards.length - 1].card;
}

export function registerGameApi(app) {
  app.post("/api/entry.php", async (req, res) => {
    let telegramUser;

    try {
      telegramUser = requireTelegramUser(req);
    } catch (error) {
      handleApiError(res, error, 401);
      return;
    }

    const telegram_id = telegramUser.id;
    const username = telegramUser.username;
    const first_name = telegramUser.first_name;
    const last_name = telegramUser.last_name;

    try {
      const result = await transaction(async (connection) => {
        const [existingUsers] = await connection.execute(
          "SELECT id, spins_balance FROM users WHERE telegram_id = ?",
          [telegram_id],
        );
        let user = existingUsers[0];

        if (!user) {
          const [insertResult] = await connection.execute(
            "INSERT INTO users (telegram_id, username, first_name, last_name) VALUES (?, ?, ?, ?)",
            [telegram_id, username ?? null, first_name ?? null, last_name ?? null],
          );
          user = { id: insertResult.insertId, spins_balance: 0 };
        }

        const [cooldowns] = await connection.execute(
          "SELECT last_claim_at FROM claim_cooldowns WHERE user_id = ?",
          [user.id],
        );
        const lastClaimAt = cooldowns[0]?.last_claim_at;
        const nextClaimAt = lastClaimAt
          ? new Date(new Date(lastClaimAt).getTime() + COOLDOWN_SECONDS * 1000)
          : new Date();

        return {
          next_claim_at: nextClaimAt.toISOString(),
          spins_balance: user.spins_balance,
        };
      });

      res.json(result);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post("/api/claim.php", async (req, res) => {
    let telegramUser;

    try {
      telegramUser = requireTelegramUser(req);
    } catch (error) {
      handleApiError(res, error, 401);
      return;
    }

    const { type = "free" } = req.body ?? {};
    const telegram_id = telegramUser.id;

    if (type !== "free" && type !== "paid") {
      jsonError(res, 400, "Некорректный тип крутки");
      return;
    }

    try {
      const result = await transaction(async (connection) => {
        const [users] = await connection.execute("SELECT * FROM users WHERE telegram_id = ? FOR UPDATE", [
          telegram_id,
        ]);
        const user = users[0];

        if (!user) {
          const error = new Error("Пользователь не найден");
          error.status = 404;
          throw error;
        }

        if (type === "free") {
          const [cooldowns] = await connection.execute(
            "SELECT * FROM claim_cooldowns WHERE user_id = ?",
            [user.id],
          );
          const lastClaimAt = cooldowns[0]?.last_claim_at
            ? new Date(cooldowns[0].last_claim_at)
            : new Date("1970-01-01T00:00:00.000Z");
          const nextClaimAt = new Date(lastClaimAt.getTime() + COOLDOWN_SECONDS * 1000);

          if (Date.now() < nextClaimAt.getTime()) {
            const error = new Error("Кулдаун не истёк");
            error.status = 429;
            throw error;
          }
        }

        if (type === "paid" && user.spins_balance <= 0) {
          const error = new Error("Недостаточно донатных круток");
          error.status = 400;
          throw error;
        }

        const [cards] = await connection.execute("SELECT * FROM cards");
        if (!cards.length) {
          const error = new Error("Нет доступных карточек");
          error.status = 500;
          throw error;
        }

        const selected = pickWeightedCard(cards);

        await connection.execute("INSERT INTO user_cards (user_id, card_id) VALUES (?, ?)", [
          user.id,
          selected.id,
        ]);

        if (type === "paid") {
          await connection.execute(
            "UPDATE users SET spins_balance = spins_balance - 1 WHERE id = ?",
            [user.id],
          );
        } else {
          await connection.execute(
            `INSERT INTO claim_cooldowns (user_id, last_claim_at)
             VALUES (?, NOW())
             ON DUPLICATE KEY UPDATE last_claim_at = NOW()`,
            [user.id],
          );
        }

        return {
          card: {
            id: selected.id,
            name: selected.name,
            rarity: selected.rarity,
            image_url: selected.image_url,
          },
        };
      });

      res.json(result);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.get("/api/get_user_cards.php", async (req, res) => {
    let telegramUser;

    try {
      telegramUser = requireTelegramUser(req);
    } catch (error) {
      handleApiError(res, error, 401);
      return;
    }

    const telegramId = telegramUser.id;

    try {
      const users = await query("SELECT id FROM users WHERE telegram_id = ?", [telegramId]);
      const user = users[0];

      if (!user) {
        res.json([]);
        return;
      }

      const cards = await query(
        `SELECT
           c.id,
           c.name,
           c.image_url,
           c.rarity,
           COUNT(*) AS count
         FROM user_cards uc
         JOIN cards c ON c.id = uc.card_id
         WHERE uc.user_id = ?
         GROUP BY c.id, c.name, c.image_url, c.rarity
         ORDER BY
           CASE c.rarity
             WHEN 'Legendary' THEN 1
             WHEN 'Epic' THEN 2
             WHEN 'Rare' THEN 3
             ELSE 4
           END`,
        [user.id],
      );

      res.json(cards);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post("/api/admin.php", async (req, res) => {
    try {
      requireTelegramAdmin(req);
    } catch (error) {
      res.status(error.status ?? 401).send(error.message);
      return;
    }

    const count = intValue(req.body?.count);

    if (count <= 0 || count > MAX_ADMIN_REWARD_COUNT) {
      res.status(400).send("Неверное количество круток");
      return;
    }

    try {
      if (req.body?.mass === "give_all") {
        await query("UPDATE users SET spins_balance = spins_balance + ?", [count]);
        res.send(`Выдано ${count} круток всем игрокам`);
        return;
      }

      const telegramId = positiveInt(req.body?.telegram_id);

      if (!telegramId) {
        res.status(400).send("Missing parameters");
        return;
      }

      await query("UPDATE users SET spins_balance = spins_balance + ? WHERE telegram_id = ?", [
        count,
        telegramId,
      ]);
      res.send(`Выдано ${count} круток пользователю ${telegramId}`);
    } catch (error) {
      console.error(error);
      res.status(500).send("SERVER_ERROR");
    }
  });

  app.get("/api/admin.php", (_req, res) => {
    res.status(405).send("Use POST for admin mutations");
  });

  app.get("/api/get_trades.php", async (req, res) => {
    let telegramUser;

    try {
      telegramUser = requireTelegramUser(req);
    } catch (error) {
      handleApiError(res, error, 401);
      return;
    }

    try {
      const user = await findUserByTelegramId(telegramUser.id);
      const userId = user?.id ?? 0;

      const trades = await query(
        `SELECT t.id, t.from_user_id, u.username, c.name, c.image_url, c.rarity, t.status
         FROM trades t
         JOIN trade_items ti ON ti.trade_id = t.id AND ti.from_user = 1
         JOIN user_cards uc ON ti.user_card_id = uc.id
         JOIN cards c ON uc.card_id = c.id
         JOIN users u ON t.from_user_id = u.id
         WHERE t.status = 'pending'
         ORDER BY t.from_user_id = ? DESC, t.created_at DESC`,
        [userId],
      );

      res.json(trades);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post("/api/create_trade.php", async (req, res) => {
    let telegramUser;

    try {
      telegramUser = requireTelegramUser(req);
    } catch (error) {
      handleApiError(res, error, 401);
      return;
    }

    const userCardId = positiveInt(req.body?.user_card_id);

    if (!userCardId) {
      jsonError(res, 400, "Недостаточно данных");
      return;
    }

    try {
      const result = await transaction(async (connection) => {
        const [users] = await connection.execute("SELECT id FROM users WHERE telegram_id = ?", [
          telegramUser.id,
        ]);
        const user = users[0];

        if (!user) {
          const error = new Error("Пользователь не найден");
          error.status = 404;
          throw error;
        }

        const [cards] = await connection.execute(
          "SELECT id FROM user_cards WHERE id = ? AND user_id = ? FOR UPDATE",
          [userCardId, user.id],
        );

        if (!cards.length) {
          const error = new Error("Карточка не найдена в коллекции пользователя");
          error.status = 403;
          throw error;
        }

        const [tradeResult] = await connection.execute(
          "INSERT INTO trades (from_user_id, status) VALUES (?, 'pending')",
          [user.id],
        );

        await connection.execute(
          "INSERT INTO trade_items (trade_id, user_card_id, from_user) VALUES (?, ?, 1)",
          [tradeResult.insertId, userCardId],
        );

        return { success: true, trade_id: tradeResult.insertId };
      });

      res.json(result);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post("/api/notify_ready.php", async (req, res) => {
    try {
      requireCronSecret(req);
    } catch (error) {
      res.status(error.status ?? 401).send(error.message);
      return;
    }

    try {
      const users = await query(
        `SELECT u.id, u.telegram_id, u.first_name, c.last_claim_at
         FROM users u
         JOIN claim_cooldowns c ON c.user_id = u.id
         LEFT JOIN notified_users n ON n.user_id = u.id
         WHERE UNIX_TIMESTAMP(c.last_claim_at) + ? <= UNIX_TIMESTAMP(NOW())
           AND n.user_id IS NULL`,
        [COOLDOWN_SECONDS],
      );

      for (const user of users) {
        await sendReadyNotification(user.telegram_id, user.first_name);
        await query("INSERT IGNORE INTO notified_users (user_id, notified_at) VALUES (?, NOW())", [
          user.id,
        ]);
      }

      await query(
        `DELETE n FROM notified_users n
         JOIN claim_cooldowns c ON c.user_id = n.user_id
         WHERE UNIX_TIMESTAMP(c.last_claim_at) + ? > UNIX_TIMESTAMP(NOW())`,
        [COOLDOWN_SECONDS],
      );

      res.send(`Notified: ${users.length} users.\n`);
    } catch (error) {
      console.error(error);
      res.status(500).send("SERVER_ERROR");
    }
  });
}
