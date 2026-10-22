import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySessionToken, COOKIE_NAME } from '@/lib/auth';

export default async function HomePage() {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    const session = await verifySessionToken(token);
    if (session) {
      redirect('/overview');
    }
  }

  redirect('/login');
}
