import { getData } from '@/lib/data';
import { currentUser } from '@/lib/auth';
import { Feed, type FeedReel } from '@/components/Feed';
import { clipUrl } from '@/lib/storage';
import { Wordmark } from '@/components/Wordmark';

export const dynamic = 'force-dynamic';

export async function resolveReels(items: Awaited<ReturnType<Awaited<ReturnType<typeof getData>>['listFeed']>>): Promise<FeedReel[]> {
  return Promise.all(items.map(async (it) => {
    const urls = it.audition.stitchedUrl ? [it.audition.stitchedUrl] : (await Promise.all(it.clipPaths.map(clipUrl))).filter((u): u is string => Boolean(u));
    return { ...it, mediaUrls: urls, posterUrl: it.audition.posterUrl };
  }));
}

export default async function Home() {
  const data = await getData();
  const [items, user] = await Promise.all([data.listFeed({ limit: 40 }), currentUser()]);
  const reels = await resolveReels(items);
  const votes: Record<string, string> = {};
  if (user) for (const pid of new Set(items.map((i) => i.production.id))) Object.assign(votes, await data.getMyVotes(pid, user.id));
  return <Feed reels={reels} myVotes={votes} viewerId={user?.id} signedIn={Boolean(user)} header={<div className="flex justify-center"><Wordmark /></div>} />;
}
