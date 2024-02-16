import dynamic from 'next/dynamic';

const ProfileViewExport = dynamic(() => import('./profile-view-frontend'), {
  ssr: false,
});

export default ProfileViewExport;
