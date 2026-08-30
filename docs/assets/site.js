(() => {
  'use strict';

  const TOTAL_QUESTS = 77;
  const COMPLETE_PREFIX = 'mm-guide:completed:';

  const storage = {
    available: true,
    get(key) {
      try {
        return localStorage.getItem(key);
      } catch (_) {
        this.available = false;
        return null;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (_) {
        this.available = false;
      }
    }
  };

  const sidebar = document.querySelector('.sidebar');
  const toggle = document.querySelector('.nav-toggle');
  if (toggle && sidebar) {
    toggle.addEventListener('click', () => {
      const open = sidebar.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });

    sidebar.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        sidebar.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  const search = document.querySelector('#nav-search');
  const navItems = [...document.querySelectorAll('[data-nav-item]')];
  if (search) {
    search.addEventListener('input', () => {
      const query = search.value.trim().toLowerCase();
      navItems.forEach(item => {
        item.classList.toggle('hidden', Boolean(query) && !item.textContent.toLowerCase().includes(query));
      });
      if (query) document.querySelectorAll('.sidebar details').forEach(group => { group.open = true; });
    });
  }

  const currentLink = document.querySelector('.sidebar a[aria-current="page"]');
  if (currentLink) {
    const currentGroup = currentLink.closest('details');
    if (currentGroup) currentGroup.open = true;
  }

  const taskBoxes = [...document.querySelectorAll('.prose input[type="checkbox"]')];
  taskBoxes.forEach((box, index) => {
    box.disabled = false;
    const key = `mm-guide:${location.pathname}:${index}`;
    box.checked = storage.get(key) === '1';
    box.addEventListener('change', () => storage.set(key, box.checked ? '1' : '0'));
  });

  const questLinks = [...document.querySelectorAll('.quest-link[data-progress-key]')];
  const questRecords = questLinks.map(link => ({
    key: link.dataset.progressKey,
    category: link.dataset.progressCategory
  }));

  const isComplete = key => storage.get(`${COMPLETE_PREFIX}${key}`) === '1';
  const setComplete = (key, complete) => {
    storage.set(`${COMPLETE_PREFIX}${key}`, complete ? '1' : '0');
    renderProgress();
  };

  const completionCard = document.querySelector('[data-page-progress]');
  const completionButton = completionCard?.querySelector('.completion-toggle');
  if (completionCard && completionButton) {
    completionButton.addEventListener('click', () => {
      const key = completionCard.dataset.progressKey;
      setComplete(key, !isComplete(key));
    });
  }

  function renderProgress() {
    const completedByCategory = { 'main-quest': 0, 'side-quest': 0, 'mask-quest': 0 };
    let completed = 0;

    questRecords.forEach(record => {
      if (isComplete(record.key)) {
        completed += 1;
        completedByCategory[record.category] = (completedByCategory[record.category] || 0) + 1;
      }
    });

    questLinks.forEach(link => {
      const complete = isComplete(link.dataset.progressKey);
      link.classList.toggle('is-complete', complete);
      const label = link.querySelector('span:first-child')?.textContent || 'Quest';
      link.setAttribute('aria-label', `${label}${complete ? ', completed' : ''}`);
    });

    document.querySelectorAll('[data-progress-completed]').forEach(node => {
      node.textContent = String(completed);
    });

    const percentage = Math.round((completed / TOTAL_QUESTS) * 100);
    document.querySelectorAll('[data-progress-bar]').forEach(bar => {
      bar.style.width = `${percentage}%`;
    });
    document.querySelectorAll('[role="progressbar"]').forEach(bar => {
      bar.setAttribute('aria-valuenow', String(completed));
    });

    Object.entries(completedByCategory).forEach(([category, count]) => {
      document.querySelectorAll(`[data-progress-summary="${category}"] [data-category-completed]`).forEach(node => {
        node.textContent = String(count);
      });
      document.querySelectorAll(`[data-card-progress="${category}"]`).forEach(node => {
        const total = category === 'main-quest' ? 14 : category === 'side-quest' ? 39 : 24;
        node.textContent = `${count} of ${total} complete`;
      });
    });

    if (completionCard && completionButton) {
      const complete = isComplete(completionCard.dataset.progressKey);
      completionCard.classList.toggle('is-complete', complete);
      completionButton.setAttribute('aria-pressed', String(complete));
      const title = completionButton.querySelector('strong');
      const note = completionButton.querySelector('small');
      if (title) title.textContent = complete ? 'Quest completed' : 'Mark as completed';
      if (note) note.textContent = complete ? 'Saved in this browser' : 'Saved only in this browser';
    }
  }

  renderProgress();

  if (!storage.available) {
    document.querySelectorAll('.storage-note, .completion-toggle small').forEach(node => {
      node.textContent = 'Local storage is unavailable in this browser mode.';
    });
  }
})();
