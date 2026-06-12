/* Boulangerie Bread's — demande sur-mesure (formulaire en page, section #demande). */
(function () {
  'use strict';

  var store = window.BreadsStore;
  var form = document.getElementById('custom-form');
  if (!store || !form) return;

  var stepDone = document.getElementById('custom-step-done');
  var dateInput = document.getElementById('cf-date');
  var errorEl = document.getElementById('custom-error');

  /* l'événement doit être au plus tôt demain */
  var min = new Date();
  min.setDate(min.getDate() + 1);
  dateInput.min = min.toISOString().slice(0, 10);

  var dateFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errorEl.hidden = true;

    var request = {
      customer: {
        name: form.name.value.trim(),
        phone: form.phone.value.trim(),
        email: form.email.value.trim()
      },
      event: form.event.value,
      date: form.date.value,
      people: form.people.value,
      message: form.message.value.trim()
    };

    store.createRequest(request).then(function (saved) {
      form.reset();
      document.getElementById('custom-done-ref').textContent = saved.ref;
      document.getElementById('custom-done-summary').textContent =
        saved.event + ' — ' + dateFmt.format(new Date(saved.date + 'T12:00:00')) +
        (saved.people ? ', ' + saved.people + ' personnes' : '') + '.';
      form.hidden = true;
      stepDone.hidden = false;
      stepDone.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }).catch(function (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    });
  });

  document.getElementById('custom-again').addEventListener('click', function () {
    stepDone.hidden = true;
    form.hidden = false;
    document.getElementById('cf-name').focus();
  });
})();
