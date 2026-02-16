import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  DollarSign,
  Users,
  Building2,
  MapPin,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
}

const mainNav: NavItem[] = [
  { label: 'Inicio', href: '/', icon: LayoutDashboard },
  { label: 'Solicitudes', href: '/solicitudes', icon: FileText },
  { label: 'Presupuestos', href: '/presupuestos', icon: DollarSign },
]

const adminNav: NavItem[] = [
  { label: 'Usuarios', href: '/admin/usuarios', icon: Users, adminOnly: true },
  { label: 'Empresas', href: '/admin/empresas', icon: Building2, adminOnly: true },
  { label: 'Centros de Costo', href: '/admin/centros-costo', icon: MapPin, adminOnly: true },
  { label: 'Matriz Aprobacion', href: '/admin/matriz-aprobacion', icon: ShieldCheck, adminOnly: true },
]

export function Sidebar() {
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const isAdmin = user?.role_name === 'Admin'

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'flex h-screen flex-col border-r bg-background transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center border-b px-4">
          {!collapsed && (
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                SP
              </div>
              <span className="font-semibold text-lg">SGP</span>
            </Link>
          )}
          {collapsed && (
            <Link to="/" className="mx-auto">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                SP
              </div>
            </Link>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2">
          {mainNav.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              active={item.href === '/' ? location.pathname === '/' : location.pathname.startsWith(item.href)}
              collapsed={collapsed}
            />
          ))}

          {isAdmin && (
            <>
              <Separator className="my-3" />
              <div className={cn('px-2 py-1', collapsed && 'sr-only')}>
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  Administracion
                </span>
              </div>
              {adminNav.map((item) => (
                <SidebarLink
                  key={item.href}
                  item={item}
                  active={location.pathname.startsWith(item.href)}
                  collapsed={collapsed}
                />
              ))}
            </>
          )}
        </nav>

        {/* Collapse toggle */}
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="w-full"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  )
}

function SidebarLink({
  item,
  active,
  collapsed,
}: {
  item: NavItem
  active: boolean
  collapsed: boolean
}) {
  const link = (
    <Link
      to={item.href}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        collapsed && 'justify-center px-2'
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    )
  }

  return link
}
