import * as React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { HydraAdmin } from "@api-platform/admin";
import { getToken, isAuthenticated } from "../../jwt-frontend-auth/src/auth/authService";

const AnyHydraAdmin: any = HydraAdmin;

const App = () => {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const token = getToken();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/admin/login");
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) {
    return <p>Loading...</p>;
  }

  // Pass the JWT token to HydraAdmin via custom fetch
  const fetchHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  return (
    <AnyHydraAdmin
      entrypoint={window.origin}
      title="API Platform admin"
      fetchHeaders={fetchHeaders}
    ></AnyHydraAdmin>
  );
};

export default App;