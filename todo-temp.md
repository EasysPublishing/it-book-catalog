# 리팩토링 TODO

> 이지스퍼블리싱 도서 카탈로그 (`index.html` 단일 파일, 698줄) 리팩토링 작업 목록
> 작성일: 2026-06-05

---

## 핵심 문제 요약 (Top 3)

1. **데이터-뷰 결합**: 도서 정보가 모두 HTML 마크업에 하드코딩됨
2. **단일 파일 698줄**: HTML/CSS/JS/데이터가 한 파일에 섞여 있음
3. **카드 패턴 중복 구현**: `book-card`(Do it!)와 `doenda-card`(된다!/단행본)가 거의 동일한데 별도 정의 + override

---

## 영역별 문제 상세

### 🔴 데이터 모델

- [ ] 도서 정보가 HTML 마크업에 하드코딩되어 있음 (한 책 카드 = 200자 넘는 단일 `<div>` 줄)
- [ ] 같은 도서가 여러 카테고리에 중복 등록됨
  - `Do it! 점프 투 파이썬` → 개발기초/데이터분석/인공지능/백엔드 등 6번 등장
  - `Do it! 자바 프로그래밍 입문` → 개발기초/백엔드/모바일 3번 등장
  - 가격/링크 하나 바꾸려면 모든 위치를 일일이 수정해야 함
- [ ] 도서 개수(`<span class="doenda-count">8권</span>`)가 수동 카운트 → 추가/삭제 시 동기화 누락 위험
- [ ] 표현 가능한 메타데이터가 5개(title, aladin, yes24, kyobo, cover)뿐 — 저자/출간일/ISBN/신간 여부 등 확장 불가

### 🟠 HTML / 마크업

- [ ] `onclick` 인라인 핸들러가 전반에 깔림 (CSP 적용 불가)
  - line 173~176 (탭 버튼)
  - line 218 등 (카드)
  - line 561~575 (모달)
- [ ] 시맨틱 부족 — 탭에 `role="tab"`, `aria-selected` 없음 (line 172~177)
- [ ] 모달에 `role="dialog"`, `aria-modal`, 포커스 트랩 없음 (line 561~575)
- [ ] 검색창 `<label>` 없음 (placeholder만 — 접근성 결손) (line 207)
- [ ] OG/Twitter URL이 fork 전 작성자(`marketer-H.github.io`) 그대로 (line 9~13)
- [ ] 한 도서 카드가 한 줄에 압축되어 git diff 가독성 0

### 🟠 CSS

- [ ] CSS 변수(디자인 토큰) 없음 — 브랜드 컬러 `#e8380d`가 10곳 이상 하드코딩
- [ ] 미디어 쿼리 부재 → 모바일에서 탭 4개·필터 11개가 압축되어 깨짐
- [ ] 카드 스타일 두 벌(`book-card`, `doenda-card`) + override 한 벌 = 사실상 3중 정의
  - `#doit-content .book-card`로 doenda 스타일을 도it에 덮어쓰기 (line 121~135)

### 🟠 JavaScript

- [ ] 전역 변수 3개(`activeSeries`, `activeDoitFilter`, `activeDoendaFilter`)로 상태 분산
- [ ] `applySearch()` 안에서 시리즈별로 `if/else if` 3분기 (line 652~688) — 같은 로직 반복
- [ ] 검색이 `textContent.includes(q)`만 사용
  - 띄어쓰기 민감 (`유니티 6` ≠ `유니티6`)
  - 한글 초성 검색 불가
  - 영문 가중치 없음
- [ ] URL 상태 동기화 없음 → 필터/검색 결과를 링크로 공유 불가
- [ ] 카테고리 키가 한국어 + HTML data 속성 + JS 필터 함수 인자에 흩어짐

### 🟡 외부 의존 / 안정성

- [ ] 도서 표지가 알라딘/예스24 CDN을 직접 참조 — CDN 정책 변경 시 일괄 깨짐
- [ ] 이미지 로드 실패 시 fallback 없음 (`no-cover` 클래스 정의됐지만 미사용)
- [ ] 외부 링크(알라딘/예스24/교보) 죽음 체크 자동화 없음

### 🟡 UX / 접근성

- [ ] 모달 키보드 포커스 트랩 없음 → Tab이 모달 밖으로 넘어감
- [ ] 모바일 반응형 약함 (고정 padding 32px, max-width 1400px만)
- [ ] 검색창에 디바운스 없음 (대량 카드 렌더 시 입력 지연 가능)

---

## 권장 리팩토링 단계 (우선순위순)

### Phase 1 — 데이터 분리 (ROI 최고, 외관 변화 0)

- [ ] `data/books.json` 작성 — 도서 마스터 (title, isbn, cover, links{aladin,yes24,kyobo}, authors, ...)
- [ ] `data/curriculum.json` 작성 — Do it! 카테고리 → 단계 → 도서 ID 배열 (참조만)
- [ ] `data/series.json` 작성 — 된다!/단행본 카테고리 매핑
- [ ] 기존 `index.html`에서 카드 마크업 제거 → 빈 컨테이너만 유지
- [ ] JSON fetch & 렌더링 로직 작성
- [ ] 도서 개수 자동 카운트

**기대 효과**: 신간 추가가 JSON 한 줄로 끝남. 중복 도서는 ID 참조로 단일화.

### Phase 2 — 파일 분리

- [ ] 디렉토리 구조 설계
  ```
  /
  ├── index.html         (구조만)
  ├── styles/
  │   ├── tokens.css     (CSS 변수)
  │   ├── layout.css
  │   └── components.css
  ├── scripts/
  │   ├── render.js
  │   ├── filter.js
  │   └── modal.js
  └── data/*.json
  ```
- [ ] CSS 변수(디자인 토큰) 추출 — 브랜드 컬러, 카드 크기, 간격
- [ ] 카드 컴포넌트 통합 (`book-card`/`doenda-card` → 단일 `card` + variant)

### Phase 3 — 인터랙션 정리

- [ ] 인라인 `onclick` 제거 → `addEventListener` + 이벤트 위임
- [ ] URL 쿼리 상태 동기화 (`?series=doit&cat=프런트엔드&q=react`)
- [ ] 모달 ARIA 속성 + 포커스 트랩
- [ ] 탭에 ARIA roles 적용

### Phase 4 — 품질

- [ ] 모바일 미디어 쿼리 추가
- [ ] 검색 정규화 (공백 제거, 영문 lowercase)
- [ ] 검색 디바운스
- [ ] 표지 이미지 fallback (`no-cover` 클래스 실제 활용)
- [ ] OG/메타 URL 현재 repo로 수정

### Phase 5 — 자동화 (선택)

- [ ] GitHub Actions: PR마다 JSON 스키마 검증
- [ ] 외부 링크 죽음 체크 워크플로우
- [ ] (필요 시) Vite 등 빌드 도입

---

## 작업 순서 추천

**A안 (점진적, 안전)**: Phase 1 → 동작 확인 → Phase 2 → Phase 3 → ...
**B안 (대규모 한 번)**: Phase 1+2를 묶어 PR 하나로 진행

> Phase 1만 완료해도 유지보수 비용이 가장 크게 줄어듦. 외관 변화 없이 내부만 정리되므로 PR 리뷰도 깔끔.
