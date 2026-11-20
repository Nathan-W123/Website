import type { Metadata } from 'next';
import { Art } from '@/components/home/art';

export const metadata: Metadata = { title: 'Art · Nathan W.' };

export default function Page() {
  return <Art />;
}
