# SWAG

SWAG(System · Website · App · Game)는 시스템 · 웹사이트 · 앱 · 게임 · AI 외주 제작을 안내하고 견적 문의를 받는 정적 웹사이트입니다. 상담한 두 사람이 기획부터 배포까지 담당하는 2인 프리랜서 스튜디오의 제작 범위, 프로젝트, 진행 방식, 소개, 문의 흐름을 분리된 페이지에서 안내합니다.

현재 작업 기준은 `v53`입니다. 배포 대상은 GitHub 저장소와 GitHub Pages입니다.

## 공개 주소와 배포

- 공개 주소: <https://swagstudio.pages.dev/> (Cloudflare Pages)
- 예전 주소: <https://sosirusok.github.io/WAG/> (GitHub Pages)
- 저장소: <https://github.com/sosirusok/WAG>
- 배포 브랜치: `main`
- 배포 방식: `.github/workflows/pages.yml`이 검증, 정적 빌드, 로컬 참조 감사를 통과한 `dist/`만 배포

### Cloudflare Pages 배포

공개 주소는 <https://swagstudio.pages.dev/> 이다. 주소에서 `github` 과 계정 이름을 없애기 위해
옮겼고, 도메인 구입 없이 무료로 쓴다.

이 계정은 대시보드에서 신규 Pages 프로젝트 생성이 막혀 있어(“애플리케이션 생성”에 Workers 만
나온다) **Pages API 로 프로젝트를 만들었다.** 그렇게 만든 프로젝트는 Direct Upload 방식이라
Cloudflare 가 스스로 저장소를 빌드하지 않고, 나중에 Git 연결로 바꿀 수도 없다
(`8000069 You cannot update the source object in a Direct Uploads project`).

그래서 빌드와 업로드를 `.github/workflows/cloudflare.yml` 에서 한다. `main` 에 push 하면
검증 → 빌드 → 링크 감사 → 업로드가 돌아간다.

필요한 저장소 Secret 두 개 (Settings → Secrets and variables → Actions):

| 이름 | 값 |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Cloudflare Pages **편집** 권한 토큰 |
| `CLOUDFLARE_ACCOUNT_ID` | `50e681eeae8d24131bff5cea7cf2fb89` |

Secret 이 없으면 워크플로는 실패하지 않고 배포 단계를 건너뛴다.

수동으로 올릴 때:

```bash
SITE_URL=https://swagstudio.pages.dev/ npm run build
CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... \
  npx wrangler@4 pages deploy dist --project-name=swagstudio --branch=main
```

## 페이지 구성

빌드 결과와 시각 감사의 대상은 다음 8개 경로입니다.

| 경로 | 역할 |
| --- | --- |
| `/` | 히어로, 숫자 요약, 제작 분야 카드, 기술 스택, 진행 방식 미리보기, 소개, 문의 진입 |
| `/services/` | 웹 · 앱 · 게임 · AI · 운영 시스템 제작 범위 |
| `/work/` | 공개 가능한 실제 프로젝트 사례 |
| `/process/` | 상담부터 검수 · 배포까지의 진행 흐름 |
| `/about/` | 2인 프리랜서 스튜디오 소개와 작업 방식 |
| `/contact/` | 제작 종류 선택, 문의 요약, 카카오 오픈채팅 상담 |
| `/privacy.html` | 개인정보 처리 안내 |
| `/404.html` | 잘못된 주소 안내 |

홈에는 프로젝트명, 프로젝트 스크린샷, 작업 사례 상세를 넣지 않습니다. 실제 사례는 `/work/`에서만 보여 줍니다.

## 디자인 기준 (v53)

- 밝은 쿨그레이 캔버스(`#f3f5fa`) 위에 라운드 화이트 카드, 포인트 다크 네이비 섹션을 배치한 카드형 화면
- 브랜드 컬러는 로고에서 가져온 블루 `#2145e6`와 민트 그린 `#5bdf9c`, 강조 요소에만 블루→그린 그라디언트 사용
- 한국어와 영문 모두 `SUIT Variable` 한 계열로 통일, 본문 17px 이상, 14px 미만 텍스트 금지
- 사진 대신 직접 그린 SVG 목업(브라우저 · 폰 · 게임 · 대시보드)과 실제 프로젝트 스크린샷만 사용
- 모션: 관성형 휠 스크롤, 유리 질감 내비게이션, 코드 에디터 · 터미널 타이핑 히어로, 헤드라인 로테이터,
  카드 틸트 · 시인, 서로 반대 방향으로 흐르는 기술 스택 3개 행, 푸터 마퀴, 이미지 스캔, 확장 페이지 전환,
  clip/stagger 모바일 메뉴
- v53에서 더한 아기자기한 반응: 로고 스피드라인 튀어나감, 구역 라벨 뒤 깜빡이는 커서,
  기술 스택 타일이 통통 튀며 기울고 옆 타일이 물러남, 손을 뻗으면 줄이 느려짐,
  숫자가 자리에 살짝 지나쳤다 앉음, 신뢰 항목 체크가 하나씩 톡, 목업 안에서 커서가
  버튼을 눌러 보임
- v51에서 더한 것: 숫자 오도미터 롤, 영문 라벨 해독 애니메이션, 카드 깊이 시차, 화면 진입 광택 훑기,
  커서를 따라오는 버튼 광원, 내비 글자 단위 반응, 기술 스택 타일 부상 · 이름표, 진행 미리보기 진행선과
  단계 점등, 히어로 코드 하이라이트 훑기, 복사 완료 체크 드로잉, 프로젝트 이미지 확대, 스크롤 안내 파문
