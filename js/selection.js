/* Boulangerie Bread's — sélection du jour : produits, panier, réservation. */
(function () {
  'use strict';

  var store = window.BreadsStore;
  var grid = document.getElementById('selection-grid');
  if (!store || !grid) return;

  var emptyMsg = document.getElementById('selection-empty');
  var dateEl = document.getElementById('selection-date');
  var cartBar = document.getElementById('cart-bar');
  var cartSummary = document.getElementById('cart-summary');
  var cartOpen = document.getElementById('cart-open');
  var dialog = document.getElementById('reserve');
  var stepForm = document.getElementById('reserve-step-form');
  var stepDone = document.getElementById('reserve-step-done');
  var recapEl = document.getElementById('reserve-recap');
  var totalEl = document.getElementById('reserve-total');
  var form = document.getElementById('reserve-form');
  var pickupSelect = document.getElementById('rf-pickup');
  var errorEl = document.getElementById('reserve-error');

  var products = [];
  var cart = {}; /* { productId: qty } */

  /* ---------- Helpers ---------- */

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function cartItems() {
    var items = [];
    products.forEach(function (p) {
      if (cart[p.id]) items.push({ id: p.id, name: p.name, price: p.price, qty: cart[p.id] });
    });
    return items;
  }

  function cartCount() {
    return cartItems().reduce(function (n, it) { return n + it.qty; }, 0);
  }

  function cartTotal() {
    return cartItems().reduce(function (n, it) { return n + it.price * it.qty; }, 0);
  }

  /* ---------- Date du jour ---------- */

  if (dateEl) {
    var today = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
    dateEl.textContent = today.charAt(0).toUpperCase() + today.slice(1);
  }

  /* ---------- Rendu des produits ---------- */

  function render() {
    var visible = products.filter(function (p) { return p.visible; });

    /* purge le panier des produits retirés ou en rupture */
    Object.keys(cart).forEach(function (id) {
      var p = null;
      visible.forEach(function (v) { if (v.id === id) p = v; });
      if (!p) { delete cart[id]; return; }
      if (cart[id] > p.stock) cart[id] = p.stock;
      if (cart[id] <= 0) delete cart[id];
    });

    grid.innerHTML = visible.map(function (p) {
      var qty = cart[p.id] || 0;
      var out = p.stock <= 0;
      var low = !out && p.stock <= 5;
      var stockLabel = out ? 'Rupture de stock'
        : 'Il en reste ' + p.stock;
      var actions;
      if (out) {
        actions = '<span class="sel-out-label">En rupture de stock — revenez demain</span>';
      } else {
        actions =
          '<div class="qty" aria-label="Quantité pour ' + esc(p.name) + '">' +
            '<button type="button" data-minus="' + esc(p.id) + '" aria-label="Retirer un article"' + (qty <= 0 ? ' disabled' : '') + '>&minus;</button>' +
            '<span class="qty-num">' + qty + '</span>' +
            '<button type="button" data-plus="' + esc(p.id) + '" aria-label="Ajouter un article"' + (qty >= p.stock ? ' disabled' : '') + '>+</button>' +
          '</div>' +
          '<span class="sel-line">' + (qty > 0 ? store.formatPrice(p.price * qty) : '') + '</span>';
      }
      return '<li class="sel-card' + (out ? ' is-out' : '') + '">' +
        '<img src="' + esc(p.photo) + '" alt="' + esc(p.name) + '" loading="lazy" decoding="async">' +
        '<div class="sel-body">' +
          '<h3>' + esc(p.name) + '</h3>' +
          '<p class="sel-desc">' + esc(p.desc) + '</p>' +
          '<div class="sel-meta">' +
            '<span class="sel-price">' + store.formatPrice(p.price) + '</span>' +
            '<span class="sel-stock' + (low ? ' is-low' : '') + (out ? ' is-out' : '') + '">' + stockLabel + '</span>' +
          '</div>' +
          '<div class="sel-actions">' + actions + '</div>' +
        '</div>' +
      '</li>';
    }).join('');

    emptyMsg.hidden = visible.length > 0;
    renderCartBar();
  }

  function renderCartBar() {
    var count = cartCount();
    if (count === 0) {
      cartBar.hidden = true;
      document.body.classList.remove('has-cart-bar');
      return;
    }
    cartBar.hidden = false;
    document.body.classList.add('has-cart-bar');
    cartSummary.innerHTML = count + (count > 1 ? ' articles' : ' article') +
      ' &middot; <strong>' + store.formatPrice(cartTotal()) + '</strong>';
  }

  grid.addEventListener('click', function (e) {
    var plus = e.target.closest('[data-plus]');
    var minus = e.target.closest('[data-minus]');
    if (plus) {
      var id = plus.getAttribute('data-plus');
      cart[id] = (cart[id] || 0) + 1;
      render();
    } else if (minus) {
      var mid = minus.getAttribute('data-minus');
      cart[mid] = (cart[mid] || 0) - 1;
      if (cart[mid] <= 0) delete cart[mid];
      render();
    }
  });

  /* ---------- Créneaux de retrait (aujourd'hui + demain, 6h30–20h00) ---------- */

  function buildSlots() {
    var slots = [];
    var now = new Date();
    var dayFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

    [0, 1].forEach(function (offset) {
      var day = new Date(now);
      day.setDate(now.getDate() + offset);
      var start = new Date(day);
      start.setHours(6, 30, 0, 0);
      var end = new Date(day);
      end.setHours(20, 0, 0, 0);

      if (offset === 0) {
        /* premier créneau : dans 30 min minimum, arrondi au quart d'heure */
        var min = new Date(now.getTime() + 30 * 60000);
        if (min > start) {
          start = min;
          var m = start.getMinutes();
          start.setMinutes(m + ((15 - (m % 15)) % 15), 0, 0);
        }
      }

      for (var t = new Date(start); t <= end; t = new Date(t.getTime() + 30 * 60000)) {
        var time = ('0' + t.getHours()).slice(-2) + 'h' + ('0' + t.getMinutes()).slice(-2);
        var prefix = offset === 0 ? 'Aujourd’hui' : 'Demain';
        var label = prefix + ' · ' + time;
        var dayLabel = dayFmt.format(t);
        slots.push({ label: label, value: dayLabel + ' à ' + time });
      }
    });
    return slots;
  }

  /* ---------- Dialog de réservation ---------- */

  function openReserve() {
    var items = cartItems();
    if (!items.length) return;

    recapEl.innerHTML = items.map(function (it) {
      return '<li><span>' + it.qty + ' × ' + esc(it.name) + '</span><span>' +
        store.formatPrice(it.price * it.qty) + '</span></li>';
    }).join('');
    totalEl.textContent = store.formatPrice(cartTotal());

    pickupSelect.innerHTML = '<option value="" disabled selected>Choisir un créneau…</option>' +
      buildSlots().map(function (s) {
        return '<option value="' + esc(s.value) + '">' + esc(s.label) + '</option>';
      }).join('');

    errorEl.hidden = true;
    stepForm.hidden = false;
    stepDone.hidden = true;
    dialog.showModal();
  }

  cartOpen.addEventListener('click', openReserve);
  document.getElementById('reserve-close').addEventListener('click', function () { dialog.close(); });
  document.getElementById('reserve-done-close').addEventListener('click', function () { dialog.close(); });
  dialog.addEventListener('click', function (e) {
    if (e.target === dialog) dialog.close();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errorEl.hidden = true;

    var order = {
      customer: {
        name: form.name.value.trim(),
        phone: form.phone.value.trim(),
        email: form.email.value.trim()
      },
      items: cartItems(),
      pickup: pickupSelect.value,
      note: form.note.value.trim()
    };

    store.createOrder(order).then(function (saved) {
      cart = {};
      form.reset();
      document.getElementById('done-ref').textContent = saved.ref;
      document.getElementById('done-summary').textContent =
        saved.items.reduce(function (n, it) { return n + it.qty; }, 0) +
        ' article(s) · ' + store.formatPrice(saved.total) + ' — retrait : ' + saved.pickup + '.';
      stepForm.hidden = true;
      stepDone.hidden = false;
      refresh();
    }).catch(function (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
      refresh();
    });
  });

  /* ---------- Chargement & synchro ---------- */

  function refresh() {
    return store.getProducts().then(function (list) {
      products = list;
      render();
    });
  }

  store.onChange(refresh); /* maj en direct si l'admin modifie les produits */
  refresh();
})();
