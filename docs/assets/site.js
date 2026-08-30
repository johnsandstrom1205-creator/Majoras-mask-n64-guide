(() => {
  const sidebar = document.querySelector('.sidebar');
  const toggle = document.querySelector('.nav-toggle');
  if (toggle && sidebar) {
    toggle.addEventListener('click', () => {
      const open = sidebar.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  const search = document.querySelector('#nav-search');
  const navItems = [...document.querySelectorAll('[data-nav-item]')];
  if (search) {
    search.addEventListener('input', () => {
      const query = search.value.trim().toLowerCase();
      navItems.forEach(item => item.classList.toggle('hidden', query && !item.textContent.toLowerCase().includes(query)));
      if (query) document.querySelectorAll('.sidebar details').forEach(d => d.open = true);
    });
  }

  document.querySelectorAll('.prose input[type="checkbox"]').forEach((box, index) => {
    box.disabled = false;
    const key = `mm-guide:${location.pathname}:${index}`;
    box.checked = localStorage.getItem(key) === '1';
    box.addEventListener('change', () => localStorage.setItem(key, box.checked ? '1' : '0'));
  });
})();
