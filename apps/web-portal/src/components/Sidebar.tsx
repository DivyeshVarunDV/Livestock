import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Tractor, 
  PawPrint, 
  Syringe, 
  FileText, 
  Clock, 
  ShieldCheck, 
  FlaskConical, 
  BarChart3, 
  Users, 
  Settings,
  Shield
} from 'lucide-react';

export default function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (val: boolean) => void }) {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Farms', href: '/farms', icon: Tractor },
    { name: 'Animals', href: '/animals', icon: PawPrint },
    { name: 'Treatments', href: '/treatments', icon: Syringe },
    { name: 'Prescriptions', href: '/prescriptions', icon: FileText },
    { name: 'Withdrawal Monitoring', href: '/withdrawal', icon: Clock },
    { name: 'MRL Compliance', href: '/mrl', icon: ShieldCheck },
    { name: 'Laboratory', href: '/lab', icon: FlaskConical },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
    { name: 'Users', href: '/users', icon: Users },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden" 
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside 
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-[240px] bg-[#064E3B] text-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center gap-3 px-5 py-6 border-b border-white/10">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 text-emerald-400">
            <Shield size={20} />
          </div>
          <div>
            <h1 className="text-[15px] font-bold leading-tight">LivestoCare</h1>
            <p className="text-[10px] text-emerald-200/70 font-medium leading-tight mt-0.5">Digital Farm Management &amp;<br/>MRL Compliance</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${
                  isActive 
                    ? 'bg-[#166534] text-white' 
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
                onClick={() => setIsOpen(false)}
              >
                <item.icon size={18} className={isActive ? 'text-emerald-400' : 'text-gray-400'} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
