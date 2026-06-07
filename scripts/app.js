(async () => {
  const [books, catalog] = await Promise.all([
    fetch('data/books.json').then(r => r.json()),
    fetch('data/catalog.json').then(r => r.json())
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

  // ===== 시리즈 탭 =====
  function setSeries(series) {
    state.series = series;
    state.query = '';
    $search.value = '';
    [...$tabs.querySelectorAll('.series-btn')].forEach(btn => {
      btn.classList.toggle('active', btn.dataset.series === series);
    });
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
