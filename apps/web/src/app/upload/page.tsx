import { currentUser, isStoryteller } from '@/lib/auth';
import { UploadScript } from '@/components/UploadScript';
import { isDemo } from '@/lib/env';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Stage a play' };

export default async function UploadPage() {
  const user = await currentUser();
  const can = isDemo || isStoryteller(user);
  return (
    <div className="space-y-4">
      <h1 className="display text-3xl">Stage a play</h1>
      <p className="text-sm text-muted">Upload any script. We find the characters and their lines, pick audition sides for every role, and open casting. Works with Project Gutenberg EPUBs, plain text with speaker cues, and Fountain.</p>
      {!user && !isDemo && <p className="card p-4 text-sm"><Link href="/login?next=/upload" className="text-gold underline">Sign in</Link> to stage a play.</p>}
      <UploadScript canUpload={can} />
    </div>
  );
}
