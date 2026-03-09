import type { NextPage } from "next";
import dynamic from "next/dynamic";

const App = dynamic(() => import("../../components/admin/App").then((mod) => mod.default), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

const Admin: NextPage = () => <App />;

export default Admin;
