import { Redis } from "@upstash/redis";

export const redis = Redis.fromEnv();

// KST(UTC+9) 기준 오늘 날짜 YYYYMMDD
export function kstYmd(d = new Date()) {
  const kst = new Date(d.getTime() + (d.getTimezoneOffset() * 60000) + (9 * 3600000));
  const y = kst.getFullYear();
  const m = String(kst.getMonth() + 1).padStart(2, "0");
  const day = String(kst.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

// 채널 ID 유효성: 영문 소문자/숫자/언더스코어, 2~40자
export function isValidChannelId(id) {
  return typeof id === "string" && /^[a-z0-9_]{2,40}$/.test(id);
}

// User-Agent로 OS 판별 (param이 우선)
export function resolveOs(param, ua) {
  const p = (param || "").toLowerCase();
  if (p === "aos" || p === "ios") return p;
  const u = (ua || "").toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(u) || (/macintosh/.test(u) && /mobile/.test(u));
  return isIOS ? "ios" : "aos";
}

// CORS 헤더 (대시보드/생성기가 같은 도메인이면 불필요하지만 안전하게)
export function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
