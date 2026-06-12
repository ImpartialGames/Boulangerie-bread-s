/* Boulangerie Bread's — demande sur-mesure : formulaire conversationnel (section #demande).
   Une question à la fois, navigation clavier (lettres, Entrée, flèches), barre de progression.
   Les réponses sont envoyées à BreadsStore.createRequest sous forme de paires question/réponse
   pour être relues telles quelles dans l'espace fournil. */
(function () {
  'use strict';

  var store = window.BreadsStore;
  var root = document.getElementById('convo');
  if (!store || !root) return;

  var stepsEl = document.getElementById('convo-steps');
  var footerEl = document.getElementById('convo-footer');
  var doneEl = document.getElementById('convo-done');
  var barFill = document.getElementById('convo-bar-fill');
  var progressLabel = document.getElementById('convo-progress-label');
  var prevBtn = document.getElementById('convo-prev');
  var nextBtn = document.getElementById('convo-next');

  var KEYS = 'ABCDEFGH';
  var OTHER = '__other__';

  var QUESTIONS = [
    {
      id: 'event', type: 'choices', multi: true,
      title: 'Bonjour ! Pour quel type d’événement souhaitez-vous une création pâtissière sur mesure ?',
      choices: ['Bûche Spéciale Noël 🎄🍫✨', 'Anniversaire', 'Mariage', 'Événement professionnel'],
      other: 'Autre (merci de préciser)'
    },
    {
      id: 'date', type: 'date',
      title: 'Quelle est la date prévue pour votre événement ? Combien de personnes attendez-vous ?'
    },
    {
      id: 'products', type: 'choices', multi: true,
      title: 'Quels types de produits souhaitez-vous commander ?',
      choices: ['Pain artisanal', 'Viennoiseries', 'Pâtisseries', 'Gâteaux personnalisés', 'Trompe d’œil artistique', 'Gâteaux de voyage']
    },
    {
      id: 'theme', type: 'textarea',
      title: 'Avez-vous un thème, une inspiration ou un style spécifique pour vos pâtisseries ou gâteaux ?'
    },
    {
      id: 'photo', type: 'file',
      title: 'Une image d’inspiration à nous montrer ?'
    },
    {
      id: 'diet', type: 'choices', multi: true,
      title: 'Y a-t-il des régimes alimentaires ou allergies à prendre en compte ?',
      choices: ['Végétarien', 'Sans lactose'],
      other: 'Autre (à préciser)'
    },
    {
      id: 'tasting', type: 'choices',
      title: 'Souhaitez-vous une dégustation avant la commande définitive ?',
      choices: ['Oui', 'Non']
    },
    {
      id: 'consult', type: 'choices',
      title: 'Souhaitez-vous bénéficier d’une consultation personnalisée avec notre chef pâtissier ?',
      choices: ['Oui, je souhaite un rendez-vous VIP', 'Non, merci']
    },
    {
      id: 'pieces', type: 'text', inputmode: 'numeric',
      title: 'Pour affiner votre commande, combien de pièces souhaitez-vous ?',
      placeholder: 'ex : 24'
    },
    {
      id: 'budget', type: 'text',
      title: 'Quel est votre budget indicatif pour cette commande ?',
      placeholder: 'ex : 150 €'
    },
    {
      id: 'details', type: 'textarea',
      title: 'Vous pouvez préciser ici toute demande spéciale ou détail important pour votre commande'
    },
    {
      id: 'name', type: 'text', required: true, autocomplete: 'name',
      title: 'Nom complet', placeholder: 'ex : Marie Dupont'
    },
    {
      id: 'email', type: 'email', required: true, autocomplete: 'email',
      title: 'Email', placeholder: 'vous@exemple.fr'
    },
    {
      id: 'phone', type: 'tel', autocomplete: 'tel',
      title: 'Téléphone', placeholder: 'Numéro de portable'
    },
    {
      id: 'extras', type: 'choices',
      title: 'Souhaitez-vous ajouter des boissons artisanales ou coffrets cadeaux à votre commande ?',
      choices: ['Oui', 'Non']
    }
  ];

  var idx = 0;
  var answers = {};

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- Rendu des étapes ---------- */

  function choiceHTML(label, value, key) {
    return '<button type="button" class="convo-choice" data-choice="' + esc(value) + '">' +
      '<span class="convo-key">' + key + '</span><span>' + esc(label) + '</span></button>';
  }

  function bodyHTML(q) {
    if (q.type === 'choices') {
      var items = q.choices.map(function (c, i) { return choiceHTML(c, c, KEYS[i]); });
      if (q.other) items.push(choiceHTML(q.other, OTHER, KEYS[q.choices.length]));
      return '<div class="convo-choices" role="group" aria-label="Choix">' + items.join('') +
        (q.other ? '<input class="convo-input convo-other" type="text" placeholder="Précisez…" hidden>' : '') +
        '</div>' +
        (q.multi ? '<p class="convo-hint-multi">Choisissez-en autant que vous voulez</p>' : '');
    }
    if (q.type === 'date') {
      return '<div class="convo-fields">' +
        '<div><label class="convo-mini-label" for="convo-date">Date de l’événement</label>' +
        '<input class="convo-input" id="convo-date" data-field="date" type="date"></div>' +
        '<div><label class="convo-mini-label" for="convo-people">Nombre de personnes</label>' +
        '<input class="convo-input" id="convo-people" data-field="people" type="number" min="1" step="1" placeholder="ex : 12"></div>' +
        '</div>';
    }
    if (q.type === 'textarea') {
      return '<textarea class="convo-input" rows="2" placeholder="Écrivez votre réponse ici…"></textarea>' +
        '<p class="convo-hint-multi">Maj ⇧ + Entrée ↵ pour aller à la ligne</p>';
    }
    if (q.type === 'file') {
      return '<button type="button" class="convo-drop" data-drop>' +
        '<svg class="icon convo-drop-icon" viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M7 17a5 5 0 0 1-.9-9.92 6 6 0 0 1 11.8 0A5 5 0 0 1 17 17M12 11v8M8.5 14.5 12 11l3.5 3.5"/></svg>' +
        '<strong>Choisir un fichier ou glisser ici</strong>' +
        '<span class="convo-drop-hint">JPG ou PNG — 8 Mo max</span>' +
        '<img class="convo-drop-preview" alt="" hidden>' +
        '<span class="convo-drop-name" hidden></span>' +
        '</button>' +
        '<input type="file" accept="image/*" class="visually-hidden" data-file tabindex="-1">' +
        '<button type="button" class="link-quiet convo-drop-remove" hidden>Retirer l’image</button>';
    }
    var type = q.type === 'text' ? 'text' : q.type;
    return '<input class="convo-input" type="' + type + '"' +
      (q.placeholder ? ' placeholder="' + esc(q.placeholder) + '"' : '') +
      (q.autocomplete ? ' autocomplete="' + q.autocomplete + '"' : '') +
      (q.inputmode ? ' inputmode="' + q.inputmode + '"' : '') + '>';
  }

  function stepHTML(q, i) {
    return '<div class="convo-step" data-step="' + i + '">' +
      '<div class="convo-q">' +
        '<span class="convo-qnum">' + (i + 1) + ' →</span>' +
        '<h3 class="convo-qtitle">' + esc(q.title) + (q.required ? ' <span class="convo-req">*</span>' : '') + '</h3>' +
      '</div>' +
      bodyHTML(q) +
      '<p class="convo-error" role="alert" hidden></p>' +
      '<div class="convo-actions">' +
        '<button type="button" class="btn btn-solid convo-ok" data-ok>OK</button>' +
        '<span class="convo-enter">appuyez sur Entrée ↵</span>' +
      '</div>' +
    '</div>';
  }

  function render() {
    stepsEl.innerHTML = QUESTIONS.map(stepHTML).join('');
    /* la date doit être au plus tôt demain */
    var min = new Date();
    min.setDate(min.getDate() + 1);
    var dateInput = stepsEl.querySelector('#convo-date');
    if (dateInput) dateInput.min = min.toISOString().slice(0, 10);
  }

  function stepEl(i) {
    return stepsEl.querySelector('[data-step="' + i + '"]');
  }

  /* ---------- État & navigation ---------- */

  function isEmpty(q) {
    var a = answers[q.id];
    if (q.type === 'choices') return !a || a.length === 0;
    if (q.type === 'date') return !(a && (a.date || a.people));
    if (q.type === 'file') return !(a && a.dataUrl);
    return !(a && String(a).trim());
  }

  function refreshOk(i) {
    var q = QUESTIONS[i];
    var el = stepEl(i);
    if (!el) return;
    var ok = el.querySelector('[data-ok]');
    var last = i === QUESTIONS.length - 1;
    ok.textContent = last ? 'Soumettre' : (!q.required && isEmpty(q) ? 'Passer' : 'OK');
  }

  function setError(i, message) {
    var err = stepEl(i).querySelector('.convo-error');
    err.textContent = message || '';
    err.hidden = !message;
  }

  function validate(i) {
    var q = QUESTIONS[i];
    var value = answers[q.id];
    if (q.required && isEmpty(q)) {
      setError(i, q.type === 'email' ? 'Votre email nous permet de vous répondre.' : 'Ce champ est requis.');
      return false;
    }
    if (q.type === 'email' && value && !/^\S+@\S+\.\S+$/.test(value.trim())) {
      setError(i, 'Cette adresse email semble incomplète.');
      return false;
    }
    setError(i, '');
    return true;
  }

  function goTo(n, focus, back) {
    idx = Math.max(0, Math.min(QUESTIONS.length - 1, n));
    root.classList.toggle('nav-back', !!back);
    var steps = stepsEl.querySelectorAll('.convo-step');
    steps.forEach(function (el, i) {
      el.classList.toggle('is-active', i === idx);
    });
    refreshOk(idx);

    var pct = Math.round(idx / QUESTIONS.length * 100);
    progressLabel.innerHTML = pct + '&nbsp;% complété';
    barFill.style.width = pct + '%';
    prevBtn.disabled = idx === 0;

    if (focus) {
      var target = stepEl(idx).querySelector('input:not([type="file"]), textarea, .convo-choice');
      if (target) target.focus({ preventScroll: true });
      var rect = root.getBoundingClientRect();
      if (rect.top < 0 || rect.bottom > window.innerHeight) {
        root.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
  }

  function next() {
    if (!validate(idx)) return;
    if (idx === QUESTIONS.length - 1) {
      submit();
    } else {
      goTo(idx + 1, true);
    }
  }

  function prev() {
    if (idx > 0) goTo(idx - 1, true, true);
  }

  /* ---------- Interactions ---------- */

  stepsEl.addEventListener('click', function (e) {
    var choice = e.target.closest('.convo-choice');
    var ok = e.target.closest('[data-ok]');
    var drop = e.target.closest('[data-drop]');
    var remove = e.target.closest('.convo-drop-remove');

    if (choice) {
      toggleChoice(choice.getAttribute('data-choice'));
    } else if (ok) {
      next();
    } else if (drop) {
      stepEl(idx).querySelector('[data-file]').click();
    } else if (remove) {
      clearFile();
    }
  });

  function toggleChoice(value) {
    var q = QUESTIONS[idx];
    if (q.type !== 'choices') return;
    var current = answers[q.id] || [];

    if (q.multi) {
      var at = current.indexOf(value);
      if (at === -1) current.push(value); else current.splice(at, 1);
      answers[q.id] = current;
    } else {
      answers[q.id] = current[0] === value ? [] : [value];
    }

    var el = stepEl(idx);
    el.querySelectorAll('.convo-choice').forEach(function (btn) {
      btn.classList.toggle('is-selected', (answers[q.id] || []).indexOf(btn.getAttribute('data-choice')) !== -1);
    });

    var other = el.querySelector('.convo-other');
    if (other) {
      var showOther = (answers[q.id] || []).indexOf(OTHER) !== -1;
      other.hidden = !showOther;
      if (showOther) other.focus({ preventScroll: true });
    }

    setError(idx, '');
    refreshOk(idx);

    /* choix unique : on enchaîne tout seul (sauf dernière question) */
    if (!q.multi && (answers[q.id] || []).length && idx < QUESTIONS.length - 1) {
      setTimeout(function () {
        if (QUESTIONS[idx] === q) next();
      }, 350);
    }
  }

  stepsEl.addEventListener('input', function (e) {
    var q = QUESTIONS[idx];
    var t = e.target;
    if (t.classList.contains('convo-other')) {
      answers[q.id + '_other'] = t.value;
    } else if (t.hasAttribute('data-field')) {
      answers[q.id] = answers[q.id] || {};
      answers[q.id][t.getAttribute('data-field')] = t.value;
    } else if (t.classList.contains('convo-input')) {
      answers[q.id] = t.value;
    }
    setError(idx, '');
    refreshOk(idx);
  });

  root.addEventListener('keydown', function (e) {
    var t = e.target;
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);

    if (e.key === 'Enter') {
      if (t.tagName === 'TEXTAREA' && e.shiftKey) return; /* saut de ligne */
      /* laisser le clic natif des boutons concernés faire son travail */
      if (t === prevBtn || t === nextBtn || (t.closest && t.closest('.convo-choice'))) return;
      e.preventDefault();
      next();
      return;
    }
    if (!typing && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      if (e.key === 'ArrowDown') next(); else prev();
      return;
    }
    /* raccourcis lettres pour les choix */
    if (!typing && /^[a-zA-Z]$/.test(e.key)) {
      var q = QUESTIONS[idx];
      if (q.type !== 'choices') return;
      var pos = KEYS.indexOf(e.key.toUpperCase());
      var total = q.choices.length + (q.other ? 1 : 0);
      if (pos === -1 || pos >= total) return;
      e.preventDefault();
      toggleChoice(pos < q.choices.length ? q.choices[pos] : OTHER);
    }
  });

  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);

  /* ---------- Image d'inspiration ---------- */

  stepsEl.addEventListener('change', function (e) {
    var input = e.target.closest('[data-file]');
    if (input && input.files && input.files[0]) handleFile(input.files[0]);
  });

  stepsEl.addEventListener('dragover', function (e) {
    var drop = e.target.closest('[data-drop]');
    if (!drop) return;
    e.preventDefault();
    drop.classList.add('is-drag');
  });
  stepsEl.addEventListener('dragleave', function (e) {
    var drop = e.target.closest('[data-drop]');
    if (drop) drop.classList.remove('is-drag');
  });
  stepsEl.addEventListener('drop', function (e) {
    var drop = e.target.closest('[data-drop]');
    if (!drop) return;
    e.preventDefault();
    drop.classList.remove('is-drag');
    var file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  function handleFile(file) {
    if (!/^image\//.test(file.type)) {
      setError(idx, 'Choisissez une image (JPG, PNG…).');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError(idx, 'Image trop lourde (8 Mo max).');
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        /* compresse pour tenir dans le localStorage de la démo */
        var max = 900;
        var scale = Math.min(1, max / Math.max(img.width, img.height));
        var canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        var dataUrl = canvas.toDataURL('image/jpeg', 0.72);
        if (dataUrl.length > 600000) dataUrl = canvas.toDataURL('image/jpeg', 0.5);
        answers.photo = { dataUrl: dataUrl, name: file.name };
        showFile();
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function showFile() {
    var el = stepEl(idx);
    var preview = el.querySelector('.convo-drop-preview');
    var name = el.querySelector('.convo-drop-name');
    var has = !!(answers.photo && answers.photo.dataUrl);
    preview.hidden = !has;
    name.hidden = !has;
    el.querySelector('.convo-drop-remove').hidden = !has;
    el.querySelector('.convo-drop-icon').style.display = has ? 'none' : '';
    el.querySelector('.convo-drop-hint').style.display = has ? 'none' : '';
    if (has) {
      preview.src = answers.photo.dataUrl;
      name.textContent = answers.photo.name;
    }
    setError(idx, '');
    refreshOk(idx);
  }

  function clearFile() {
    answers.photo = null;
    stepEl(idx).querySelector('[data-file]').value = '';
    showFile();
  }

  /* ---------- Envoi ---------- */

  var dateFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  function answerText(q) {
    var a = answers[q.id];
    if (q.type === 'choices') {
      if (!a || !a.length) return '';
      return a.map(function (v) {
        if (v !== OTHER) return v;
        var precision = (answers[q.id + '_other'] || '').trim();
        return 'Autre' + (precision ? ' : ' + precision : '');
      }).join(', ');
    }
    if (q.type === 'date') {
      if (!a) return '';
      var parts = [];
      if (a.date) parts.push(dateFmt.format(new Date(a.date + 'T12:00:00')));
      if (a.people) parts.push(a.people + ' personne' + (Number(a.people) > 1 ? 's' : ''));
      return parts.join(' · ');
    }
    if (q.type === 'file') {
      return a && a.dataUrl ? 'Image jointe : ' + a.name : '';
    }
    return a ? String(a).trim() : '';
  }

  function buildRequest(withPhoto) {
    var list = [];
    QUESTIONS.forEach(function (q) {
      var text = answerText(q);
      if (text) list.push({ q: q.title, a: text });
    });
    var events = answerText(QUESTIONS[0]);
    var dateA = answers.date || {};
    return {
      customer: {
        name: (answers.name || '').trim(),
        phone: (answers.phone || '').trim(),
        email: (answers.email || '').trim()
      },
      event: events || 'Sur-mesure',
      date: dateA.date || '',
      people: dateA.people || '',
      message: (answers.details || answers.theme || '').trim(),
      answers: list,
      photo: withPhoto && answers.photo ? answers.photo.dataUrl : ''
    };
  }

  function submit() {
    var ok = stepEl(idx).querySelector('[data-ok]');
    ok.disabled = true;
    store.createRequest(buildRequest(true))
      .catch(function () {
        /* image trop lourde pour le localStorage de la démo : on renvoie sans elle */
        return store.createRequest(buildRequest(false));
      })
      .then(function (saved) {
        document.getElementById('convo-done-ref').textContent = saved.ref;
        stepsEl.hidden = true;
        footerEl.hidden = true;
        doneEl.hidden = false;
      })
      .catch(function (err) {
        ok.disabled = false;
        setError(idx, err.message);
      });
  }

  document.getElementById('convo-again').addEventListener('click', function () {
    answers = {};
    render();
    doneEl.hidden = true;
    stepsEl.hidden = false;
    footerEl.hidden = false;
    goTo(0, true);
  });

  render();
  goTo(0, false);
})();
