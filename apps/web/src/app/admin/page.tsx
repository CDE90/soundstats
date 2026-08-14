import { AdminDashboard } from "./_components/admin-dashboard";
import { checkAdminAccess } from "./check-admin";

const adminTabs = [
    "overview",
    "users",
    "invites",
    "friends",
    "analytics",
] as const;
const analyticsViews = ["activity", "content", "users", "growth"] as const;

export default async function AdminPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string; view?: string }>;
}) {
    await checkAdminAccess();

    const params = await searchParams;
    const activeTab = adminTabs.includes(
        params.tab as (typeof adminTabs)[number],
    )
        ? (params.tab as (typeof adminTabs)[number])
        : "overview";
    const analyticsView = analyticsViews.includes(
        params.view as (typeof analyticsViews)[number],
    )
        ? (params.view as (typeof analyticsViews)[number])
        : "activity";

    return (
        <AdminDashboard activeTab={activeTab} analyticsView={analyticsView} />
    );
}
