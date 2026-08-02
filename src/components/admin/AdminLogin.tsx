import AdminUsers from '@/components/admin/AdminUsers';

export default function AdminLogin() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-heading font-semibold">All Users</h2>
        <p className="text-sm text-muted-foreground">
          Every account that can sign in to the platform.
        </p>
      </div>
      <AdminUsers />
    </div>
  );
}
