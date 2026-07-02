https://kakaru-rgb.github.io/Zip-chatGo/


# 집찾GO 부동산 플랫폼 Footer 제작 작업 요약

- **작업 일자**: 2026-07-02
- **목적**: `집찾GO` 부동산 플랫폼에 맞는 순수 HTML 기반 반응형 푸터 제작
- **주요 기술**: HTML5, CSS3, JavaScript (Vanilla), Bootstrap 5.3.3, Font Awesome 6.5.2, Google Fonts

---

## 1. 파일 및 디렉토리 구조

```text
project_zip/
├── templates/
│   └── common/
│       └── footer.html                  # 푸터 마크업 및 독립 HTML 미리보기 문서
├── static/
│   ├── css/
│   │   ├── common.css                   # 공통 CSS 변수, 폰트, 중단점, 기본 유틸리티
│   │   └── footer.css                   # 푸터 전용 스타일 및 반응형 미디어 쿼리
│   ├── js/
│   │   └── footer.js                    # 패밀리사이트, 사이트맵, 투더탑 상호작용
│   └── images/
│       └── favicon.png                  # 집찾GO 브랜드 파비콘 및 로고 이미지
├── UI_example.png                       # 참고 UI 이미지
└── worklog/
    └── footer/
        └── README.md                    # 본 작업 내용 정리 문서
```

---

## 2. 외부 리소스 (CDN)

| 리소스 | CDN URL | 용도 |
|--------|---------|------|
| Bootstrap 5.3.3 CSS | `cdn.jsdelivr.net/npm/bootstrap@5.3.3/...css` | 반응형 그리드 및 기본 유틸리티 |
| Google Fonts | `fonts.googleapis.com` | `Inter`, `Noto Sans KR` 폰트 연결 |
| Font Awesome 6.5.2 | `cdnjs.cloudflare.com/...font-awesome/6.5.2/...` | 소셜, 패밀리사이트, 투더탑 아이콘 |

---

## 3. 디자인 시스템 (`common.css` CSS 변수)

### 색상 팔레트

| 변수명 | 값 | 용도 |
|--------|-----|------|
| `--color-primary` | `#0b5f6a` | 청록 계열 메인 컬러, 상단 유틸리티 바 배경 |
| `--color-secondary` | `#f59e0b` | 골드 계열 강조 컬러, hover 및 CTA 아이콘 |
| `--color-surface` | `#f7faf9` | 페이지 기본 배경 |
| `--color-dark` | `#172033` | 기본 텍스트 및 드롭다운 텍스트 |
| `--color-muted` | `#6b7280` | 보조 텍스트 |
| `--color-line` | `rgba(255, 255, 255, 0.14)` | 푸터 내부 경계선 |
| `--color-white` | `#ffffff` | 밝은 텍스트 |

### 폰트 (Google Fonts CDN)

| 변수명 | 폰트 | 용도 |
|--------|------|------|
| `--font-title` | `Noto Sans KR`, sans-serif | 로고 영역, 사이트맵 제목 |
| `--font-body` | `Inter`, `Noto Sans KR`, sans-serif | 회사 정보, 링크, 버튼 본문 |

### Bootstrap 5 기준 중단점 변수

| 변수명 | 값 |
|--------|----|
| `--breakpoint-sm` | `576px` |
| `--breakpoint-md` | `768px` |
| `--breakpoint-lg` | `992px` |
| `--breakpoint-xl` | `1200px` |
| `--breakpoint-xxl` | `1400px` |

---

## 4. HTML 시맨틱 구조

