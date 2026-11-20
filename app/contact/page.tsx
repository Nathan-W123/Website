import type { Metadata } from 'next';
import { Contact } from '@/components/home/contact';

export const metadata: Metadata = { title: 'Contact · Nathan W.' };

export default function Page() {
  return <Contact />;
}
