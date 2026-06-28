import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar, BottomNav } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar solo en escritorio */}
      <Sidebar />

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto">
          {/* Padding inferior extra en móvil para la barra de nav */}
          <div className="p-4 md:p-6 max-w-7xl mx-auto pb-24 md:pb-6">
            {children}
          </div>
        </main>
      </div>

      {/* Barra inferior solo en móvil */}
      <BottomNav />
    </div>
  )
}
