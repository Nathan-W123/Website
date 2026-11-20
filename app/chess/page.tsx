import type { Metadata } from 'next';
import { ChessPage } from '@/components/home/chess';

export const metadata: Metadata = { title: 'Chess · Nathan W.' };

export default function Page() {
  return <ChessPage />;
}
