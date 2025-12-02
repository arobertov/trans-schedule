import type { NextPage } from 'next';
import dynamic from 'next/dynamic';

// Load the EditUserPage component client-side
const EditUserPage = dynamic(() => import('../../../../components/admin/EditUserPage').then(m => m.EditUserPage), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

const AdminEditUser: NextPage = () => <EditUserPage />;

export default AdminEditUser;
