(async () => {
  const [books, catalog, events, popup] = await Promise.all([
    fetch('data/books.json').then(r => r.json()),
    fetch('data/catalog.json').then(r => r.json()),
    fetch('data/events.json').then(r => r.json()).catch(() => []),
    fetch('data/popup.json').then(r => r.json()).catch(() => null)
  ]);

  const state = {
    series: 'doit',
    filters: { doit: 'all', doenda: 'all' },
    query: ''
  };

  const $tabs    = document.getElementById('series-tabs');
  const $filters = document.getElementById('filters');
  const $content = document.getElementById('series-content');
  const $search  = document.getElementById('search');
  const $noResult = document.getElementById('no-result');
  const $overlay = document.getElementById('modal-overlay');

  // 검색 정규화: 소문자 + 공백 제거 ("유니티 6" === "유니티6")
  const normalize = s => s.toLowerCase().replace(/\s+/g, '');

  // 오늘 날짜(로컬) 기준 이벤트 종료 여부 — endDate 당일부터 종료
  const _now = new Date();
  const todayStr = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;
  const isEnded = e => !!(e.endDate && todayStr >= e.endDate);

  // ===== 카드 생성 =====
  function createCard(bookId) {
    const book = books[bookId];
    if (!book) return null;
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.bookId = bookId;
    card.dataset.title = normalize(book.title);

    const img = document.createElement('img');
    img.src = book.cover;
    img.alt = book.title;
    img.loading = 'lazy';

    const title = document.createElement('div');
    title.className = 'card-title';
    title.textContent = book.title;

    card.append(img, title);
    card.addEventListener('click', () => openModal(book));
    return card;
  }

  // ===== 카테고리 섹션 생성 =====
  function createCategorySection(cat) {
    const section = document.createElement('div');
    section.className = 'section';
    section.dataset.categoryId = cat.id;

    const header = document.createElement('div');
    header.className = 'section-header';
    const h2 = document.createElement('h2');
    h2.textContent = `${cat.icon} ${cat.name}`;
    const count = document.createElement('span');
    count.className = 'section-count';
    count.textContent = `${cat.books.length}권`;
    header.append(h2, count);

    const grid = document.createElement('div');
    grid.className = 'card-grid';
    cat.books.forEach(id => {
      const card = createCard(id);
      if (card) grid.appendChild(card);
    });

    section.append(header, grid);
    return section;
  }

  // ===== 필터 렌더 =====
  function renderFilters() {
    $filters.innerHTML = '';
    if (state.series === 'standalone') {
      $filters.style.display = 'none';
      return;
    }
    $filters.style.display = '';
    const cats = catalog[state.series];
    const activeFilter = state.filters[state.series];

    const allBtn = document.createElement('button');
    allBtn.className = 'filter-btn' + (activeFilter === 'all' ? ' active' : '');
    allBtn.textContent = '전체';
    allBtn.addEventListener('click', () => setFilter('all'));
    $filters.appendChild(allBtn);

    cats.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'filter-btn' + (activeFilter === cat.id ? ' active' : '');
      btn.textContent = cat.name;
      btn.addEventListener('click', () => setFilter(cat.id));
      $filters.appendChild(btn);
    });
  }

  // ===== 컨텐츠 렌더 =====
  function renderContent() {
    $content.innerHTML = '';
    if (state.series === 'standalone') {
      // 단행본은 카테고리 없는 단일 그리드 (가짜 섹션으로 헤더 통일)
      const section = createCategorySection({
        id: '_standalone',
        icon: '📚',
        name: '단행본',
        books: catalog.standalone
      });
      $content.appendChild(section);
      return;
    }
    const cats = catalog[state.series];
    cats.forEach(cat => $content.appendChild(createCategorySection(cat)));
  }

  // ===== 이벤트 카드 / 컨텐츠 =====
  function createEventCard(evt) {
    const ended = isEnded(evt);
    const card = document.createElement('a');
    card.className = 'event-card' + (ended ? ' ended' : '');
    card.href = evt.link || '#';
    card.target = '_blank';
    card.rel = 'noopener';
    const poster = document.createElement('div');
    poster.className = 'event-card-poster';
    if (evt.cover) {
      poster.classList.add('has-cover');
      const img = document.createElement('img');
      img.className = 'event-book-cover';
      img.src = evt.cover;
      img.alt = evt.title;
      poster.appendChild(img);
    }
    const body = document.createElement('div');
    body.className = 'event-card-body';
    const title = document.createElement('div');
    title.className = 'event-card-title';
    title.textContent = evt.title;
    const period = document.createElement('div');
    period.className = 'event-card-period';
    period.textContent = ended ? (evt.endedLabel || '종료된 이벤트') : (evt.period || '').replace(/^📅\s*/, '');
    body.append(title, period);
    card.append(poster, body);
    return card;
  }

  function renderEventContent() {
    $content.innerHTML = '';
    const section = document.createElement('div');
    section.className = 'section';
    const header = document.createElement('div');
    header.className = 'section-header';
    const h2 = document.createElement('h2');
    h2.textContent = '🎉 진행 중인 이벤트';
    const count = document.createElement('span');
    count.className = 'section-count';
    count.textContent = `${events.length}건`;
    header.append(h2, count);
    const grid = document.createElement('div');
    grid.className = 'card-grid event-grid';
    if (events.length) {
      events.forEach(e => grid.appendChild(createEventCard(e)));
    } else {
      const empty = document.createElement('p');
      empty.className = 'event-empty';
      empty.textContent = '진행 중인 이벤트가 없습니다.';
      grid.appendChild(empty);
    }
    section.append(header, grid);
    $content.appendChild(section);
  }

  // ===== 시리즈 탭 =====
  function setSeries(series) {
    state.series = series;
    state.query = '';
    $search.value = '';
    [...$tabs.querySelectorAll('.series-btn')].forEach(btn => {
      btn.classList.toggle('active', btn.dataset.series === series);
    });
    const $searchWrap = document.querySelector('.search-wrap');
    if (series === 'event') {
      $filters.style.display = 'none';
      if ($searchWrap) $searchWrap.style.display = 'none';
      renderEventContent();
      $noResult.style.display = 'none';
      return;
    }
    if ($searchWrap) $searchWrap.style.display = '';
    renderFilters();
    renderContent();
    applySearchAndFilter();
  }

  // ===== 필터 =====
  function setFilter(categoryId) {
    state.filters[state.series] = categoryId;
    renderFilters();
    applySearchAndFilter();
  }

  // ===== 검색 + 필터 적용 =====
  function applySearchAndFilter() {
    const q = normalize(state.query);
    const activeFilter = state.series === 'standalone' ? 'all' : state.filters[state.series];
    let anyVisible = false;

    [...$content.querySelectorAll('.section')].forEach(section => {
      const catId = section.dataset.categoryId;
      const catMatch = activeFilter === 'all' || catId === activeFilter;
      if (!catMatch) { section.style.display = 'none'; return; }

      if (!q) {
        section.style.display = '';
        section.querySelectorAll('.card').forEach(c => c.style.display = '');
        anyVisible = true;
        return;
      }

      let sectionHasMatch = false;
      section.querySelectorAll('.card').forEach(card => {
        const match = card.dataset.title.includes(q);
        card.style.display = match ? '' : 'none';
        if (match) sectionHasMatch = true;
      });
      section.style.display = sectionHasMatch ? '' : 'none';
      if (sectionHasMatch) anyVisible = true;
    });

    $noResult.style.display = anyVisible ? 'none' : '';
  }

  // ===== 모달 =====
  function openModal(book) {
    document.getElementById('modal-title').textContent = book.title;
    const $desc = document.getElementById('modal-desc');
    if (book.description) { $desc.textContent = book.description; $desc.style.display = ''; }
    else { $desc.textContent = ''; $desc.style.display = 'none'; }
    const $preview = document.getElementById('btn-preview');
    if (book.previewUrl) { $preview.href = book.previewUrl; $preview.style.display = ''; }
    else { $preview.removeAttribute('href'); $preview.style.display = 'none'; }
    const setBtn = (id, url) => {
      const btn = document.getElementById(id);
      if (url) { btn.href = url; btn.classList.remove('disabled'); btn.style.pointerEvents = ''; }
      else     { btn.removeAttribute('href'); btn.classList.add('disabled'); btn.style.pointerEvents = 'none'; }
    };
    setBtn('btn-aladin', book.links.aladin);
    setBtn('btn-yes24',  book.links.yes24);
    setBtn('btn-kyobo',  book.links.kyobo);
    $overlay.classList.add('open');
  }
  function closeModal() { $overlay.classList.remove('open'); }
  $overlay.addEventListener('click', e => { if (e.target === $overlay) closeModal(); });
  document.getElementById('modal-close').addEventListener('click', closeModal);

  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // ===== 이벤트 배너 (진행 중 이벤트 롤링 캐러셀) =====
  const $banner = document.getElementById('event-banner');
  const bannerEvents = events.filter(e => !isEnded(e) && e.link);
  if (bannerEvents.length) {
    const $track = document.getElementById('eb-track');
    const $dots = document.getElementById('eb-dots');

    function goSlide(n, manual) {
      idx = (n + bannerEvents.length) % bannerEvents.length;
      $track.style.transform = `translateX(-${idx * 100}%)`;
      [...$dots.children].forEach((d, i) => d.classList.toggle('active', i === idx));
      if (manual) restart();
    }

    bannerEvents.forEach((e, i) => {
      const slide = document.createElement('a');
      slide.className = 'eb-slide';
      slide.href = e.link;
      slide.target = '_blank';
      slide.rel = 'noopener';
      const text = document.createElement('span');
      text.className = 'eb-text';
      const strong = document.createElement('strong');
      strong.textContent = e.title;
      const sub = document.createElement('span');
      sub.textContent = e.bannerSub || e.period || '';
      text.append(strong, sub);
      const cta = document.createElement('span');
      cta.className = 'eb-cta';
      cta.textContent = '자세히 보기 →';
      slide.append(text, cta);
      $track.appendChild(slide);
      if (bannerEvents.length > 1) {
        const dot = document.createElement('button');
        dot.className = 'eb-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', `이벤트 ${i + 1}`);
        dot.addEventListener('click', () => goSlide(i, true));
        $dots.appendChild(dot);
      }
    });
    $banner.hidden = false;

    let idx = 0, timer = null;
    function start() {
      clearInterval(timer);
      if (bannerEvents.length > 1) timer = setInterval(() => goSlide(idx + 1), 3000);
    }
    function restart() { start(); }
    start();
    $banner.addEventListener('mouseenter', () => clearInterval(timer));
    $banner.addEventListener('mouseleave', start);
  }

  // ===== 교강사 카톡방 팝업 (오늘 하루 보지 않기 = 그날 숨김) =====
  const POPUP_KEY = 'easyspub_popup_hide';
  if (popup && popup.enabled && popup.link && popup.link.indexOf('REPLACE_ME') === -1
      && localStorage.getItem(POPUP_KEY) !== todayStr) {
    const $po = document.getElementById('popup-overlay');
    document.getElementById('popup-emoji').textContent = popup.emoji || '💬';
    document.getElementById('popup-title').textContent = popup.title || '';
    document.getElementById('popup-text').textContent = popup.text || '';
    const $pl = document.getElementById('popup-link');
    $pl.href = popup.link;
    $pl.textContent = popup.buttonText || '입장하기';
    const closePopup = () => $po.classList.remove('open');
    document.getElementById('popup-x').addEventListener('click', closePopup);
    document.getElementById('popup-dismiss').addEventListener('click', () => {
      localStorage.setItem(POPUP_KEY, todayStr);
      closePopup();
    });
    $po.addEventListener('click', e => { if (e.target === $po) closePopup(); });
    $po.classList.add('open');
  }

  // ===== 이벤트 바인딩 =====
  $tabs.addEventListener('click', e => {
    const btn = e.target.closest('.series-btn[data-series]');
    if (btn) setSeries(btn.dataset.series);
  });
  $search.addEventListener('input', e => {
    state.query = e.target.value;
    applySearchAndFilter();
  });

  // ===== 마우스 드래그 가로 스크롤 (PC) =====
  // 터치는 네이티브 스크롤을 쓰므로 마우스일 때만 동작시킴
  function enableDragScroll(el) {
    let isDown = false, moved = false, startX = 0, startScroll = 0;
    el.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse') return;
      isDown = true; moved = false;
      startX = e.pageX; startScroll = el.scrollLeft;
    });
    el.addEventListener('pointermove', e => {
      if (!isDown) return;
      const dx = e.pageX - startX;
      if (Math.abs(dx) > 3) moved = true;
      el.scrollLeft = startScroll - dx;
    });
    const end = () => { isDown = false; };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointerleave', end);
    // 드래그한 경우 직후의 칩 클릭(필터 선택)은 무시
    el.addEventListener('click', e => {
      if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; }
    }, true);
  }
  enableDragScroll($filters);
  enableDragScroll($tabs);

  // ===== 초기 렌더 =====
  setSeries('doit');
})();
