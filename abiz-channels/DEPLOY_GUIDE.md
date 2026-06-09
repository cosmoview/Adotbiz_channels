# A.Biz 채널 QR 시스템 — 배포 가이드

채널별로 Android/iOS QR을 발급하고, OS별·일자별 실적을 대시보드로 보는 시스템입니다.
GitHub + Vercel + Upstash Redis로 동작합니다. 아래를 순서대로 따라 하세요.

> 기존 통합 QR(현재 쓰고 있는 것)은 그대로 두세요. 이 시스템은 별개로 새로 만드는 것이며,
> 앞으로 생성하는 채널부터 여기에 집계됩니다.

---

## 0. 준비물

- GitHub 계정 (이미 `cosmoview` 있음)
- Vercel 계정 (무료, GitHub로 로그인 가능): https://vercel.com
- 이 폴더의 파일 전체

폴더 구조:
```
abiz-channels/
├─ api/
│  ├─ _lib.js          공용 (Redis 연결, OS판별, 날짜)
│  ├─ go.js            스캔 추적 + 앱 리다이렉트
│  ├─ channels.js      채널 생성(POST) / 목록(GET)
│  └─ channel.js       채널 상세(GET)
├─ public/
│  ├─ generate.html    생성기 화면
│  ├─ dashboard.html   대시보드 화면
│  └─ vendor/qrcode.js QR 라이브러리 (로컬 포함)
├─ package.json
└─ vercel.json
```

---

## 1. GitHub 저장소에 올리기

VS Code 터미널에서 (이 폴더 위치에서):

```bash
git init
git add .
git commit -m "abiz channel qr system"
gh repo create Adotbiz_channels --public --source=. --push
```

> `gh`가 없으면: `winget install --id GitHub.cli` 후 터미널 새 창 → `gh auth login`.
> 저장소 이름(`Adotbiz_channels`)은 원하는 대로 바꿔도 됩니다.

---

## 2. Vercel에 프로젝트 연결

1. https://vercel.com 접속 → GitHub로 로그인.
2. "Add New… → Project" 클릭.
3. 방금 만든 `Adotbiz_channels` 저장소를 Import.
4. 설정은 기본값 그대로 두고 "Deploy" 클릭.
5. 1~2분 뒤 배포 완료. 주소가 생깁니다 (예: `https://adotbiz-channels.vercel.app`).

> 이 시점엔 아직 DB가 없어서 대시보드가 "목록을 불러오지 못했습니다"라고 나옵니다. 정상입니다. 3단계에서 연결합니다.

---

## 3. Upstash Redis (데이터베이스) 연결

> 예전의 "Vercel KV"는 없어졌고, 지금은 Marketplace의 Upstash Redis를 씁니다.

1. Vercel 프로젝트 화면 상단 탭에서 "Storage" 클릭.
2. "Create Database" 또는 "Marketplace Database Providers" → "Upstash" → "Redis" 선택.
3. 안내에 따라:
   - "Let Vercel manage" (Vercel이 Upstash 계정까지 관리) 선택이 가장 간단합니다.
   - 데이터베이스 이름 입력(예: `abiz-redis`), 지역은 가까운 곳(예: Japan/Singapore), 무료(Free) 플랜.
4. 생성 후 "Connect to Project"에서 이 프로젝트(`Adotbiz_channels`)를 연결.
   - 연결하면 환경변수(`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`)가 자동으로 프로젝트에 추가됩니다.
5. 환경변수가 적용되도록 재배포: 프로젝트 → "Deployments" → 최신 항목 우측 "⋯" → "Redeploy".

> 환경변수 이름을 직접 입력할 필요는 없습니다. Upstash 연결이 자동으로 넣어줍니다.
> 만약 자동으로 안 들어갔다면, Upstash(또는 Vercel Storage) 화면에서 두 값을 복사해
> 프로젝트 Settings → Environment Variables에 직접 추가하세요.

---

## 4. 동작 확인

배포 주소를 `https://<당신주소>.vercel.app` 라고 할 때:

1. 생성기 열기: `https://<주소>/generate.html`
2. 채널 꼬리표에 `test1` 입력 → "채널 생성 + QR 발급" 클릭 → QR 2개가 나오면 성공.
3. 대시보드 열기: `https://<주소>/dashboard.html` (또는 그냥 `https://<주소>/`)
   - `test1` 채널이 목록에 보이면 DB 연결 정상.
4. 나온 QR 중 Android를 **안드로이드 폰**으로, iPhone을 **아이폰**으로 스캔.
   - 앱이 열리고, 대시보드 `test1` 상세에서 숫자가 +1 되면 전체 동작 완료.

> 테스트 후 `test1`은 그대로 둬도 되고, 신경 쓰이면 무시하세요(삭제 기능은 추후 추가 가능).

---

## 5. 실제 운영

- 새 채널이 필요할 때마다 생성기에서 채널명만 입력 → QR 다운로드 → 인쇄/게시.
- 채널명 예시: `poster_lobby`, `email_0610`, `booth_seoul` 처럼 "어디에 썼는지" 알 수 있게.
- 실적은 대시보드에서 언제든 확인. 채널 클릭 → OS별·일자별 그래프.

---

## 자주 나오는 문제

- 대시보드가 "목록을 불러오지 못했습니다" → 3단계 DB 연결/재배포 누락. Redeploy 확인.
- QR 스캔해도 숫자 안 오름 → 사내망이 `.vercel.app`을 막을 수 있음. 외부망(LTE)에서 재확인.
- 앱이 안 열림(iOS) → 딥링크 스킴 문제일 수 있음. 안드로이드부터 확인 후 문의.
- 코드 수정 후 반영 → GitHub에 push하면 Vercel이 자동 재배포.