- 성능: `IntersectionObserver`로 화면 밖 구역의 애니메이션을 `animation-play-state: paused` 처리하고 `content-visibility: auto`로 렌더 비용을 줄입니다. 히어로 배경은 blur 레이어 없이 그라디언트로 굽고, 파티클 캔버스와 스크롤 스큐는 측정된 프레임 비용 때문에 제거했습니다
- `prefers-reduced-motion: reduce`에서는 중복 행과 자동 이동을 정지하고 모든 장식 모션을 끕니다

## 로고와 이미지

- SWAG 워드마크는 블루 이탤릭 레터 + 그린 스피드라인 · 스우시 · 오빗 아크로 구성한 전용 벡터 로고입니다. `src/assets/swag-logo.svg`(기본), `swag-logo-white.svg`(다크 배경), `favicon.svg` · `favicon-192/512.png` · `apple-touch-icon.png`(아이콘), `swag-og.png`(공유 카드)로 배포합니다.
- 기술 스택 아이콘은 MIT 라이선스인 [skill-icons](https://github.com/tandpfun/skill-icons)에서 가져와 `src/assets/stack/`에 번들했습니다.
- 프로젝트 스크린샷(`case-*.jpg`)은 실제 운영 사이트 화면입니다. 관리자 도구에서 게시한 이미지는 `assets/uploads/`에 저장되며 빌드 시 함께 배포됩니다.

## 콘텐츠와 소스 구조

- `data/site.json`: 문구, 제작 분야, 프로젝트, 진행 절차, FAQ
- `src/*.template.html`: 8개 경로의 문서 골격
- `src/styles.css`: 디자인 토큰, 레이아웃, 타이포그래피, 반응형, 모션
- `src/app.js`: 관성 스크롤, 메뉴, 로테이터, 카운트업, 틸트, 마퀴, 이동 전환, 문의 상호작용
- `scripts/build.mjs`: 정적 HTML과 배포 파일 생성 (로고 인라인, 목업 · 스택 렌더러 포함)
- `scripts/validate.mjs`: 필수 데이터 · 자산 · 브랜드 색 · 모션 커버리지 · 금지 카피 검증
- `scripts/audit-links.mjs`: 생성된 경로와 로컬 자산 참조 검사
- `scripts/visual-audit.mjs`: 8개 경로, 6개 뷰포트, 메뉴 · 문의 상호작용 자동 검사

## 웹폰트 (2단 서브셋)

본문 글꼴은 `SUIT Variable`이며, 로딩 비용을 줄이기 위해 두 단계로 나눠 배포합니다.

| 파일 | 크기 | 역할 |
| --- | ---: | --- |
| `SUIT-core.woff2` | 88KB | 사이트가 실제로 쓰는 글자만. 첫 화면은 이것만으로 완결되며 preload 대상입니다. |
| `SUIT-full.woff2` | 508KB | KS X 1001 상용 한글 2,350자. core에 없는 글자가 나올 때만 내려받습니다. |

CSS의 `font-family`가 `"SUIT Core", "SUIT Full", ...` 순서이므로, 관리자 도구로 새 문구를
넣어 core에 없는 글자가 생겨도 자동으로 full이 받아져 깨지지 않습니다.

`scripts/build-fonts.py`는 core가 담은 글자 목록을 `scripts/font-coverage.json`에 남기고,
`scripts/audit-links.mjs`가 빌드마다 화면에 쓰인 글자를 그 목록과 대조합니다. core에 없는 글자가
하나라도 있으면 빌드가 실패합니다. SUIT에 없는 글자(em dash, en dash 등)를 쓰면 브라우저가 그 한
글자 때문에 508KB 전체 폰트를 받는데, 화면상으로는 멀쩡해 보여서 실제로 두 번 놓쳤습니다.

원본 가변 폰트는 `font-source/SUIT-Variable.woff2`에 두고 배포하지 않습니다.
콘텐츠를 크게 바꿔 core를 다시 만들려면:

```bash
pip install fonttools brotli
npm run build            # dist 를 먼저 생성
python3 scripts/build-fonts.py
```

## 로컬 실행과 검증

```bash
npm run check
npm run build
npm run dev
```

한 번에 정적 검증, 빌드, 링크 감사를 실행하려면 다음 명령을 사용합니다.

```bash
npm run verify
```

시각 감사는 Playwright가 설치된 런타임 경로와 실행 중인 로컬 미리보기가 필요합니다. 로컬 미리보기 주소로 빌드해야 자산이 로컬에서 로드됩니다.

```bash
SITE_URL=http://127.0.0.1:4173/ npm run build
npm run dev &
CODEX_PRIMARY_RUNTIME_NODE_MODULES="<Playwright가 설치된 node_modules 경로>" \
AUDIT_BASE_URL=http://127.0.0.1:4173/ npm run audit:visual
```

감사는 320×812, 390×844, 844×390, 768×1024, 1100×900, 1440×1000에서 실행합니다. v49 로컬 빌드는 48개 화면 조합, 문의 · 메뉴 상호작용, 3개 행의 방향 · 속도 · 화면 내 위치 · 모션 감소 검사를 합쳐 **1622/1622 assertions**를 통과했습니다.

검증 결과와 아직 다시 확인할 항목은 [QUALITY-CHECKLIST.md](QUALITY-CHECKLIST.md)에 기록합니다.
