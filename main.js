/* ==========================================================================
   Dilip Fire Safety Engineers — site-wide JS
   Loaded on every page. Nothing here touches the contact form — that's
   handled separately in contact-form.js so form security logic stays
   isolated and easy to audit on its own.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {

  // ---- Footer year ----
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ---- Mobile hamburger menu ----
  var burger = document.getElementById('navBurger');
  var mobileMenu = document.getElementById('mobileMenu');
  if (burger && mobileMenu) {
    burger.addEventListener('click', function () {
      var isOpen = mobileMenu.classList.toggle('open');
      burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  // ---- Track every "call" link click as a conversion (if gtag is loaded) ----
  document.querySelectorAll('a[href^="tel:"]').forEach(function (link) {
    link.addEventListener('click', function () {
      if (typeof gtag === 'function') {
        gtag('event', 'call_click', { link_text: link.textContent.trim() });
      }
    });
  });

  // ---- Trust-partner logo strip: only auto-scroll once the row overflows ----
  (function () {
    var viewport = document.getElementById('partnersViewport');
    var track = document.getElementById('partnersTrack');
    if (!viewport || !track) return;

    function checkOverflow() {
      track.classList.remove('is-scrolling');
      track.style.transform = '';
      var overflowing = track.scrollWidth > viewport.clientWidth + 2;
      if (overflowing) {
        if (!track.dataset.duplicated) {
          track.innerHTML += track.innerHTML; // seamless loop content
          track.dataset.duplicated = 'true';
        }
        track.classList.add('is-scrolling');
      } else if (track.dataset.duplicated) {
        var originalCount = track.children.length / 2;
        while (track.children.length > originalCount) {
          track.removeChild(track.lastElementChild);
        }
        delete track.dataset.duplicated;
      }
    }

    var resizeTimer;
    window.addEventListener('load', checkOverflow);
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(checkOverflow, 200);
    });
    if (document.readyState === 'complete') checkOverflow();
  })();

  // ---- Gallery lightbox (only runs if the page has a #galColumns grid) ----
  (function () {
    var grid = document.getElementById('galColumns');
    var lightbox = document.getElementById('lightbox');
    if (!grid || !lightbox) return;
    var lightboxImg = document.getElementById('lightboxImg');
    var closeBtn = document.getElementById('lightboxClose');

    grid.addEventListener('click', function (e) {
      var img = e.target.closest('.gal-item img');
      if (!img) return;
      lightboxImg.src = img.src;
      lightbox.classList.add('open');
    });

    function closeLightbox() {
      lightbox.classList.remove('open');
      lightboxImg.src = '';
    }
    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeLightbox();
    });
  })();

  // ---- Catalog page: highlight the active category tab while scrolling ----
  (function () {
    var sections = document.querySelectorAll('.cat-section');
    var filterLinks = document.querySelectorAll('.filter-btn');
    if (!sections.length || !filterLinks.length) return;
    var map = {};
    filterLinks.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = map[entry.target.id];
        if (!link) return;
        if (entry.isIntersecting) {
          filterLinks.forEach(function (a) { a.classList.remove('active'); });
          link.classList.add('active');
        }
      });
    }, { rootMargin: '-40% 0px -50% 0px' });

    sections.forEach(function (s) { observer.observe(s); });
  })();

  // ---- Preselect the "Service Needed" dropdown when arriving from a
  //      catalog / service-page "Enquire" link with ?service=... ----
  (function () {
    var select = document.getElementById('service');
    if (!select) return;
    var params = new URLSearchParams(window.location.search);
    var wanted = params.get('service');
    if (!wanted) return;
    for (var i = 0; i < select.options.length; i++) {
      var opt = select.options[i];
      if (opt.value === wanted || opt.textContent.trim() === wanted) {
        select.value = opt.value;
        break;
      }
    }
  })();

});
