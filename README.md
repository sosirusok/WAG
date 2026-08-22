# WAG

WAG의 고객용 웹사이트입니다. 홈, 서비스, 진행 방식, 작업과 문의 페이지로 구성됩니다.

## 콘텐츠 관리

사이트의 문구, 서비스, 작업 사례, 진행 절차와 자주 묻는 질문은 `data/site.json`에서 관리합니다. WAG-admin을 이용하면 파일을 직접 편집하지 않고 안전하게 수정할 수 있습니다. 공개된 작업은 실제 화면 이미지가 있어야 배포 검증을 통과합니다.

## 배포 주소

- 기본 주소: `https://sosirusok.github.io/WAG/`
- 상담: `https://open.kakao.com/o/sFZ94YJi`

별도 도메인을 연결하려면 해당 도메인의 DNS 관리 권한이 필요합니다. 준비된 도메인이 있으면 GitHub Pages 설정과 DNS를 함께 변경합니다.

## 로컬 확인

```bash
npm run check
npm run build
python -m http.server 4173 -d dist
```

## 글꼴

Pretendard를 저장소에서 직접 제공합니다. 라이선스는 `src/assets/Pretendard-LICENSE.txt`에 포함되어 있습니다.
