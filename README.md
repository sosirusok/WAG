# SWAG

SWAG 2인 프리랜서 스튜디오의 정적 웹사이트입니다. 웹사이트, 앱·웹앱, 브라우저 게임, 운영 시스템 제작 범위와 진행 방식, 스튜디오 소개, 견적 문의를 분리된 페이지에서 안내합니다.

현재 작업 기준은 `v46`입니다. 배포 대상은 ChatGPT Sites가 아니라 GitHub 저장소와 GitHub Pages입니다.

## 공개 주소와 배포

- 공개 주소: <https://sosirusok.github.io/WAG/>
- 저장소: <https://github.com/sosirusok/WAG>
- 배포 브랜치: `main`
- 배포 방식: `.github/workflows/pages.yml`이 검증, 정적 빌드, 로컬 참조 감사를 통과한 `dist/`만 GitHub Pages에 배포

## 페이지 구성

빌드 결과와 시각 감사의 대상은 다음 8개 경로입니다.

| 경로 | 역할 |
| --- | --- |
| `/` | 브랜드 첫 화면, 제작 분야, 스튜디오 소개, 문의 진입 |
| `/services/` | 웹·앱·게임·운영 시스템 제작 범위 |
| `/work/` | 공개 가능한 실제 프로젝트 사례 |
| `/process/` | 상담부터 검수·배포까지의 진행 흐름 |
| `/about/` | 2인 프리랜서 스튜디오 소개와 작업 방식 |
| `/contact/` | 제작 종류 선택, 문의 요약, 카카오 상담 |
| `/privacy.html` | 개인정보 처리 안내 |
| `/404.html` | 잘못된 주소 안내 |

홈에는 프로젝트명, 프로젝트 스크린샷, 작업 사례 상세를 넣지 않습니다. 실제 사례는 `/work/`에서만 보여 줍니다.

## 디자인 기준

- 밝은 자연광 사진을 중심으로 한 편집형 화면
- 따뜻한 백색과 검정 잉크가 주조색, 작은 burnt-orange 포인트만 사용
- 파랑, 카키, 올리브, 큰 단색 컬러 면, 카드 그리드, PPT식 구획을 사용하지 않음
- 한국어와 영문 모두 `SUIT Variable` 한 계열로 통일
- 데스크톱은 제작 분야, 프로젝트, 진행 방식, 소개, 견적 문의를 각각 노출하고 작은 화면에서만 메뉴로 전환
- 큰 제목 하나로 화면을 채우지 않고 사진, 짧은 정보, 여백, 이동 흐름으로 위계를 구성

`dev.rederx.com`에서는 콘텐츠와 색을 가져오지 않고 움직임과 배치 원리만 참고했습니다. 관성형 휠 스크롤, 유리 질감 내비게이션, 모바일 메뉴의 clip/stagger 등장, 서로 반대 방향으로 흐르는 3개 행, 계속 움직이는 이미지 행, 서비스 이미지에서 다음 화면으로 이어지는 expand 전환을 프로젝트 코드로 독립 구현했습니다. 3개 행에는 일시정지 버튼이 있으며 모션 감소 설정에서는 중복 행과 자동 이동을 정지합니다.

## 이미지와 로고

로고와 사진은 이 프로젝트를 위해 생성한 뒤 선택·크롭·압축한 전용 자산입니다. 로고와 서비스 사진의 `v42`, 새 홈 사진의 `v46`은 생성 배치 식별자이며 현재 사이트 릴리스 기준은 `v46`입니다.

| 용도 | 생성 원본 | 배포 자산 |
| --- | --- | --- |
| SWAG 시그니처 로고 | `creative-sources/v42/swag-signature-master.png` | `src/assets/swag-signature-v42.png`, `src/assets/swag-mark-v42.png`, `src/assets/swag-og-v42.png` |
| 홈 스튜디오 장면 | `creative-sources/v46/studio-hero-master.png` | `src/assets/studio-hero-v46.webp` |
| 소개 장면 | `creative-sources/v42/studio-about-master.png` | `src/assets/studio-about-v42.webp` |
| 웹사이트 제작 | `creative-sources/v42/service-web-master.png` | `src/assets/service-web-v42.webp` |
| 앱 제작 | `creative-sources/v42/service-app-master.png` | `src/assets/service-app-v42.webp` |
| 브라우저 게임 제작 | `creative-sources/v42/service-game-master.png` | `src/assets/service-game-v42.webp` |
| 운영 시스템 제작 | `creative-sources/v42/service-system-master.png` | `src/assets/service-system-v42.webp` |

사진 생성 기준은 밝은 자연광, 실제 2인 제작 환경, 자연스러운 장비와 손동작, 검정·오프화이트·작은 burnt-orange입니다. 홈 사진은 두 사람의 뒤쪽에서 촬영한 구도로 얼굴이 보이지 않고, 제목이 놓이는 왼쪽에는 밝고 낮은 밀도의 여백을 확보했습니다. 파랑·카키·올리브, 미스터리·방탈출 분위기, 유리 조형물, 공중 UI, 카드 모형, 과장된 스톡 사진 연출은 제외했습니다. 로고는 굵은 색 글자 대신 검정 잉크 질감의 S/W 결합 심벌, 음각과 음영, 작은 orange registration slash로 설계했습니다.

## 콘텐츠와 소스 구조

- `data/site.json`: 문구, 제작 분야, 프로젝트, 진행 절차, FAQ
- `src/*.template.html`: 8개 경로의 문서 골격
- `src/styles.css`: 레이아웃, 타이포그래피, 반응형, 모션
- `src/app.js`: 관성 스크롤, 메뉴, 이동 전환, 문의 상호작용
- `scripts/build.mjs`: 정적 HTML과 배포 파일 생성
- `scripts/validate.mjs`: 금지 색·글꼴·카피·자산과 필수 데이터 검증
- `scripts/audit-links.mjs`: 생성된 경로와 로컬 자산 참조 검사
- `scripts/visual-audit.mjs`: 8개 경로, 6개 뷰포트, 메뉴·문의 상호작용 자동 검사

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

시각 감사는 Playwright가 설치된 런타임 경로와 실행 중인 로컬 미리보기가 필요합니다.

```powershell
$env:CODEX_PRIMARY_RUNTIME_NODE_MODULES="<Playwright가 설치된 node_modules 경로>"
$env:AUDIT_BASE_URL="http://127.0.0.1:4173/"
npm run audit:visual
```

감사는 320×812, 390×844, 844×390, 768×1024, 1100×900, 1440×1000에서 실행합니다. v46 로컬 빌드는 48개 화면 조합, 문의·메뉴 상호작용, 3개 행의 방향·속도·일시정지·모션 감소 검사를 합쳐 **1621/1621 assertions**를 통과했습니다.

검증 결과와 아직 다시 확인할 항목은 [QUALITY-CHECKLIST.md](QUALITY-CHECKLIST.md)에 기록합니다.
