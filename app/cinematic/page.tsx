import { CinematicExperience } from '@/components/cinematic-experience';

// The photoreal rainy-supercar landing sequence (see docs/cinematic-pipeline.md).
// Kept on its own route so it can be viewed alongside whatever app/page.tsx renders.
export default function CinematicPage() {
  return <CinematicExperience />;
}
