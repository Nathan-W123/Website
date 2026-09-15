import type { Metadata } from 'next';
import { Bangers, Patrick_Hand } from 'next/font/google';
import Signs from '@/components/signs/signs';

const bangers = Bangers({ weight: '400', subsets: ['latin'], variable: '--font-bangers' });
const patrick = Patrick_Hand({ weight: '400', subsets: ['latin'], variable: '--font-patrick' });

export const metadata: Metadata = {
  title: 'Nathan W.',
  description: 'Contact, art and projects, one signpost at a time.',
};

export default function Page() {
  return (
    <main className={`${bangers.variable} ${patrick.variable}`}>
      <Signs />
    </main>
  );
}
