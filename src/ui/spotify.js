// Facade de Spotify: un botón del mismo alto que el iframe (sin layout shift)
// que monta el embed recién al click, evitando cargar ~1MB de JS por track.
export function spotifyFacade(id, label = 'Reproducir') {
  const b = document.createElement('button');
  b.className = 'sp-facade';
  b.type = 'button';
  b.innerHTML = '<span class="sp-play" aria-hidden="true">▶</span><span class="sp-t"></span>';
  b.querySelector('.sp-t').textContent = label;
  b.addEventListener('click', () => {
    const f = document.createElement('iframe');
    f.src = `https://open.spotify.com/embed/track/${id}`;
    f.width = '100%';
    f.height = '152';
    f.style.border = '0';
    f.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
    b.replaceWith(f);
  }, { once: true });
  return b;
}

// Reemplaza todo placeholder `.sp-mount[data-spotify]` por su facade.
export function mountSpotifyFacades(root) {
  (root || document).querySelectorAll('.sp-mount[data-spotify]').forEach((el) => {
    el.replaceWith(spotifyFacade(el.dataset.spotify, el.dataset.label || 'Reproducir'));
  });
}
