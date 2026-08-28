# SWAG

SWAG(System · Website · App · Game)는 시스템 · 웹사이트 · 앱 · 게임 · AI 외주 제작을 안내하고 견적 문의를 받는 정적 웹사이트입니다. 상담한 두 사람이 기획부터 배포까지 담당하는 2인 프리랜서 스튜디오의 제작 범위, 프로젝트, 진행 방식, 소개, 문의 흐름을 분리된 페이지에서 안내합니다.

현재 작업 기준은 `v50`입니다. 배포 대상은 GitHub 저장소와 GitHub Pages입니다.

## 공개 주소와 배포

- 공개 주소: <https://sosirusok.github.io/WAG/>
- 저장소: <https://github.com/sosirusok/WAG>
- 배포 브랜치: `main`
- 배포 방식: `.github/workflows/pages.yml`이 검증, 정적 빌드, 로컬 참조 감사를 통과한 `dist/`만 GitHub Pages에 배포

## 페이지 구성

빌드 결과와 시각 감사의 대상은 다음 8개 경로입니다.

| 경로 | 역할 |
| --- | --- |
| `/` | 히어로, 01 제작 분야, 02 기술 스택, 03 진행 방식, 04 소개, 05 문의 |
| `/services/` | 웹 · 앱 · 게임 · AI · 운영 시스템 제작 범위 |
| `/work/` | 공개 가능한 실제 프로젝트 사례 |
| `/process/` | 상담부터 검수 · 배포까지의 진행 흐름 |
| `/about/` | 2인 프리랜서 스튜디오 소개와 작업 방식 |
| `/contact/` | 제작 종류 선택, 문의 요약, 카카오 오픈채팅 상담 |
| `/privacy.html` | 개인정보 처리 안내 |
| `/404.html` | 잘못된 주소 안내 |

홈에는 프로젝트명, 프로젝트 스크린샷, 작업 사례 상세를 넣지 않습니다. 실제 사례는 `/work/`에서만 보여 줍니다.

## 디자인 기준 (v50) — SLIPSTREAM

로고는 속도를 그린 그림입니다. 그래서 페이지 전체가 로고에서 실측한 **16.7도**를 축으로 움직입니다.

- 색상환 225도(푸른 회색)를 벗어난 **중성 검정 바닥**(`#08080a`) 하나. 밝은 띠는 진행 방식 구역 하나뿐(`#f0eee9`)
- 브랜드 블루 `#2145e6`는 **정체성과 구조**에만(헤더 CTA · S·W·A·G 이니셜 · 워드마크 · 링크 · 스크롤 바)
- 그린 `#5bdf9c`는 **움직이는 것에만**. 초록 체크표시나 상태점은 어디에도 없습니다
- 그라디언트 없음, 글자 그라디언트 없음, `backdrop-filter` 없음, 애니메이션 blur 없음
- 컨테이너 모서리 반경 **0**. 999px 알약은 헤더 CTA와 카카오 버튼 딱 두 곳
- 글꼴 굵기 **세 가지**(280 / 400 / 700), 글자 크기 **여덟 단계**(14 · 17 · 21 · 27 · 34 · 44 · 58 · 76) + 히어로 clamp
- 구역 제목(`h2`)은 **17px**. 구역에서 가장 작은 글자가 제목이고 가장 큰 글자는 내용입니다
- 눈썹 라벨(`.eyebrow`) · 카드 · 회색 자리표시자 그림 · 알약 배지는 전부 삭제. `mono` 서체는 장식이 아니라
  **번호 · 개수 · 주소 · 도구 이름만** 조판하는 별도 성부입니다
- 모션(28종): 문장이 16.7도로 기울어진 채 올라와 똑바로 서면서 멈추고 초록 잔상 세 겹이 한 박자 늦게 따라오는
  히어로 안무(1680ms), 로고 스피드바 간격(19px)으로 흐르는 결, 워드마크 라이트온, 제작 분야 행의 초록 칼날,
  서로 반대 방향으로 흐르는 기술 스택 3개 행, 밝은 띠 이음새를 따라 그어지는 실선, 진행선 스크럽,
  칸 밖에서 올라오는 숫자, 카카오 버튼을 도는 오빗 아크, 복사 완료 초록 섬광, 푸터 블레이드, 뷰 트랜지션
- 성능: 홈에 상시 `requestAnimationFrame` 루프는 기술 스택 3개 행 하나뿐입니다. 화면 밖 구역은
  `animation-play-state: paused` + `content-visibility: auto`. 히어로 결의 가장자리는 `mask-image` 대신
  **바닥색과 같은 불투명한 덮개**로 지웁니다 — 마스크가 걸린 부모 안에서 자식이 움직이면 매 프레임 마스크를
  다시 굽느라 60fps → 19fps 로 떨어지는 것을 실측했습니다
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
| `SUIT-core.woff2` | 87KB | 사이트가 실제로 쓰는 글자만. 첫 화면은 이것만으로 완결되며 preload 대상입니다. |
| `SUIT-full.woff2` | 508KB | KS X 1001 상용 한글 2,350자. core에 없는 글자가 나올 때만 내려받습니다. |

CSS의 `font-family`가 `"SUIT Core", "SUIT Full", ...` 순서이므로, 관리자 도구로 새 문구를
넣어 core에 없는 글자가 생겨도 자동으로 full이 받아져 깨지지 않습니다.

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

감사는 320×812, 390×844, 844×390, 768×1024, 1100×900, 1440×1000에서 실행합니다. v50 로컬 빌드는 48개 화면 조합, 문의 · 메뉴 상호작용, 3개 행 검사, 히어로 안무 완료 · 템플릿 부품 부재 · 모서리 반경 · 타입 스케일 · 굵기 개수 검사를 합쳐 **1862/1862 assertions**를 통과했습니다.

검증 결과와 아직 다시 확인할 항목은 [QUALITY-CHECKLIST.md](QUALITY-CHECKLIST.md)에 기록합니다.
