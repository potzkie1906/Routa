import AdminPageHeader from '../../components/admin/AdminPageHeader'
import BarChart from '../../components/admin/BarChart'
import ErrorMessage from '../../components/ErrorMessage'
import LoadingSpinner from '../../components/LoadingSpinner'
import { useApiData } from '../../hooks/useApiData'
import { getAdminStats } from '../../services/adminService'
import type { AdminStats } from '../../types/Admin'

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </div>
  )
}

function Charts({ stats }: { stats: AdminStats }) {
  return (
    <div className="mt-6">
      <BarChart
        title="Routes"
        data={[
          { label: 'Active routes', value: stats.activeRoutes, color: '#16a34a' },
          { label: 'Not active', value: stats.totalRoutes - stats.activeRoutes, color: '#94a3b8' },
        ]}
      />
    </div>
  )
}

// defined outside the component so useApiData does not reload on every render
export default function Dashboard() {
  const { state, reload } = useApiData(getAdminStats)

  return (
    <section>
      <AdminPageHeader title="Dashboard" description="An overview of the sample data. (Demo data: fictional.)" />
      {state.status === 'loading' && <LoadingSpinner />}
      {state.status === 'error' && <ErrorMessage message={state.message} onRetry={reload} />}
      {state.status === 'success' && (
        <>
                    {/* no vehicle numbers: Routa has no screen to add vehicles yet */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Routes" value={state.data.totalRoutes} />
            <StatCard label="Stops" value={state.data.totalStops} />
            <StatCard label="Users" value={state.data.totalUsers} />
            <StatCard label="Active routes" value={state.data.activeRoutes} />
            <StatCard label="Active alerts" value={state.data.activeAlerts} />
            <StatCard label="Open reports" value={state.data.openReports} />
          </div>
          <Charts stats={state.data} />
        </>
      )}
    </section>
  )
}
