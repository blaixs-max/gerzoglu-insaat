(function () {
  'use strict';
  var section = document.querySelector('[data-ordered-projects]');
  if (!section) return;
  var cards = Array.from(section.querySelectorAll('.prow'));
  var filters = Array.from(document.querySelectorAll('[data-project-filter]'));
  var title = section.querySelector('.pgroup__title');
  var count = section.querySelector('[data-project-count]');
  var empty = section.querySelector('.project-list-empty');
  var titles = { tumu: 'Tüm projeler', teslim: 'Teslim edilen projeler', devam: 'Devam eden projeler', planlanan: 'Planlanan projeler', satista: 'Satıştaki projeler' };
  function applyHash(scroll) {
    var hash = location.hash.slice(1);
    var filter = Object.prototype.hasOwnProperty.call(titles, hash) ? hash : 'tumu';
    var shown = 0;
    cards.forEach(function (card) {
      card.hidden = filter !== 'tumu' && card.dataset.status !== filter;
      card.classList.toggle('prow--first-visible', !card.hidden && shown === 0);
      if (!card.hidden) shown++;
    });
    filters.forEach(function (link) {
      if (link.dataset.projectFilter === filter) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    title.textContent = titles[filter];
    count.textContent = shown + ' proje';
    empty.hidden = shown !== 0;
    if (scroll && (filter !== 'tumu' || hash === 'tum-projeler')) section.scrollIntoView({ block: 'start', behavior: 'auto' });
  }
  window.addEventListener('hashchange', function () { applyHash(true); });
  applyHash(false);
  if (location.hash && (titles[location.hash.slice(1)] || location.hash === '#tum-projeler')) {
    window.addEventListener('load', function () { applyHash(true); }, { once: true });
  }
})();
