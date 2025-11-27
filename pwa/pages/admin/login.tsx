import type { NextPage } from 'next';
import dynamic from 'next/dynamic';

// Load the LoginPage component client-side
const LoginPage = dynamic(() => import('../../components/admin/LoginPage').then(m => m.LoginPage), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

const AdminLogin: NextPage = () => <LoginPage />;

export default AdminLogin;
