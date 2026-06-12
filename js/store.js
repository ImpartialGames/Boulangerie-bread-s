/* Boulangerie Bread's — couche de données « sélection du jour » & réservations.
   Implémentation DÉMO : localStorage (les données restent dans CE navigateur).
   L'API est asynchrone (Promises) pour pouvoir remplacer ce fichier par un
   backend réel (Supabase, etc.) sans modifier selection.js ni admin.js. */
(function () {
  'use strict';

  var KEY_PRODUCTS = 'breads.products';
  var KEY_ORDERS = 'breads.orders';
  var KEY_REQUESTS = 'breads.requests';

  /* PIN d'accès à l'espace fournil — DÉMO uniquement.
     À remplacer par une vraie authentification avant mise en ligne. */
  var ADMIN_PIN = '1234';

  var SEED_PRODUCTS = [
    {
      id: 'baguette-tradition',
      name: 'Baguette de tradition',
      desc: 'Farine label rouge, fermentation lente.',
      price: 130,
      photo: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&h=450&q=70',
      stock: 40,
      visible: true
    },
    {
      id: 'miche-levain',
      name: 'Miche au levain',
      desc: 'Farine T80 meulée à la pierre, croûte épaisse.',
      price: 450,
      photo: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?auto=format&fit=crop&w=600&h=450&q=70',
      stock: 12,
      visible: true
    },
    {
      id: 'croissant',
      name: 'Croissant pur beurre',
      desc: 'Beurre AOP, feuilletage sur 24 heures.',
      price: 120,
      photo: 'https://images.unsplash.com/photo-1530610476181-d83430b64dcd?auto=format&fit=crop&w=600&h=450&q=70',
      stock: 30,
      visible: true
    },
    {
      id: 'pain-chocolat',
      name: 'Pain au chocolat',
      desc: 'Deux barres de chocolat noir 64 %.',
      price: 130,
      photo: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&h=450&q=70',
      stock: 30,
      visible: true
    },
    {
      id: 'tiramisu',
      name: 'Tiramisu maison',
      desc: 'Monté à la minute, cacao grand cru.',
      price: 480,
      photo: 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?auto=format&fit=crop&w=600&h=450&q=70',
      stock: 8,
      visible: true
    },
    {
      id: 'macarons-6',
      name: 'Macarons — boîte de 6',
      desc: 'Parfums de saison, coques croquantes.',
      price: 900,
      photo: 'https://images.unsplash.com/photo-1569864358642-9d1684040f43?auto=format&fit=crop&w=600&h=450&q=70',
      stock: 10,
      visible: true
    }
  ];

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function resolve(value) {
    return Promise.resolve(value);
  }

  function ensureSeed() {
    if (!localStorage.getItem(KEY_PRODUCTS)) {
      write(KEY_PRODUCTS, SEED_PRODUCTS);
    }
    if (!localStorage.getItem(KEY_ORDERS)) {
      write(KEY_ORDERS, []);
    }
  }

  function makeRef() {
    var base = Date.now().toString(36).slice(-4).toUpperCase();
    var rand = Math.floor(Math.random() * 1296).toString(36).toUpperCase();
    while (rand.length < 2) rand = '0' + rand;
    return 'BR-' + base + rand;
  }

  var euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

  window.BreadsStore = {

    formatPrice: function (cents) {
      return euro.format(cents / 100);
    },

    checkPin: function (pin) {
      return resolve(String(pin) === ADMIN_PIN);
    },

    /* ---------- Produits ---------- */

    getProducts: function () {
      ensureSeed();
      return resolve(read(KEY_PRODUCTS, []));
    },

    saveProduct: function (product) {
      ensureSeed();
      var products = read(KEY_PRODUCTS, []);
      var found = false;
      for (var i = 0; i < products.length; i++) {
        if (products[i].id === product.id) {
          products[i] = product;
          found = true;
          break;
        }
      }
      if (!found) products.push(product);
      write(KEY_PRODUCTS, products);
      return resolve(product);
    },

    deleteProduct: function (id) {
      var products = read(KEY_PRODUCTS, []).filter(function (p) { return p.id !== id; });
      write(KEY_PRODUCTS, products);
      return resolve(true);
    },

    /* ---------- Commandes / réservations ---------- */

    getOrders: function () {
      ensureSeed();
      return resolve(read(KEY_ORDERS, []));
    },

    /* Vérifie le stock, le décrémente et enregistre la réservation. */
    createOrder: function (data) {
      ensureSeed();
      var products = read(KEY_PRODUCTS, []);
      var byId = {};
      products.forEach(function (p) { byId[p.id] = p; });

      var i, item, product;
      for (i = 0; i < data.items.length; i++) {
        item = data.items[i];
        product = byId[item.id];
        if (!product || !product.visible) {
          return Promise.reject(new Error('« ' + item.name + ' » n’est plus disponible aujourd’hui.'));
        }
        if (product.stock < item.qty) {
          return Promise.reject(new Error('Il ne reste que ' + product.stock + ' « ' + product.name + ' ».'));
        }
      }

      var total = 0;
      for (i = 0; i < data.items.length; i++) {
        item = data.items[i];
        byId[item.id].stock -= item.qty;
        total += item.price * item.qty;
      }
      write(KEY_PRODUCTS, products);

      var order = {
        id: 'o' + Date.now() + Math.floor(Math.random() * 1000),
        ref: makeRef(),
        customer: data.customer,
        items: data.items,
        pickup: data.pickup,
        note: data.note || '',
        total: total,
        status: 'new', /* new → ready → done | cancelled */
        createdAt: new Date().toISOString()
      };
      var orders = read(KEY_ORDERS, []);
      orders.unshift(order);
      write(KEY_ORDERS, orders);
      return resolve(order);
    },

    /* Annuler restitue le stock. */
    setOrderStatus: function (id, status) {
      var orders = read(KEY_ORDERS, []);
      var order = null;
      for (var i = 0; i < orders.length; i++) {
        if (orders[i].id === id) { order = orders[i]; break; }
      }
      if (!order) return Promise.reject(new Error('Commande introuvable.'));

      if (status === 'cancelled' && order.status !== 'cancelled') {
        var products = read(KEY_PRODUCTS, []);
        order.items.forEach(function (item) {
          for (var j = 0; j < products.length; j++) {
            if (products[j].id === item.id) { products[j].stock += item.qty; break; }
          }
        });
        write(KEY_PRODUCTS, products);
      }

      order.status = status;
      write(KEY_ORDERS, orders);
      return resolve(order);
    },

    /* ---------- Demandes sur-mesure ---------- */

    getRequests: function () {
      return resolve(read(KEY_REQUESTS, []));
    },

    createRequest: function (data) {
      var request = {
        id: 'r' + Date.now() + Math.floor(Math.random() * 1000),
        ref: makeRef(),
        customer: data.customer,
        event: data.event,
        date: data.date,
        people: data.people || '',
        message: data.message,
        status: 'new', /* new → handled */
        createdAt: new Date().toISOString()
      };
      var requests = read(KEY_REQUESTS, []);
      requests.unshift(request);
      write(KEY_REQUESTS, requests);
      return resolve(request);
    },

    setRequestStatus: function (id, status) {
      var requests = read(KEY_REQUESTS, []);
      for (var i = 0; i < requests.length; i++) {
        if (requests[i].id === id) {
          requests[i].status = status;
          write(KEY_REQUESTS, requests);
          return resolve(requests[i]);
        }
      }
      return Promise.reject(new Error('Demande introuvable.'));
    },

    /* Notifie quand un autre onglet modifie les données (démo multi-onglets). */
    onChange: function (callback) {
      window.addEventListener('storage', function (e) {
        if (e.key === KEY_PRODUCTS || e.key === KEY_ORDERS || e.key === KEY_REQUESTS) callback();
      });
    }
  };
})();
