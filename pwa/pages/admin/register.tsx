import type { NextPage } from 'next';
import dynamic from 'next/dynamic';

// Load the RegisterPage component client-side
const RegisterPage = dynamic(() => import('../../components/admin/RegisterPage').then(m => m.RegisterPage), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

const AdminRegister: NextPage = () => <RegisterPage />;

export default AdminRegister;
