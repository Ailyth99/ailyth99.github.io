(() => {
  const tabs = [...document.querySelectorAll('[data-tab]')];
  const panels = [...document.querySelectorAll('[data-route]')];
  const tablist = document.getElementById('routeTabs');
  const status = document.getElementById('guideStatus');
  const key = 'desert-kingdom-guide:progress:v1';
  let current = 'sera';
  let marks = {};
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '{}');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) marks = saved;
  } catch { /* Reading the guide also works without browser storage. */ }

  function updateProgress(panel) {
    const inputs = [...panel.querySelectorAll('[data-check]')];
    const done = inputs.filter(input => input.checked).length;
    panel.querySelector('[data-progress-text]').textContent = `${done} / ${inputs.length}`;
    panel.querySelector('[data-progress-percent]').textContent = `${Math.round(done / inputs.length * 100)}%`;
    panel.querySelector('[data-progress]').value = done;
    panel.querySelector('[data-reset]').disabled = done === 0;
  }

  function remember() {
    try { localStorage.setItem(key, JSON.stringify(marks)); }
    catch { status.textContent = '浏览器未保存完成标记；当前页面仍可继续使用。'; }
  }

  panels.forEach(panel => {
    panel.querySelectorAll('[data-check]').forEach(input => {
      input.checked = marks[input.dataset.check] === true;
      input.closest('.day-step').classList.toggle('is-complete', input.checked);
      input.addEventListener('change', () => {
        if (input.checked) marks[input.dataset.check] = true;
        else delete marks[input.dataset.check];
        input.closest('.day-step').classList.toggle('is-complete', input.checked);
        updateProgress(panel); remember();
      });
    });
    panel.querySelector('[data-reset]').addEventListener('click', () => {
      panel.querySelectorAll('[data-check]').forEach(input => {
        input.checked = false; delete marks[input.dataset.check];
        input.closest('.day-step').classList.remove('is-complete');
      });
      updateProgress(panel); remember();
      status.textContent = `已清除${panel.querySelector('h2').textContent}路线的完成标记。`;
    });
    panel.addEventListener('beforematch', () => activate(panel.dataset.route, { scroll: false }));
    updateProgress(panel);
  });

  function activate(id, { updateHash = true, scroll = false } = {}) {
    if (!panels.some(panel => panel.dataset.route === id)) return;
    current = id;
    panels.forEach(panel => { panel.hidden = panel.dataset.route === id ? false : 'until-found'; });
    tabs.forEach(tab => {
      const selected = tab.dataset.tab === id;
      tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1;
    });
    const selected = tabs.find(tab => tab.dataset.tab === id);
    // Scroll only the horizontal tablist, without moving the document vertically.
    const left = selected.offsetLeft, right = left + selected.offsetWidth;
    if (left < tablist.scrollLeft) tablist.scrollLeft = left;
    else if (right > tablist.scrollLeft + tablist.clientWidth) tablist.scrollLeft = right - tablist.clientWidth;
    if (updateHash) {
      const slug = panels.find(panel => panel.dataset.route === id).dataset.slug;
      try { history.replaceState(null, '', `#${slug}`); } catch { /* Hash persistence is optional offline. */ }
    }
    if (scroll && scrollY > document.getElementById('routePanels').offsetTop) {
      document.getElementById('routePanels').scrollIntoView({ block: 'start' });
    }
  }

  tabs.forEach(tab => tab.addEventListener('click', () => activate(tab.dataset.tab, { scroll: true })));
  // Widely supported manual-activation tabs: arrows move focus; Enter/Space
  // activate native buttons. No downloaded polyfill is required offline.
  tablist.addEventListener('keydown', event => {
    const index = tabs.indexOf(document.activeElement);
    if (index < 0) return;
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    tabs.forEach((tab, i) => { tab.tabIndex = i === next ? 0 : -1; });
    tabs[next].focus();
  });
  tablist.addEventListener('focusout', event => {
    if (!tablist.contains(event.relatedTarget)) tabs.forEach(tab => { tab.tabIndex = tab.dataset.tab === current ? 0 : -1; });
  });

  function applyHash() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    // Public fragments follow portrait filenames. Internal IDs stay stable so
    // existing completion marks and older route/section links keep working.
    const legacy = panels.find(panel => id === panel.dataset.route || id.startsWith(panel.dataset.route + '-'));
    const canonical = legacy ? legacy.dataset.slug + id.slice(legacy.dataset.route.length) : id;
    const target = document.getElementById(canonical);
    const route = panels.find(panel => panel.dataset.slug === canonical)
      || target?.closest('[data-route]');
    if (!route) return;
    activate(route.dataset.route, { updateHash: false });
    if (canonical !== id) {
      try { history.replaceState(null, '', `#${canonical}`); } catch { /* Old links still select the route. */ }
      if (target) target.scrollIntoView({ block: 'start' });
    }
  }
  addEventListener('hashchange', applyHash);
  applyHash();
})();
