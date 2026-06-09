import { redis, kstYmd, isValidChannelId, setCors } from "./_lib.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") { res.status(204).end(); return; }

  const id = String(req.query.ch || "").toLowerCase();
  if (!isValidChannelId(id)) { res.status(400).send("invalid channel"); return; }

  let meta = null;
  try { meta = await redis.get(`ch:${id}`); } catch {}
  if (!meta) { res.status(404).send("unknown channel"); return; }

  let aosTotal = 0, iosTotal = 0;
  try {
    const [a, i] = await Promise.all([
      redis.get(`cnt:${id}:aos`),
      redis.get(`cnt:${id}:ios`),
    ]);
    aosTotal = parseInt(a, 10) || 0;
    iosTotal = parseInt(i, 10) || 0;
  } catch {}

  // 생성일(KST) ~ 오늘(KST)까지 날짜 목록 (최신순, 최대 400일)
  const todayStr = kstYmd();
  const startMs = meta.createdAt || Date.now();
  const startStr = kstYmd(new Date(startMs));

  const dates = [];
  let cursor = new Date(
    +todayStr.slice(0, 4), +todayStr.slice(4, 6) - 1, +todayStr.slice(6, 8)
  );
  const startDate = new Date(
    +startStr.slice(0, 4), +startStr.slice(4, 6) - 1, +startStr.slice(6, 8)
  );
  let guard = 0;
  while (cursor.getTime() >= startDate.getTime() && guard < 400) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    const d = String(cursor.getDate()).padStart(2, "0");
    dates.push(`${y}${m}${d}`);
    cursor = new Date(cursor.getTime() - 86400000);
    guard++;
  }

  // 각 날짜의 aos/ios 병렬 조회
  const keys = [];
  for (const ds of dates) {
    keys.push(`cnt:${id}:aos:${ds}`, `cnt:${id}:ios:${ds}`);
  }

  let vals = [];
  try {
    vals = keys.length ? await redis.mget(...keys) : [];
  } catch {
    vals = [];
  }

  const days = dates.map((ds, idx) => ({
    date: ds,
    aos: parseInt(vals[idx * 2], 10) || 0,
    ios: parseInt(vals[idx * 2 + 1], 10) || 0,
  }));

  res.status(200).json({
    id,
    note: meta.note || "",
    aosTotal,
    iosTotal,
    days,
  });
}
