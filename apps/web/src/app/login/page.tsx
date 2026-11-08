import { redirect } from 'next/navigation';
import { isDemo } from '@/lib/env';
import { LoginForm } from './LoginForm';
import { Page } from '@/components/Page';
import { Wordmark } from '@/components/Wordmark';

export const metadata = { title: 'Sign in' };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (isDemo) redirect(next ?? '/me');
  return (
    <Page>
      <div className="flex justify-center pt-10 pb-6"><Wordmark /></div>
      <h1 className="t-title text-center">Take the stage</h1>
      <p className="text-sm text-ink-2 text-center mt-1 mb-6">We’ll email you a link. No password.</p>
      <LoginForm next={next ?? '/me'} />
    </Page>
  );
}
