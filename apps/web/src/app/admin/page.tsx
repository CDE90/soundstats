import { AdminDashboard } from "./_components/admin-dashboard";
import { checkAdminAccess } from "./check-admin";

export default async function AdminPage() {
    await checkAdminAccess();

    return <AdminDashboard />;
}
