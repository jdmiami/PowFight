import { redirect } from 'next/navigation';
import { isDemo } from '@/lib/env';
import { LoginForm } from './LoginForm';

export const metadata = { title: 'Sign in' };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (isDemo) redirect(next ?? '/me');
  return (
    <div className="space-y-4 pt-8">
      <h1 className="display text-3xl text-center">Take the stage</h1>
      <p className="text-sm text-muted text-center">We&apos;ll email you a magic link. No password.</p>
      <LoginForm next={next ?? '/me'} />
    </div>
  );
}