```text
body.jipgo-footer-page
└── footer.jipgo-footer
    ├── div.jipgo-footer__utility
    │   └── div.jipgo-footer__utility-inner
    │       ├── ul.jipgo-footer__policy              ← 이용약관 링크
    │       └── div.jipgo-footer__family             ← 패밀리사이트 드롭다운
    ├── div.jipgo-footer__main
    │   └── div.jipgo-container
    │       └── div.row.gy-5
    │           ├── div.col-12.col-lg-7              ← 로고, SNS, 회사 정보
    │           │   ├── div.jipgo-footer__brand-row
    │           │   │   ├── a.jipgo-footer__logo     ← favicon 이미지 로고
    │           │   │   └── div.jipgo-footer__social ← SNS 아이콘
    │           │   └── div.jipgo-footer__company    ← 법적/연락처 정보
    │           └── div.col-12.col-lg-5
    │               └── nav.jipgo-footer__sitemap    ← 사이트맵 4열
    ├── div.jipgo-footer__bottom                     ← 저작권 바
    └── a.jipgo-footer__top-button                   ← 투더탑 버튼
```

---

## 5. 순수 HTML 연결 방식

Django 템플릿 문법을 사용하지 않고, `footer.html` 위치 기준 상대경로로 정적 파일을 연결했습니다.

```html
<link rel="icon" type="image/png" href="../../static/images/favicon.png">
<link rel="stylesheet" href="../../static/css/footer.css">
<script src="../../static/js/footer.js"></script>
```

`footer.css` 내부에서는 공통 스타일을 다음처럼 연결합니다.

```css
@import url("./common.css");
```

---

## 6. 컬럼 레이아웃

| 컬럼 | 클래스 | 비율 | 내용 |
|------|--------|------|------|
| 좌측 | `col-12 col-lg-7` | 모바일 100% / 데스크탑 58.3% | favicon 로고, SNS, 회사 정보 |
| 우측 | `col-12 col-lg-5` | 모바일 숨김 / 데스크탑 41.6% | 사이트맵 4개 카테고리 |

---

## 7. 반응형 구현 (Bootstrap 5 중단점)

| 중단점 | 화면 너비 | 적용 동작 |
|--------|-----------|-----------|
| Base | `< 576px` | 모바일 중앙 정렬, 사이트맵 숨김, 로고 140px |
| `sm` | `≥ 576px` | 기본 모바일 흐름 유지 |
| `md` | `≥ 768px` | 정책 링크와 회사 정보 여백 안정화 |
| `lg` | `≥ 992px` | 2단 레이아웃 전환, 사이트맵 표시 |
| `xl` | `≥ 1200px` | 컨테이너 최대 폭 960px 기준 조정 |
| `xxl` | `≥ 1400px` | 푸터 메인 패딩 확장 |

---

## 8. 모바일 전용 처리

| 항목 | 모바일 (`< 768px`) | 데스크탑 |
|------|-------------------|----------|
| 정책 링크 | 줄바꿈 허용, 중앙 정렬 | 한 줄 좌측 배치 |
| 패밀리사이트 | 중앙 배치 | 우측 배치 |
| 로고 + SNS 영역 | 중앙 정렬 | 좌측 정렬 |
| 회사 정보 | 중앙 정렬 | 좌측 정렬 |
| 사이트맵 | 숨김 (`display: none`) | 4열 표시 |
| 투더탑 버튼 | 42px 크기 | 46px 크기 |

---

## 9. 파비콘 및 브랜드 로고

- **파일**: `static/images/favicon.png`
- **적용 위치**
  - 브라우저 favicon
  - 푸터 브랜드 로고 이미지
- **현재 표시 크기**
  - 데스크탑: `176px × 176px`
  - 모바일: `140px × 140px`
- **표시 방식**
  - 원본 favicon 색상은 변형하지 않음
  - 흰 배경을 유지한 채 CSS `border-radius: 50%`로 원형 로고처럼 표시
- **브랜드 텍스트 처리**
  - `집찾GO` 텍스트 로고는 제거
  - favicon 이미지만 브랜드 마크로 노출

---

## 10. 콘텐츠 구성 (집찾GO 맞춤화)

### 이용약관 바

이용약관 / 개인정보처리방침 / 매물등록 이용약관

