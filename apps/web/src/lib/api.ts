import { NextResponse } from 'next/server';
import { currentUser } from './auth';

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function withUser<T>(fn: (user: NonNullable<Awaited<ReturnType<typeof currentUser>>>) => Promise<T>) {
  const user = await currentUser();
  if (!user) return fail('Sign in first', 401);
  try {
    return await fn(user);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Something went wrong';
    return fail(msg, 400);
  }
}
