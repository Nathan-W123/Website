import type { Metadata } from 'next';
import { Work } from '@/components/home/work';

export const metadata: Metadata = { title: 'Work · Nathan W.' };

export default function Page() {
  return <Work />;
}
