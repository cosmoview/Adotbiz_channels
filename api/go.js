import { redis, kstYmd, isValidChannelId, resolveOs } from "./_lib.js";

export default async function handler(req, res) {
  const ch = (req.query.ch || "").toString();
  const osParam = (req.query.os || "").toString();
  const ua = req.headers["user-agent"] || "";

  if (!isValidChannelId(ch)) {
    res.status(400).send("invalid channel");
    return;
  }

  const os = resolveOs(osParam, ua);

  // 채널 메타에서 딥링크 가져오기
  let meta;
  try {
    meta = await redis.get(`ch:${ch}`);
  } catch (e) {
    meta = null;
  }

  if (!meta) {
    res.status(404).send("unknown channel");
    return;
  }

  const scheme = os === "ios" ? meta.iosLink : meta.aosLink;

  // 카운트 +1 (누적 + 일자별). 실패해도 리다이렉트는 진행.
  const today = kstYmd();
  try {
    await Promise.all([
      redis.incr(`cnt:${ch}:${os}`),
      redis.incr(`cnt:${ch}:${os}:${today}`),
    ]);
  } catch (e) {
    // 집계 실패는 무시 (사용자 경험 우선)
  }

  // 커스텀 스킴으로 즉시 이동시키는 HTML (https 안 붙임)
  const safeScheme = String(scheme || "").replace(/"/g, "&quot;");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(`<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>A.Biz 설치</title>
<style>body{margin:0;background:#0f1110;color:#f4f6f3;font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:24px}.dot{width:54px;height:54px;border-radius:14px;background:#2d7fff;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px;margin:0 auto 20px}.btn{display:inline-block;margin-top:18px;padding:14px 22px;border-radius:12px;background:#2d7fff;color:#fff;font-weight:700;text-decoration:none}p{color:#9aa39c;font-size:14px;line-height:1.6}</style>
</head><body><div><div class="dot">A.</div>
<h1 style="font-size:18px">A.Biz 앱을 여는 중…</h1>
<p>자동으로 열리지 않으면 아래 버튼을 눌러주세요.</p>
<a class="btn" href="${safeScheme}">A.Biz 앱 열기</a></div>
<script>setTimeout(function(){location.href=${JSON.stringify(scheme || "")}},400);</script>
</body></html>`);
}
