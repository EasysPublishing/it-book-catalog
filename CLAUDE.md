# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

이지스퍼블리싱 도서 목록을 보여주는 **순수 정적 웹사이트**입니다. 빌드 도구·프레임워크·패키지 매니저가 전혀 없고, 바닐라 HTML/CSS/JS로만 구성됩니다. `CNAME`(`it-book-catalog.easyspub.co.kr`)이 있는 것으로 보아 GitHub Pages로 커스텀 도메인 배포됩니다.

## 실행 / 개발

`app.js`가 `fetch()`로 JSON을 읽기 때문에 `file://`로 직접 열면 동작하지 않습니다. **로컬 정적 서버가 필요**합니다.

```bash
python -m http.server 8000   # → http://localhost:8000
```

빌드·린트·테스트 단계는 없습니다. 파일을 수정하고 브라우저를 새로고침하면 됩니다.

## 아키텍처

세 개의 표현 파일과 두 개의 데이터 파일로 나뉩니다.

- `index.html` — 정적 셸. 헤더, 시리즈 탭, 검색창, 서점 선택 모달의 빈 컨테이너만 존재. 필터·도서 카드는 모두 JS가 동적 생성.
- `styles/main.css` — 전체 스타일. Pretendard 폰트는 jsDelivr CDN에서 로드.
- `scripts/app.js` — 단일 IIFE. 두 JSON을 불러와 `state`(`series` / `filters` / `query`)를 기준으로 탭·필터·콘텐츠를 렌더하고, 검색·필터·모달·드래그 스크롤을 처리.

### 데이터 모델 (가장 중요)

데이터가 **2단으로 정규화**되어 있습니다. 이 관계를 이해하는 것이 핵심입니다.

- **`data/books.json`** — 도서 메타데이터 맵. `bookId`(예: `"Doit!점프투파이썬"`) → `{ title, cover, links: { aladin, yes24, kyobo } }`. 도서의 실제 정보는 **여기에만** 존재.
- **`data/catalog.json`** — 진열 구조. 최상위 키는 `doit` / `doenda` / `standalone` 세 시리즈.
  - `doit`, `doenda`: 카테고리 배열. 각 카테고리는 `{ id, name, icon, books: [bookId, ...] }`.
  - `standalone`: 카테고리 없이 `bookId` 배열만.
  - `books` 배열은 **`books.json`의 키를 참조**할 뿐 메타데이터를 담지 않음. 같은 `bookId`가 여러 카테고리에 중복 등장할 수 있음(의도된 설계).

`app.js`의 `createCard(bookId)`는 `books[bookId]`를 조회하며, 없으면 카드를 그리지 않고 건너뜁니다(`catalog.json`에 ID 오타가 있으면 조용히 누락됨).

### 새 도서를 추가하려면

두 파일을 모두 수정해야 합니다.

1. `data/books.json`에 `bookId` 항목 추가 (title, cover, 서점 링크).
2. `data/catalog.json`에서 진열할 시리즈/카테고리의 `books` 배열에 동일한 `bookId`를 추가.

두 곳의 `bookId` 문자열이 **정확히 일치**해야 합니다(공백·특수문자 포함).

## 동작상의 주의점

- **검색 정규화**: `normalize()`가 소문자화 + 모든 공백 제거를 수행하므로 `"유니티 6"`과 `"유니티6"`이 동일하게 매칭됩니다. 카드의 `data-title`도 정규화해 저장됩니다.
- **`standalone` 분기**: 단행본은 필터를 숨기고, 헤더 통일을 위해 `_standalone`이라는 가짜 카테고리 섹션으로 렌더됩니다.
- **드래그 스크롤**: 탭/필터 가로 스크롤은 마우스에서만 동작(`pointerType === 'mouse'`)하며, 드래그 직후의 클릭은 필터 오선택을 막기 위해 무시됩니다. 터치는 네이티브 스크롤을 사용.
- **OG/도메인 메타태그**: `index.html` 상단의 `og:*` / `twitter:*` URL은 커스텀 도메인 `it-book-catalog.easyspub.co.kr` 기준입니다. 도메인 변경 시 `CNAME`과 함께 갱신해야 합니다.
