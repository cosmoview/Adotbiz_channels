import { redis, kstYmd, isValidChannelId, setCors } from "./_lib.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") { res.status(204).end(); return; }

  if (req.method === "POST") return createChannel(req, res);
  if (req.method === "GET") return listChannels(req, res);
  res.status(405).send("method not allowed");
}

async function createChannel(req, res) {
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const id = String(body.label || "").trim().toLowerCase();
  const note = String(body.note || "").trim().slice(0, 100);
  const aosLink = String(body.aosLink || "").trim();
  const iosLink = String(body.iosLink || "").trim();

  if (!isValidChannelId(id)) {
    res.status(400).send("invalid channel id (소문자·숫자·_ 2~40자)");
    return;
  }
  if (!aosLink || !iosLink) {
    res.status(400).send("딥링크 누락");
    return;
  }

  // 기존 생성일은 유지 (갱신 시)
  let createdAt = Date.now();
  try {
    const existing = await redis.get(`ch:${id}`);
    if (existing && existing.createdAt) createdAt = existing.createdAt;
  } catch {}

  const meta = { id, note, aosLink, iosLink, createdAt };

  try {
    await redis.set(`ch:${id}`, meta);
    await redis.sadd("channels", id);
  } catch (e) {
    res.status(500).send("저장 실패: " + (e.message || "unknown"));
    return;
  }

  res.status(200).json({ ok: true, id });
}

async function listChannels(req, res) {
  let ids = [];
  try {
    ids = await redis.smembers("channels");
  } catch (e) {
    res.status(500).json({ error: "list failed" });
    return;
  }
  ids = ids || [];

  const today = kstYmd();
  let totalAll = 0;
  let todayAll = 0;
  const channels = [];

  for (const id of ids) {
    let meta = null;
    try { meta = await redis.get(`ch:${id}`); } catch {}
    let aos = 0, ios = 0, taos = 0, tios = 0;
    try {
      const [a, i, ta, ti] = await Promise.all([
        redis.get(`cnt:${id}:aos`),
        redis.get(`cnt:${id}:ios`),
        redis.get(`cnt:${id}:aos:${today}`),
        redis.get(`cnt:${id}:ios:${today}`),
      ]);
      aos = parseInt(a, 10) || 0;
      ios = parseInt(i, 10) || 0;
      taos = parseInt(ta, 10) || 0;
      tios = parseInt(ti, 10) || 0;
    } catch {}

    const total = aos + ios;
    totalAll += total;
    todayAll += (taos + tios);

    let createdLabel = "";
    if (meta && meta.createdAt) {
      const d = new Date(meta.createdAt + 9 * 3600000);
      createdLabel = `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
    }

    channels.push({
      id,
      note: meta ? meta.note : "",
      createdLabel,
      createdAt: meta ? meta.createdAt : 0,
      aos, ios, total,
    });
  }

  // 생성 최신순 정렬
  channels.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  res.status(200).json({ totalAll, todayAll, channels });
}
