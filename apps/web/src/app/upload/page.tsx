import Link from 'next/link';
import { currentUser, isStoryteller } from '@/lib/auth';
import { UploadScript } from '@/components/UploadScript';
import { isDemo } from '@/lib/env';
import { Page } from '@/components/Page';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Stage a play' };

export default async function UploadPage() {
  const user = await currentUser();
  const can = isDemo || isStoryteller(user);
  return (
    <Page back={{ href: '/me', label: 'Me' }} title="Stage a play">
      <p className="text-sm text-ink-2 -mt-2 mb-5">Upload any script. We find the characters and their lines, pick audition sides for every role, and open casting. Works with Project Gutenberg EPUBs, plain text with speaker cues, and Fountain.</p>
      {!user && !isDemo && <p className="card p-4 text-sm mb-4"><Link href="/login?next=/upload" className="text-spot">Sign in</Link> to stage a play.</p>}
      <UploadScript canUpload={can} />
    </Page>
  );
}
