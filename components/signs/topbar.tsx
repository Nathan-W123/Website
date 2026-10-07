'use client';

/**
 * The bar across the top. Gallery is a scroll, not a route: from home it goes
 * straight to the work, from anywhere else it goes home first and the landing
 * page picks the request up once it has mounted.
 */
export function TopBar({ onHome, here }: { onHome: () => void; here: 'home' | 'about' }) {
  const gallery = () => {
    if (here === 'home') {
      document.querySelector('.hm-work')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    window.sessionStorage.setItem('signs:to-work', '1');
    onHome();
  };
  return (
    <nav className="hm-bar" aria-label="Sections">
      {here === 'about' ? (
        <button type="button" onClick={onHome}>
          Home
        </button>
      ) : (
        <a href="#/about">About</a>
      )}
      <button type="button" onClick={gallery}>
        Gallery
      </button>
      <a href="#/contact">Contact</a>
    </nav>
  );
}
