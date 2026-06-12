/* Boulangerie Bread's — interactions sobres (IntersectionObserver + rAF) */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Header : état au scroll ---------- */
  var header = document.getElementById('header');
  var lastHeaderState = false;
  function onScrollHeader() {
    var scrolled = window.scrollY > 32;
    if (scrolled !== lastHeaderState) {
      header.classList.toggle('scrolled', scrolled);
      lastHeaderState = scrolled;
    }
  }
  window.addEventListener('scroll', onScrollHeader, { passive: true });
  onScrollHeader();

  /* ---------- Apparitions au scroll ---------- */
  var revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- Avis : défilement continu ---------- */
  var reviewsMarquee = document.querySelector('.reviews-marquee');
  if (reviewsMarquee && !reduceMotion.matches) {
    reviewsMarquee.querySelectorAll('.reviews-track').forEach(function (track) {
      /* duplique les cartes pour une boucle sans couture (translateX -50%) */
      Array.prototype.slice.call(track.children).forEach(function (card) {
        var clone = card.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        track.appendChild(clone);
      });
      track.classList.add('is-looping');
    });
    reviewsMarquee.classList.add('is-looping');
  }

  /* ---------- Compteur animé (héro uniquement) ---------- */
  var counters = document.querySelectorAll('.counter');
  function animateCounter(el) {
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    if (reduceMotion.matches) { el.textContent = target; return; }
    var duration = 1400;
    var start = null;
    function tick(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 4); /* ease-out-quart */
      el.textContent = Math.round(eased * target);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  if ('IntersectionObserver' in window) {
    var counterObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { counterObserver.observe(el); });
  } else {
    counters.forEach(function (el) { el.textContent = el.getAttribute('data-count'); });
  }

  /* ---------- Parallaxe subtil (photo décalée, À propos) ---------- */
  var parallaxEl = document.querySelector('[data-parallax]');
  if (parallaxEl && !reduceMotion.matches) {
    var ticking = false;
    function updateParallax() {
      ticking = false;
      var rect = parallaxEl.getBoundingClientRect();
      var vh = window.innerHeight;
      if (rect.bottom < 0 || rect.top > vh) return;
      /* progression -1 → 1 selon la position dans le viewport */
      var progress = (rect.top + rect.height / 2 - vh / 2) / (vh / 2);
      var shift = Math.max(-1, Math.min(1, progress)) * -18;
      parallaxEl.style.transform = 'translateY(' + shift.toFixed(1) + 'px)';
    }
    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateParallax);
      }
    }, { passive: true });
    updateParallax();
  }

  /* ---------- Lightbox galerie ---------- */
  var lightbox = document.getElementById('lightbox');
  if (lightbox && typeof lightbox.showModal === 'function') {
    var lbImg = document.getElementById('lightbox-img');
    var lbCaption = document.getElementById('lightbox-caption');
    var items = Array.prototype.slice.call(document.querySelectorAll('[data-lightbox]'));
    var current = 0;

    function showSlide(index) {
      current = (index + items.length) % items.length;
      var item = items[current];
      lbImg.src = item.getAttribute('data-lightbox');
      lbImg.alt = item.getAttribute('data-caption') || '';
      lbCaption.textContent = item.getAttribute('data-caption') || '';
    }

    items.forEach(function (item, i) {
      item.addEventListener('click', function () {
        showSlide(i);
        lightbox.showModal();
      });
    });

    lightbox.querySelector('[data-lb-close]').addEventListener('click', function () {
      lightbox.close();
    });
    lightbox.querySelector('[data-lb-prev]').addEventListener('click', function () {
      showSlide(current - 1);
    });
    lightbox.querySelector('[data-lb-next]').addEventListener('click', function () {
      showSlide(current + 1);
    });

    lightbox.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') showSlide(current - 1);
      if (e.key === 'ArrowRight') showSlide(current + 1);
    });

    /* clic sur le fond = fermer */
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) lightbox.close();
    });

    lightbox.addEventListener('close', function () {
      lbImg.src = '';
    });
  }

  /* ---------- Mentions légales ---------- */
  var legal = document.getElementById('legal');
  var legalOpen = document.getElementById('legal-open');
  var legalClose = document.getElementById('legal-close');
  if (legal && typeof legal.showModal === 'function') {
    legalOpen.addEventListener('click', function () { legal.showModal(); });
    legalClose.addEventListener('click', function () { legal.close(); });
    legal.addEventListener('click', function (e) {
      if (e.target === legal) legal.close();
    });
  }
})();
