import { protectPage } from '@/modules/account/protect-page';

export default async function Home() {
  const user = await protectPage();

  return <p>Hello {user.email}</p>;
}
