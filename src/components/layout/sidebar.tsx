'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Users, FileText, Receipt, Settings, Package } from 'lucide-react'

const navItems = [
  { href: '/',              label: 'Inicio',        icon: LayoutDashboard, exact: true },
  { href: '/clientes',      label: 'Clientes',      icon: Users },
  { href: '/productos',     label: 'Catálogo',      icon: Package },
  { href: '/presupuestos',  label: 'Presupuestos',  icon: FileText },
  { href: '/facturas',      label: 'Facturas',      icon: Receipt },
  { href: '/configuracion', label: 'Config',        icon: Settings },
]

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href
  return pathname.startsWith(href)
}

// ── Sidebar escritorio ──────────────────────────────────────────────
export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex w-[220px] flex-shrink-0 bg-white border-r border-slate-200 flex-col">
      <div className="h-[60px] flex items-center px-5 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Receipt className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-slate-900 text-sm">CristaleriaERP</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(pathname, item.href, item.exact)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <Icon className={cn('w-4 h-4 flex-shrink-0', active ? 'text-blue-600' : 'text-slate-400')} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-3 border-t border-slate-200">
        <p className="text-xs text-slate-400 px-3">v0.1.0</p>
      </div>
    </aside>
  )
}

// ── Barra inferior móvil ────────────────────────────────────────────
export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200
                    flex items-stretch safe-area-pb">
      {navItems.map((item) => {
        const Icon = item.icon
        const active = isActive(pathname, item.href, item.exact)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors',
              active ? 'text-blue-600' : 'text-slate-400'
            )}
          >
            <Icon className={cn('w-5 h-5', active ? 'text-blue-600' : 'text-slate-400')} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
