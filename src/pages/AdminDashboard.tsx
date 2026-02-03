import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  ClipboardList, 
  GraduationCap, 
  Heart, 
  BarChart3, 
  BookOpen, 
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AdminUsers from '@/components/admin/AdminUsers';
import AdminRegistrations from '@/components/admin/AdminRegistrations';
import AdminStudents from '@/components/admin/AdminStudents';
import AdminVolunteers from '@/components/admin/AdminVolunteers';
import AdminStats from '@/components/admin/AdminStats';
import AdminEbooks from '@/components/admin/AdminEbooks';
import AdminSettings from '@/components/admin/AdminSettings';

type TabId = 'users' | 'registrations' | 'students' | 'volunteers' | 'stats' | 'ebooks' | 'settings';

const tabs = [
  { id: 'users' as TabId, label: 'Users', icon: Users },
  { id: 'registrations' as TabId, label: 'Registrations', icon: ClipboardList },
  { id: 'students' as TabId, label: 'Students', icon: GraduationCap },
  { id: 'volunteers' as TabId, label: 'Volunteers', icon: Heart },
  { id: 'stats' as TabId, label: 'Stats', icon: BarChart3 },
  { id: 'ebooks' as TabId, label: 'eBooks', icon: BookOpen },
  { id: 'settings' as TabId, label: 'Settings', icon: Settings },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('users');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { signOut } = useAuth();

  const renderContent = () => {
    switch (activeTab) {
      case 'users':
        return <AdminUsers />;
      case 'registrations':
        return <AdminRegistrations />;
      case 'students':
        return <AdminStudents />;
      case 'volunteers':
        return <AdminVolunteers />;
      case 'stats':
        return <AdminStats />;
      case 'ebooks':
        return <AdminEbooks />;
      case 'settings':
        return <AdminSettings />;
      default:
        return <AdminUsers />;
    }
  };

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transition-transform duration-200 md:relative md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-heading font-bold text-lg">eBookBuddy</h1>
                <p className="text-xs text-muted-foreground">Admin Dashboard</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-muted-foreground"
              onClick={signOut}
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {/* Mobile Header */}
        <header className="sticky top-0 z-40 bg-background border-b p-4 md:hidden">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <h1 className="font-heading font-bold">
              {tabs.find(t => t.id === activeTab)?.label}
            </h1>
            <div className="w-10" />
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          <div className="hidden md:block mb-6">
            <h1 className="text-2xl font-heading font-bold">
              {tabs.find(t => t.id === activeTab)?.label}
            </h1>
          </div>
          {renderContent()}
        </div>
      </main>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
