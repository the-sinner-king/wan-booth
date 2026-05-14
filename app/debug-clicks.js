// TEMP DEBUG: log what element receives clicks — remove after diagnosis
document.addEventListener('mousedown', (e) => {
  const path = e.composedPath()
    .slice(0, 6)
    .map(el => (el.id ? '#'+el.id : '') + (el.className && typeof el.className === 'string' ? '.'+el.className.split(' ').join('.') : '') + (el.tagName ? ' <'+el.tagName+'>' : ''))
    .filter(Boolean);
  console.log('[CLICK DEBUG] target:', e.target.id || e.target.className || e.target.tagName);
  console.log('[CLICK DEBUG] path:', path.join(' → '));
}, true);
