import type { Metadata } from 'next';
import { Projects } from '@/components/home/projects';

export const metadata: Metadata = { title: 'Projects · Nathan W.' };

export default function Page() {
  return <Projects />;
}
