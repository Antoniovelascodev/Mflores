/* =========================================================
   Miraflores Golf · Maqueta de demostración
   JavaScript sin dependencias (vanilla ES2020)
   Requiere translations.js (window.LANGS y window.I18N)
   ========================================================= */
(() => {
  'use strict';

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } },
  };

  /* ---------------------------------------------------------
     1. Idiomas
        - El español es el texto del propio HTML.
        - El resto sale de window.I18N[código][clave].
     --------------------------------------------------------- */
  const LANGS = window.LANGS || [{ code: 'es', name: 'Español', flag: 'es', group: '.', html: 'es' }];
  const I18N = window.I18N || {};
  const byCode = Object.fromEntries(LANGS.map((l) => [l.code, l]));
  let lang = 'es';

  // Guardamos el texto original (español) de cada elemento traducible
  const textEls = $$('[data-i18n]').map((el) => ({ el, key: el.dataset.i18n, es: el.textContent }));
  const attrEls = $$('[data-i18n-attr]').flatMap((el) =>
    el.dataset.i18nAttr.split(',').map((pair) => {
      const [attr, key] = pair.split(':').map((s) => s.trim());
      return { el, attr, key, es: el.getAttribute(attr) ?? '' };
    }));
  const titleEs = document.title;

  const tr = (key, es) => {
    if (lang === 'es') return es;
    return (I18N[lang] && I18N[lang][key]) ?? (I18N.en && I18N.en[key]) ?? es;
  };

  // Separador de miles propio de cada idioma (es-ES no agrupa los números de 4 cifras)
  const fmtNum = (n, plain) => (plain ? String(n) : String(n).replace(/\B(?=(\d{3})+(?!\d))/g, byCode[lang].group));

  // Selector con banderas (listbox accesible)
  const langBox = $('#lang');
  const langBtn = $('#langBtn');
  const langList = $('#langList');
  const langFlag = $('#langFlag');
  const langCur = $('#langCur');

  langList.innerHTML = LANGS.map((l) => `
    <li role="option" id="lang-opt-${l.code}" data-code="${l.code}" lang="${l.html}" aria-selected="false" class="lang__opt">
      <svg class="flag" aria-hidden="true"><use href="#flag-${l.flag}"/></svg>
      <span class="lang__name">${l.name}</span>
      <svg class="icon lang__tick" aria-hidden="true"><use href="#i-check"/></svg>
    </li>`).join('');
  const langOpts = $$('.lang__opt', langList);
  let activeIdx = 0;

  const setActiveOpt = (i) => {
    activeIdx = (i + langOpts.length) % langOpts.length;
    langOpts.forEach((o, n) => o.classList.toggle('is-active', n === activeIdx));
    langList.setAttribute('aria-activedescendant', langOpts[activeIdx].id);
    langOpts[activeIdx].scrollIntoView({ block: 'nearest' });
  };
  const openLang = () => {
    langList.hidden = false;
    langBtn.setAttribute('aria-expanded', 'true');
    setActiveOpt(LANGS.findIndex((l) => l.code === lang));
    langList.focus({ preventScroll: true });
  };
  const closeLang = (returnFocus = false) => {
    if (langList.hidden) return;
    langList.hidden = true;
    langBtn.setAttribute('aria-expanded', 'false');
    if (returnFocus) langBtn.focus();
  };

  langBtn.addEventListener('click', () => (langList.hidden ? openLang() : closeLang(true)));
  langBtn.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); openLang(); }
  });
  langList.addEventListener('click', (e) => {
    const o = e.target.closest('.lang__opt'); if (!o) return;
    applyLang(o.dataset.code); closeLang(true);
  });
  langList.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setActiveOpt(activeIdx + 1); break;
      case 'ArrowUp': e.preventDefault(); setActiveOpt(activeIdx - 1); break;
      case 'Home': e.preventDefault(); setActiveOpt(0); break;
      case 'End': e.preventDefault(); setActiveOpt(langOpts.length - 1); break;
      case 'Enter': case ' ': e.preventDefault(); applyLang(langOpts[activeIdx].dataset.code); closeLang(true); break;
      case 'Escape': e.preventDefault(); closeLang(true); break;
      case 'Tab': closeLang(false); break;
      default: {
        // Búsqueda por primera letra
        const ch = e.key.length === 1 ? e.key.toLowerCase() : '';
        if (ch) { const i = LANGS.findIndex((l, n) => n > activeIdx && l.name.toLowerCase().startsWith(ch)); const j = i >= 0 ? i : LANGS.findIndex((l) => l.name.toLowerCase().startsWith(ch)); if (j >= 0) setActiveOpt(j); }
      }
    }
  });
  document.addEventListener('pointerdown', (e) => { if (!langBox.contains(e.target)) closeLang(false); });

  function applyLang(code, persist = true) {
    if (!byCode[code]) code = 'es';
    lang = code;
    const meta = byCode[code];
    root.lang = meta.html;
    root.dataset.lang = code;

    textEls.forEach(({ el, key, es }) => { el.textContent = tr(key, es); });
    attrEls.forEach(({ el, attr, key, es }) => { el.setAttribute(attr, tr(key, es)); });
    document.title = tr('title', titleEs);

    // Botón y lista del selector
    langFlag.setAttribute('href', `#flag-${meta.flag}`);
    langCur.textContent = meta.name;
    langCur.lang = meta.html;
    langOpts.forEach((o) => {
      const on = o.dataset.code === code;
      o.setAttribute('aria-selected', String(on));
      o.classList.toggle('is-selected', on);
    });

    // Cifras con el separador de miles del idioma
    $$('[data-count]').forEach((el) => { el.textContent = fmtNum(Number(el.dataset.count), 'plain' in el.dataset); });

    if (persist) store.set('mg-lang', code);
    updateTrack();
    if (typeof scheduleNavCheck === 'function') scheduleNavCheck();   // los textos cambian de longitud
  }

  const detectLang = () => {
    const saved = store.get('mg-lang');
    if (saved && byCode[saved]) return saved;
    const prefs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'es']);
    for (const p of prefs) {
      let c = String(p).toLowerCase().split('-')[0];
      if (c === 'nb' || c === 'nn') c = 'no';
      if (byCode[c]) return c;
    }
    return 'es';
  };

  /* ---------------------------------------------------------
     2. Accesibilidad: tamaño de texto
     --------------------------------------------------------- */
  const setSize = (s) => {
    root.dataset.size = s;
    $$('[data-size-set]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sizeSet === String(s))));
    store.set('mg-size', s);
    if (typeof scheduleNavCheck === 'function') scheduleNavCheck();   // el texto ampliado puede no caber en la cabecera
  };
  $$('[data-size-set]').forEach((b) => b.addEventListener('click', () => setSize(b.dataset.sizeSet)));

  /* ---------------------------------------------------------
     3. Cabecera y menú móvil
     --------------------------------------------------------- */
  const header = $('#header');
  const nav = $('#nav');
  const menuBtn = $('#menuBtn');
  const setMenu = (open) => {
    // La cabecera es "sticky": al abrir el menú desde arriba la fijamos para que el botón de cierre quede visible
    const bar = $('.topbar');
    if (open && window.scrollY < bar.offsetHeight) window.scrollTo(0, bar.offsetHeight);
    nav.classList.toggle('is-open', open);
    header.classList.toggle('menu-open', open);
    document.body.classList.toggle('no-scroll', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    $('[data-open]', menuBtn).toggleAttribute('hidden', open);   // los <svg> no tienen la propiedad .hidden
    $('[data-close]', menuBtn).toggleAttribute('hidden', !open);
  };
  menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); menuBtn.focus(); }
  });
  // Menú compacto: se activa en pantallas pequeñas o cuando la cabecera no cabe
  // (idiomas con textos largos o texto ampliado).
  const headerInner = $('.header__inner');
  let navRaf = 0;
  const checkNav = () => {
    let tooWide = window.innerWidth <= 1180;
    root.classList.add('nav-switching');                     // evita que el menú se deslice al cambiar de modo
    if (!tooWide) {
      root.classList.remove('nav-compact');                  // medimos en modo escritorio
      tooWide = headerInner.scrollWidth > headerInner.clientWidth + 1;
    }
    root.classList.toggle('nav-compact', tooWide);
    if (!tooWide && nav.classList.contains('is-open')) setMenu(false);
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('nav-switching')));
  };
  const scheduleNavCheck = () => { cancelAnimationFrame(navRaf); navRaf = requestAnimationFrame(checkNav); };
  window.addEventListener('resize', scheduleNavCheck);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleNavCheck);

  const fab = $('#fab');
  const hero = $('#inicio');
  const booking = $('#reservas');
  const onScroll = () => {
    header.classList.toggle('is-stuck', window.scrollY > 10);
    const past = window.scrollY > hero.offsetHeight * 0.7;
    const b = booking.getBoundingClientRect();
    const inBooking = b.top < window.innerHeight * 0.5 && b.bottom > 0;
    fab.classList.toggle('is-visible', past && !inBooking);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Resalta en el menú la sección visible
  const links = $$('.nav__list a');
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${en.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach((a) => { const s = $(a.getAttribute('href')); if (s) spy.observe(s); });

  /* ---------------------------------------------------------
     4. Carrusel de servicios (scroll-snap + flechas)
     --------------------------------------------------------- */
  const track = $('#servTrack');
  const prev = $('#servPrev'), next = $('#servNext'), bar = $('#servBar');
  const stepSize = () => { const c = track.querySelector('.card'); return c ? c.getBoundingClientRect().width + 24 : 300; };
  function updateTrack() {
    const max = track.scrollWidth - track.clientWidth;
    prev.disabled = track.scrollLeft <= 4;
    next.disabled = track.scrollLeft >= max - 4;
    const ratio = Math.max((track.clientWidth / track.scrollWidth) * 100, 12);
    bar.style.width = `${ratio}%`;
    bar.style.marginLeft = `${(max > 0 ? track.scrollLeft / max : 0) * (100 - ratio)}%`;
  }
  const scrollTrack = (dir) => track.scrollBy({ left: dir * stepSize(), behavior: reduceMotion ? 'auto' : 'smooth' });
  prev.addEventListener('click', () => scrollTrack(-1));
  next.addEventListener('click', () => scrollTrack(1));
  track.addEventListener('scroll', () => requestAnimationFrame(updateTrack), { passive: true });
  window.addEventListener('resize', updateTrack);
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); scrollTrack(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); scrollTrack(-1); }
  });
  // Arrastrar con el ratón (escritorio)
  let drag = null;
  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.target.closest('a,button')) return;
    drag = { x: e.clientX, left: track.scrollLeft, moved: false };
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 4 && !drag.moved) { drag.moved = true; track.style.scrollSnapType = 'none'; track.style.scrollBehavior = 'auto'; track.style.cursor = 'grabbing'; }
    if (drag.moved) track.scrollLeft = drag.left - dx;
  });
  window.addEventListener('pointerup', () => {
    if (!drag) return;
    drag = null; track.style.scrollSnapType = ''; track.style.scrollBehavior = ''; track.style.cursor = '';
  });

  /* ---------------------------------------------------------
     5. Aparición al hacer scroll y contadores
     --------------------------------------------------------- */
  const animateCount = (el) => {
    const end = Number(el.dataset.count), plain = 'plain' in el.dataset;
    el.dataset.done = '1';
    if (reduceMotion) { el.textContent = fmtNum(end, plain); return; }
    const t0 = performance.now(), dur = 1400;
    const tick = (now) => {
      const p = Math.min((now - t0) / dur, 1), eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmtNum(Math.round(end * eased), plain);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-in');
      io.unobserve(en.target);
      $$('[data-count]', en.target).forEach(animateCount);
    });
  }, { threshold: 0.15 });
  $$('.reveal').forEach((el) => io.observe(el));

  /* ---------------------------------------------------------
     6. Galería con visor (lightbox)
     --------------------------------------------------------- */
  const lb = $('#lightbox'), lbImg = $('#lbImg'), lbCap = $('#lbCap');
  const gItems = $$('.gallery__grid button');
  let gi = 0, opener = null;
  const showG = (i) => {
    gi = (i + gItems.length) % gItems.length;
    const btn = gItems[gi], im = $('img', btn);
    lbImg.src = btn.dataset.full; lbImg.alt = im.alt; lbCap.textContent = im.alt;
  };
  gItems.forEach((b, i) => b.addEventListener('click', () => { opener = b; showG(i); lb.showModal(); document.body.classList.add('no-scroll'); }));
  const closeLb = () => lb.close();
  lb.addEventListener('close', () => { document.body.classList.remove('no-scroll'); lbImg.removeAttribute('src'); if (opener) opener.focus(); });
  $('#lbClose').addEventListener('click', closeLb);
  $('#lbPrev').addEventListener('click', () => showG(gi - 1));
  $('#lbNext').addEventListener('click', () => showG(gi + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb) closeLb(); });
  lb.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') showG(gi - 1); if (e.key === 'ArrowRight') showG(gi + 1); });

  /* ---------------------------------------------------------
     7. Formularios de contacto y boletín (solo demostración)
     --------------------------------------------------------- */
  const demoForm = (formSel, okSel) => {
    const f = $(formSel), ok = $(okSel);
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!f.checkValidity()) { f.reportValidity(); return; }
      ok.hidden = false; f.reset();
    });
  };
  demoForm('#contactForm', '#contactOk');
  demoForm('#newsForm', '#newsOk');

  /* ---------------------------------------------------------
     8. Arranque
     --------------------------------------------------------- */
  const savedSize = store.get('mg-size'); if (savedSize) setSize(savedSize);
  applyLang(detectLang(), false);
  updateTrack();
})();
