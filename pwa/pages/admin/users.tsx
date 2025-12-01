import type { NextPage } from 'next';
import dynamic from 'next/dynamic';

// Load the UsersListPage component client-side
const UsersListPage = dynamic(() => import('../../components/admin/UsersListPage').then(m => m.UsersListPage), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

const AdminUsers: NextPage = () => <UsersListPage />;

export default AdminUsers;
