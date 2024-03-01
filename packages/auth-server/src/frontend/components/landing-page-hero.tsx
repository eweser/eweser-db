import Image from 'next/image';

export default function LandingPageHero() {
  return (
    <>
      <div className="relative flex flex-1 w-full min-h-40 max-w-sm">
        <Image
          src="/eweser-db-logo.png"
          alt="eweser-db-logo"
          fill
          className="object-contain"
        />
      </div>

      <p className="text-lg text-white">A user-owned database. Just for ewe</p>
    </>
  );
}
