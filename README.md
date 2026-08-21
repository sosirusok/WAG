# WAG

WAG의 고객용 웹사이트입니다. 웹, 앱, 게임과 예약, 결제, 광고, 데이터베이스, 관리자 시스템 제작 문의를 받습니다.

## 콘텐츠 관리

사이트의 문구, 서비스, 포트폴리오, 진행 절차와 자주 묻는 질문은 `data/site.json`에서 관리합니다. WAG-admin을 이용하면 파일을 직접 편집하지 않고 안전하게 수정할 수 있습니다.

## 배포 주소

- 기본 주소: `https://sosirusok.github.io/WAG/`
- 상담: `https://open.kakao.com/o/sFZ94YJi`

`wag.com`은 다른 소유자가 사용 중이므로 이 저장소에는 잘못된 CNAME을 넣지 않습니다. 실제 소유한 별도 도메인이 준비되면 GitHub Pages 설정과 DNS를 함께 변경해야 합니다.

## 로컬 확인

```bash
npm run check
npm run build
python -m http.server 4173 -d dist
```
