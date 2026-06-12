/* Boulangerie Bread's — espace fournil : produits du jour & réservations. */
(function () {
  'use strict';

  var store = window.BreadsStore;
  if (!store) return;

  var lockView = document.getElementById('admin-lock');
  var appView = document.getElementById('admin-app');
  var UNLOCK_KEY = 'breads.admin.unlocked';

  var STATUS_LABELS = {
    'new': 'Nouvelle',
    'ready': 'Préparée',
    'done': 'Retirée',
    'cancelled': 'Annulée'
  };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- Verrouillage (démo) ---------- */

  function showApp() {
    lockView.hidden = true;
    appView.hidden = false;
    renderAll();
  }

  if (sessionStorage.getItem(UNLOCK_KEY) === '1') {
    showApp();
  }

  document.getElementById('lock-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var pin = document.getElementById('lock-pin').value;
    store.checkPin(pin).then(function (ok) {
      if (ok) {
        sessionStorage.setItem(UNLOCK_KEY, '1');
        showApp();
      } else {
        document.getElementById('lock-error').hidden = false;
      }
    });
  });

  /* ---------- Onglets ---------- */

  var tabs = document.querySelectorAll('.admin-tab');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) {
        var active = t === tab;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      var current = tab.getAttribute('data-tab');
      ['orders', 'products', 'requests'].forEach(function (name) {
        document.getElementById('panel-' + name).hidden = name !== current;
      });
    });
  });

  /* ---------- Commandes ---------- */

  var ordersList = document.getElementById('orders-list');
  var ordersFilter = 'active';

  document.getElementById('orders-filter').addEventListener('click', function (e) {
    var chip = e.target.closest('.chip');
    if (!chip) return;
    ordersFilter = chip.getAttribute('data-filter');
    this.querySelectorAll('.chip').forEach(function (c) {
      c.classList.toggle('is-active', c === chip);
    });
    renderOrders();
  });

  var whenFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

  function orderActions(order) {
    if (order.status === 'new') {
      return '<button class="btn btn-solid btn-sm" type="button" data-status="ready" data-id="' + order.id + '">Marquer préparée</button>' +
             '<button class="btn btn-outline btn-sm" type="button" data-status="cancelled" data-id="' + order.id + '">Annuler</button>';
    }
    if (order.status === 'ready') {
      return '<button class="btn btn-solid btn-sm" type="button" data-status="done" data-id="' + order.id + '">Marquer retirée</button>' +
             '<button class="btn btn-outline btn-sm" type="button" data-status="cancelled" data-id="' + order.id + '">Annuler</button>';
    }
    return '';
  }

  function renderOrders() {
    store.getOrders().then(function (orders) {
      var newCount = orders.filter(function (o) { return o.status === 'new'; }).length;
      var badge = document.getElementById('orders-badge');
      badge.hidden = newCount === 0;
      badge.textContent = newCount;

      var shown = orders.filter(function (o) {
        var activeStatus = o.status === 'new' || o.status === 'ready';
        return ordersFilter === 'active' ? activeStatus : !activeStatus;
      });

      document.getElementById('orders-empty').hidden = shown.length > 0;

      ordersList.innerHTML = shown.map(function (o) {
        var items = o.items.map(function (it) {
          return '<li><span>' + it.qty + ' × ' + esc(it.name) + '</span><span>' +
            store.formatPrice(it.price * it.qty) + '</span></li>';
        }).join('');
        var contact = esc(o.customer.name) +
          ' · <a href="tel:' + esc(o.customer.phone.replace(/\s/g, '')) + '">' + esc(o.customer.phone) + '</a>' +
          (o.customer.email ? ' · ' + esc(o.customer.email) : '');
        return '<article class="order-card">' +
          '<div class="order-top">' +
            '<span class="order-ref">' + esc(o.ref) + '</span>' +
            '<span class="order-when">reçue le ' + whenFmt.format(new Date(o.createdAt)) + '</span>' +
            '<span class="order-status is-' + o.status + '">' + STATUS_LABELS[o.status] + '</span>' +
          '</div>' +
          '<p class="order-customer">' + contact + '</p>' +
          '<p class="order-pickup">Retrait&nbsp;: ' + esc(o.pickup) + '</p>' +
          '<ul class="order-items">' + items + '</ul>' +
          (o.note ? '<p class="order-note">«&nbsp;' + esc(o.note) + '&nbsp;»</p>' : '') +
          '<div class="order-bottom">' +
            '<p class="order-total">À encaisser&nbsp;: <strong>' + store.formatPrice(o.total) + '</strong></p>' +
            '<div class="order-actions">' + orderActions(o) + '</div>' +
          '</div>' +
        '</article>';
      }).join('');
    });
  }

  ordersList.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-status]');
    if (!btn) return;
    var status = btn.getAttribute('data-status');
    if (status === 'cancelled' && !window.confirm('Annuler cette réservation ? Le stock sera remis en vente.')) return;
    store.setOrderStatus(btn.getAttribute('data-id'), status).then(renderAll);
  });

  /* ---------- Demandes sur-mesure ---------- */

  var requestsList = document.getElementById('requests-list');
  var eventFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  function renderRequests() {
    store.getRequests().then(function (requests) {
      var newCount = requests.filter(function (r) { return r.status === 'new'; }).length;
      var badge = document.getElementById('requests-badge');
      badge.hidden = newCount === 0;
      badge.textContent = newCount;

      document.getElementById('requests-empty').hidden = requests.length > 0;

      requestsList.innerHTML = requests.map(function (r) {
        var contact = esc(r.customer.name) +
          ' · <a href="tel:' + esc(r.customer.phone.replace(/\s/g, '')) + '">' + esc(r.customer.phone) + '</a>' +
          (r.customer.email ? ' · ' + esc(r.customer.email) : '');
        var eventLine = esc(r.event) + ' — ' + eventFmt.format(new Date(r.date + 'T12:00:00')) +
          (r.people ? ' · ' + esc(r.people) + ' personnes' : '');
        var action = r.status === 'new'
          ? '<button class="btn btn-solid btn-sm" type="button" data-request-status="handled" data-id="' + r.id + '">Marquer traitée</button>'
          : '<button class="btn btn-outline btn-sm" type="button" data-request-status="new" data-id="' + r.id + '">Rouvrir</button>';
        return '<article class="order-card">' +
          '<div class="order-top">' +
            '<span class="order-ref">' + esc(r.ref) + '</span>' +
            '<span class="order-when">reçue le ' + whenFmt.format(new Date(r.createdAt)) + '</span>' +
            '<span class="order-status ' + (r.status === 'new' ? 'is-new' : 'is-done') + '">' +
              (r.status === 'new' ? 'Nouvelle' : 'Traitée') + '</span>' +
          '</div>' +
          '<p class="order-customer">' + contact + '</p>' +
          '<p class="order-pickup">' + eventLine + '</p>' +
          '<p class="order-note">«&nbsp;' + esc(r.message) + '&nbsp;»</p>' +
          '<div class="order-bottom">' +
            '<span></span>' +
            '<div class="order-actions">' + action + '</div>' +
          '</div>' +
        '</article>';
      }).join('');
    });
  }

  requestsList.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-request-status]');
    if (!btn) return;
    store.setRequestStatus(btn.getAttribute('data-id'), btn.getAttribute('data-request-status')).then(renderRequests);
  });

  /* ---------- Produits ---------- */

  var productsList = document.getElementById('products-list');
  var productDialog = document.getElementById('product-dialog');
  var productForm = document.getElementById('product-form');
  var productsCache = [];

  function renderProducts() {
    store.getProducts().then(function (products) {
      productsCache = products;
      productsList.innerHTML = products.map(function (p) {
        return '<article class="product-row' + (p.visible ? '' : ' is-hidden') + '">' +
          '<img src="' + esc(p.photo || 'assets/logo.webp') + '" alt="">' +
          '<div class="product-row-info">' +
            '<h3>' + esc(p.name) + ' <span class="product-row-price">' + store.formatPrice(p.price) + '</span></h3>' +
            '<p>' + esc(p.desc || '') + '</p>' +
          '</div>' +
          '<div class="product-row-controls">' +
            '<span class="stock-label">Stock</span>' +
            '<div class="qty">' +
              '<button type="button" data-stock="-1" data-id="' + p.id + '" aria-label="Diminuer le stock"' + (p.stock <= 0 ? ' disabled' : '') + '>&minus;</button>' +
              '<span class="qty-num">' + p.stock + '</span>' +
              '<button type="button" data-stock="1" data-id="' + p.id + '" aria-label="Augmenter le stock">+</button>' +
            '</div>' +
            '<label class="switch">' +
              '<input type="checkbox" data-visible="' + p.id + '"' + (p.visible ? ' checked' : '') + '>' +
              '<span class="switch-slider"></span> Visible' +
            '</label>' +
            '<button class="icon-btn" type="button" data-edit="' + p.id + '" aria-label="Modifier ' + esc(p.name) + '">' +
              '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/></svg>' +
            '</button>' +
            '<button class="icon-btn" type="button" data-delete="' + p.id + '" aria-label="Supprimer ' + esc(p.name) + '">' +
              '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2m-7 0 1 13h8l1-13"/></svg>' +
            '</button>' +
          '</div>' +
        '</article>';
      }).join('');
    });
  }

  function findProduct(id) {
    for (var i = 0; i < productsCache.length; i++) {
      if (productsCache[i].id === id) return productsCache[i];
    }
    return null;
  }

  productsList.addEventListener('click', function (e) {
    var stockBtn = e.target.closest('[data-stock]');
    var editBtn = e.target.closest('[data-edit]');
    var deleteBtn = e.target.closest('[data-delete]');

    if (stockBtn) {
      var p = findProduct(stockBtn.getAttribute('data-id'));
      if (!p) return;
      p.stock = Math.max(0, p.stock + parseInt(stockBtn.getAttribute('data-stock'), 10));
      store.saveProduct(p).then(renderProducts);
    } else if (editBtn) {
      openProductDialog(findProduct(editBtn.getAttribute('data-edit')));
    } else if (deleteBtn) {
      var dp = findProduct(deleteBtn.getAttribute('data-delete'));
      if (dp && window.confirm('Supprimer « ' + dp.name + ' » ?')) {
        store.deleteProduct(dp.id).then(renderProducts);
      }
    }
  });

  productsList.addEventListener('change', function (e) {
    var toggle = e.target.closest('[data-visible]');
    if (!toggle) return;
    var p = findProduct(toggle.getAttribute('data-visible'));
    if (!p) return;
    p.visible = toggle.checked;
    store.saveProduct(p).then(renderProducts);
  });

  function openProductDialog(product) {
    document.getElementById('product-dialog-title').textContent =
      product ? 'Modifier « ' + product.name + ' »' : 'Nouveau produit';
    productForm.id.value = product ? product.id : '';
    productForm.name.value = product ? product.name : '';
    productForm.desc.value = product ? product.desc : '';
    productForm.price.value = product ? (product.price / 100).toFixed(2) : '';
    productForm.stock.value = product ? product.stock : 10;
    productForm.photo.value = product ? product.photo : '';
    productForm.visible.checked = product ? product.visible : true;
    productDialog.showModal();
  }

  document.getElementById('product-add').addEventListener('click', function () {
    openProductDialog(null);
  });
  document.getElementById('product-dialog-close').addEventListener('click', function () {
    productDialog.close();
  });
  productDialog.addEventListener('click', function (e) {
    if (e.target === productDialog) productDialog.close();
  });

  function slugify(name) {
    return name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'produit';
  }

  productForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var id = productForm.id.value || (slugify(productForm.name.value) + '-' + Date.now().toString(36));
    var product = {
      id: id,
      name: productForm.name.value.trim(),
      desc: productForm.desc.value.trim(),
      price: Math.round(parseFloat(productForm.price.value) * 100),
      photo: productForm.photo.value.trim(),
      stock: Math.max(0, parseInt(productForm.stock.value, 10) || 0),
      visible: productForm.visible.checked
    };
    store.saveProduct(product).then(function () {
      productDialog.close();
      renderProducts();
    });
  });

  /* ---------- Rafraîchissement ---------- */

  function renderAll() {
    renderOrders();
    renderProducts();
    renderRequests();
  }

  store.onChange(renderAll); /* nouvelles commandes en direct (autre onglet) */
})();