### 법적 정보

`(주)집찾GO` · 대표자: 홍길동 · 사업자등록번호: 214-87-50931 · 개인정보보호 책임자: 임꺽정

### 연락처

- 서울특별시 강남구 테헤란로 128 집찾GO타워 12층
- 매물상담: 1599-9070
- 고객센터: 1599-2040
- FAX: 02-567-9070

### SNS 링크

블로그 · 페이스북 · 인스타그램 · 유튜브

### 패밀리사이트

| 항목 | 링크 |
|------|------|
| 다방 | `https://www.dabangapp.com/` |
| 직방 | `https://www.zigbang.com/` |
| 호갱노노 | `https://hogangnono.com/` |
| 부동산R114 | `https://www.r114.com/` |

### 사이트맵

| 집찾GO 소개 | 매물찾기 | 고객지원 | 제휴문의 |
|-------------|----------|----------|----------|
| 회사소개 | 아파트 | 공지사항 | 중개사 가입 |
| 서비스 철학 | 오피스텔 | 이벤트 | 매물 광고 |
| 오시는 길 | 원룸/투룸 | FAQ | 사업제휴 |
| | 상가/사무실 | 1:1 문의 | |

---

## 11. 추가 UI 인터랙션 및 스크립트 기능

`static/js/footer.js`에서 푸터 상호작용을 제어합니다.

### 링크 Hover 피드백

- 정책 링크, 사이트맵 버튼, 사이트맵 하위 링크, SNS, 패밀리사이트 항목에 `mouseenter` 시 `is-hovered` 클래스 추가
- `mouseleave` 시 `is-hovered` 클래스 제거
- CSS hover와 JS 클래스를 함께 사용해 브라우저 상태와 스크립트 상태를 통일

### 커스텀 패밀리사이트 드롭다운

- 기본 `<select>` 대신 `button + ul` 구조 사용
- 버튼 클릭 시 `.jipgo-footer__family.is-open` 토글
- 외부 영역 클릭 시 자동 닫힘
- `Escape` 키 입력 시 닫힘 및 버튼 포커스 해제
- hover/focus 시 메뉴가 위쪽으로 슬라이드 업되어 열림

### 사이트맵 전체 슬라이드 다운

- 개별 카테고리별 드롭다운이 아니라, 사이트맵 영역 전체 기준으로 동작
- `집찾GO 소개`, `매물찾기`, `고객지원`, `제휴문의` 근처에 마우스가 진입하면 4개 하위 목록이 동시에 표시
- 마우스가 사이트맵 영역을 벗어나면 하위 목록 자동 닫힘
- 하위 목록 영역 높이를 미리 확보해 열리고 닫혀도 푸터 전체 높이가 변하지 않음
- 각 버튼의 아래 화살표 아이콘은 제거

### 투더탑 버튼

- 우측 하단에 `fixed`로 배치
- 클릭 시 `window.scrollTo({ top: 0, behavior: "smooth" })`로 부드럽게 최상단 이동

---

## 12. 주요 CSS 설계 포인트

### 푸터 하단 고정

순수 HTML 미리보기에서 푸터가 화면 위쪽에 뜨지 않도록 body를 flex 컨테이너로 구성했습니다.

```css
.jipgo-footer-page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

.jipgo-footer {
    margin-top: auto;
}
```

### 사이트맵 높이 고정

하위 목록이 슬라이드 다운되어도 푸터 크기가 변하지 않도록 고정 공간을 미리 확보했습니다.

```css
.jipgo-footer__sitemap {
    min-height: 178px;
}

.jipgo-footer__nav-list {
    min-height: 126px;
    opacity: 0;
    transform: translateY(-8px);
}
```

---

## 13. 최종 작업 파일

- `templates/common/footer.html`
- `static/css/common.css`
- `static/css/footer.css`
- `static/js/footer.js`
- `static/images/favicon.png`
- `worklog/footer/README.md`
