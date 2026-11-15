import { RevisionSession } from '@/components/revision-session';
import { Repeat } from 'lucide-react';

export const metadata = { title: 'Spaced repetition · QuantFoundry' };

export default function RevisionPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-6 py-8">
      <header className="page-hero mb-6">
        <span className="icon-tile icon-tile-violet"><Repeat /></span>
        <div>
          <h1>Spaced repetition</h1>
          <p className="page-sub">Review due flashcards and missed knowledge checks with SM-2 scheduling</p>
        </div>
      </header>
      <RevisionSession />
    </div>
  );
}
