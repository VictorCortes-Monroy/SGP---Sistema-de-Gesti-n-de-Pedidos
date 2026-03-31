import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  DollarSign,
  Users,
  Building2,
  MapPin,
  ShieldCheck,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  Wrench,
  HardHat,
  Truck,
  Bell,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { useMaintAlertCount } from '@/hooks/use-maintenance'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const mainNav: NavItem[] = [
  { label: 'Inicio', href: '/', icon: LayoutDashboard },
  { label: 'Solicitudes de Pedido', href: '/solicitudes', icon: FileText },
  { label: 'Presupuestos', href: '/presupuestos', icon: DollarSign },
]

const maintNav: NavItem[] = [
  { label: 'Dashboard', href: '/mantencion', icon: Wrench },
  { label: 'Equipos', href: '/equipos', icon: Truck },
  { label: 'Solicitudes de Mantención', href: '/mantencion/solicitudes', icon: HardHat },
  { label: 'Alertas SLA', href: '/mantencion/alertas', icon: Bell },
]

const adminNav: NavItem[] = [
  { label: 'Usuarios', href: '/admin/usuarios', icon: Users },
  { label: 'Empresas', href: '/admin/empresas', icon: Building2 },
  { label: 'Centros de Costo', href: '/admin/centros-costo', icon: MapPin },
  { label: 'Matriz Aprobacion', href: '/admin/matriz-aprobacion', icon: ShieldCheck },
  { label: 'Auditoria', href: '/admin/auditoria', icon: ScrollText },
]

const MAINT_ROLES = ['Admin', 'maintenance_planner', 'maintenance_chief']

export function Sidebar() {
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const isAdmin = user?.role_name === 'Admin'
  const isMaintenance = MAINT_ROLES.includes(user?.role_name ?? '')
  const { data: alertCountData } = useMaintAlertCount()
  const alertCount = isMaintenance ? (alertCountData?.count ?? 0) : 0

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
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {mainNav.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              active={item.href === '/' ? location.pathname === '/' : location.pathname.startsWith(item.href)}
              collapsed={collapsed}
            />
          ))}

          {/* Maintenance section */}
          {isMaintenance && (
            <>
              <Separator className="my-3" />
              <div className={cn('px-2 py-1', collapsed && 'sr-only')}>
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  Mantencion
                </span>
              </div>
              {maintNav.map((item) => (
                <SidebarLink
                  key={item.href}
                  item={item}
                  active={
                    item.href === '/mantencion'
                      ? location.pathname === '/mantencion'
                      : location.pathname.startsWith(item.href)
                  }
                  collapsed={collapsed}
                  badge={item.href === '/mantencion/alertas' && alertCount > 0 ? alertCount : undefined}
                />
              ))}
            </>
          )}

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
  badge,
}: {
  item: NavItem
  active: boolean
  collapsed: boolean
  badge?: number
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
      <span className="relative shrink-0">
        <item.icon className="h-4 w-4" />
        {badge && collapsed && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>
      {!collapsed && <span className="flex-1">{item.label}</span>}
      {!collapsed && badge ? (
        <Badge variant="destructive" className="h-5 min-w-5 px-1 text-xs">
          {badge > 99 ? '99+' : badge}
        </Badge>
      ) : null}
    </Link>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}{badge ? ` (${badge})` : ''}</TooltipContent>
      </Tooltip>
    )
  }

  return link
}
