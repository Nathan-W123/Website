import type { Metadata } from 'next';
import Chibi from '@/components/chibi/chibi';
import '@/components/chibi/chibi.css';

export const metadata: Metadata = { title: 'Chibi' };

/** A page with nothing on it but him, so the walk has the whole width to cross. */
export default function ChibiPage() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        background: '#fff',
        overflow: 'hidden',
      }}
    >
      <Chibi />
    </main>
  );
}
