(() => {
  'use strict';

  const TOTAL_QUESTS = 77;
  const COMPLETE_PREFIX = 'mm-guide:completed:';
  const SIDEBAR_KEY = 'mm-guide:sidebar-collapsed';
  const BACKUP_FORMAT = 'unofficial-mm-guide-progress';

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
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch (_) {
        this.available = false;
      }
    },
    progressEntries() {
      const entries = {};
      try {
        for (let index = 0; index < localStorage.length; index += 1) {
          const key = localStorage.key(index);
          if (key?.startsWith('mm-guide:') && key !== SIDEBAR_KEY) {
            entries[key] = localStorage.getItem(key);
          }
        }
      } catch (_) {
        this.available = false;
      }
      return entries;
    }
  };

  const sidebar = document.querySelector('.sidebar');
  const toggle = document.querySelector('.nav-toggle');
  if (toggle && sidebar) {
    const desktopMode = window.matchMedia('(min-width: 921px)');

    const setMobileNavigationOpen = open => {
      sidebar.classList.toggle('open', open);
      document.documentElement.classList.toggle('mobile-nav-open', open);
      document.body.classList.toggle('mobile-nav-open', open);
    };

    const syncNavigation = () => {
      if (desktopMode.matches) {
        setMobileNavigationOpen(false);
        const collapsed = storage.get(SIDEBAR_KEY) === '1';
        document.body.classList.toggle('sidebar-collapsed', collapsed);
        toggle.setAttribute('aria-expanded', String(!collapsed));
        toggle.textContent = collapsed ? 'Browse quests' : 'Hide menu';
      } else {
        document.body.classList.remove('sidebar-collapsed');
        const open = sidebar.classList.contains('open');
        toggle.setAttribute('aria-expanded', String(open));
        toggle.textContent = open ? 'Close menu' : 'Browse quests';
      }
    };

    toggle.addEventListener('click', () => {
      if (desktopMode.matches) {
        const collapsed = !document.body.classList.contains('sidebar-collapsed');
        storage.set(SIDEBAR_KEY, collapsed ? '1' : '0');
      } else {
        setMobileNavigationOpen(!sidebar.classList.contains('open'));
      }
      syncNavigation();
    });

    sidebar.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        if (!desktopMode.matches) {
          setMobileNavigationOpen(false);
          syncNavigation();
        }
      });
    });

    document.addEventListener('click', event => {
      if (!desktopMode.matches && sidebar.classList.contains('open') && !sidebar.contains(event.target) && !toggle.contains(event.target)) {
        setMobileNavigationOpen(false);
        syncNavigation();
      }
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !desktopMode.matches && sidebar.classList.contains('open')) {
        setMobileNavigationOpen(false);
        syncNavigation();
        toggle.focus();
      }
    });

    if (desktopMode.addEventListener) desktopMode.addEventListener('change', syncNavigation);
    else desktopMode.addListener(syncNavigation);
    syncNavigation();
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
  const taskKey = index => `mm-guide:${location.pathname}:${index}`;
  taskBoxes.forEach((box, index) => {
    box.disabled = false;
    box.checked = storage.get(taskKey(index)) === '1';
  });

  const questLinks = [...document.querySelectorAll('.quest-link[data-progress-key]')];
  const questRecords = questLinks.map(link => ({
    key: link.dataset.progressKey,
    category: link.dataset.progressCategory
  }));

  const isComplete = key => storage.get(`${COMPLETE_PREFIX}${key}`) === '1';
  const completionCard = document.querySelector('[data-page-progress]');
  const completionButton = completionCard?.querySelector('.completion-toggle');

  const syncCurrentChecklist = complete => {
    taskBoxes.forEach((box, index) => {
      box.checked = complete;
      storage.set(taskKey(index), complete ? '1' : '0');
    });
  };

  const setComplete = (key, complete, syncChecklist = false) => {
    if (syncChecklist && completionCard?.dataset.progressKey === key) {
      syncCurrentChecklist(complete);
    }
    storage.set(`${COMPLETE_PREFIX}${key}`, complete ? '1' : '0');
    renderProgress();
  };

  taskBoxes.forEach((box, index) => {
    box.addEventListener('change', () => {
      storage.set(taskKey(index), box.checked ? '1' : '0');
      if (completionCard) {
        const allStepsComplete = taskBoxes.length > 0 && taskBoxes.every(item => item.checked);
        setComplete(completionCard.dataset.progressKey, allStepsComplete);
      }
    });
  });

  if (completionCard && completionButton) {
    completionButton.addEventListener('click', () => {
      const key = completionCard.dataset.progressKey;
      setComplete(key, !isComplete(key), true);
    });

    if (taskBoxes.length > 0) {
      const key = completionCard.dataset.progressKey;
      if (isComplete(key)) {
        syncCurrentChecklist(true);
      } else if (taskBoxes.every(box => box.checked)) {
        storage.set(`${COMPLETE_PREFIX}${key}`, '1');
      }
    }
  }

  const chapterNavigation = document.querySelector('[data-chapter-navigation]');
  const nextChapterLink = chapterNavigation?.querySelector('[data-next-chapter]');
  const completionDialog = document.querySelector('[data-completion-dialog]');
  if (chapterNavigation?.dataset.currentCategory === 'main-quest' && nextChapterLink && completionCard) {
    let pendingChapterUrl = nextChapterLink.href;

    const continueToNextChapter = markComplete => {
      if (markComplete) {
        setComplete(completionCard.dataset.progressKey, true, true);
      }
      if (completionDialog?.open) completionDialog.close();
      window.location.assign(pendingChapterUrl);
    };

    nextChapterLink.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || isComplete(completionCard.dataset.progressKey)) return;
      event.preventDefault();
      pendingChapterUrl = nextChapterLink.href;

      if (completionDialog?.showModal) {
        completionDialog.showModal();
      } else {
        continueToNextChapter(window.confirm('Mark this chapter as complete before continuing?'));
      }
    });

    completionDialog?.querySelector('[data-complete-and-continue]')?.addEventListener('click', () => continueToNextChapter(true));
    completionDialog?.querySelector('[data-continue-without]')?.addEventListener('click', () => continueToNextChapter(false));
    completionDialog?.querySelector('[data-dialog-close]')?.addEventListener('click', () => completionDialog.close());
    completionDialog?.addEventListener('click', event => {
      if (event.target === completionDialog) completionDialog.close();
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

  const exportButton = document.querySelector('[data-progress-export]');
  const importButton = document.querySelector('[data-progress-import]');
  const importFile = document.querySelector('[data-progress-file]');
  const progressStatus = document.querySelector('[data-progress-status]');

  const showProgressStatus = (message, isError = false) => {
    if (!progressStatus) return;
    progressStatus.textContent = message;
    progressStatus.classList.toggle('is-error', isError);
  };

  if (exportButton) {
    exportButton.addEventListener('click', async () => {
      const backup = {
        format: BACKUP_FORMAT,
        version: 1,
        exportedAt: new Date().toISOString(),
        items: storage.progressEntries()
      };
      if (!storage.available) {
        showProgressStatus('Progress could not be read in this browser mode.', true);
        return;
      }

      const filename = `mm-guide-progress-${new Date().toISOString().slice(0, 10)}.json`;
      const file = new File([JSON.stringify(backup, null, 2)], filename, { type: 'application/json' });

      try {
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ title: 'Majora\'s Mask guide progress', files: [file] });
        } else {
          const url = URL.createObjectURL(file);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          link.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
        showProgressStatus('Progress exported. Keep the file somewhere safe.');
      } catch (error) {
        if (error?.name !== 'AbortError') showProgressStatus('The progress file could not be exported.', true);
      }
    });
  }

  importButton?.addEventListener('click', () => importFile?.click());
  importFile?.addEventListener('change', async () => {
    const file = importFile.files?.[0];
    importFile.value = '';
    if (!file) return;
    if (file.size > 1024 * 1024) {
      showProgressStatus('That file is too large to be a guide backup.', true);
      return;
    }

    try {
      const backup = JSON.parse(await file.text());
      if (backup?.format !== BACKUP_FORMAT || backup?.version !== 1 || !backup.items || Array.isArray(backup.items) || typeof backup.items !== 'object') {
        throw new Error('Invalid backup format');
      }

      const importedEntries = Object.entries(backup.items);
      const validEntries = importedEntries.filter(([key, value]) => key.startsWith('mm-guide:') && key !== SIDEBAR_KEY && (value === '0' || value === '1'));
      if (validEntries.length !== importedEntries.length) throw new Error('Invalid backup data');

      const currentEntries = storage.progressEntries();
      if (Object.keys(currentEntries).length > 0 && !window.confirm('Importing will replace the progress currently saved in this browser. Continue?')) return;

      Object.keys(currentEntries).forEach(key => storage.remove(key));
      validEntries.forEach(([key, value]) => storage.set(key, value));
      if (!storage.available) throw new Error('Storage unavailable');

      taskBoxes.forEach((box, index) => {
        box.checked = storage.get(taskKey(index)) === '1';
      });
      renderProgress();
      showProgressStatus(`Progress imported successfully (${validEntries.length} saved items).`);
    } catch (_) {
      showProgressStatus('This is not a valid guide progress backup.', true);
    }
  });

  renderProgress();

  window.addEventListener('storage', event => {
    if (!event.key || !event.key.startsWith('mm-guide:')) return;
    taskBoxes.forEach((box, index) => {
      box.checked = storage.get(taskKey(index)) === '1';
    });
    renderProgress();
  });

  if (!storage.available) {
    document.querySelectorAll('.storage-note, .completion-toggle small').forEach(node => {
      node.textContent = 'Local storage is unavailable in this browser mode.';
    });
  }
})();
