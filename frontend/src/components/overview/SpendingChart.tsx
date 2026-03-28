import { useQuery } from "@tanstack/react-query"
import { getMonthlySpendingApi } from "@/api/unified"
import { motion } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"

function fmt(n: number) {
  return `₹${(n / 1000).toFixed(0)}K`
}

const SpendingChart = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['monthly-spending-overview'],
    queryFn: () => getMonthlySpendingApi({}),
  })

  const months = data ?? []
  const incomeData = months.map(m => Number(m.income))
  const expenseData = months.map(m => Number(m.expense))
  const maxVal = Math.max(...incomeData, ...expenseData, 1)

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-foreground">Income vs Expenses</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-md bg-primary/80" />
            <span className="text-xs text-muted-foreground">Income</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-md bg-accent/80" />
            <span className="text-xs text-muted-foreground">Expenses</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full rounded-lg" />
      ) : months.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
      ) : (
        <div className="bg-muted/30 rounded-lg p-3">
          <div className="flex items-end justify-between gap-1.5 h-48">
            {months.map((month, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                <div className="w-full flex items-end justify-center gap-[2px] h-40 relative">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(incomeData[i] / maxVal) * 100}%` }}
                    transition={{ duration: 0.5, delay: 0.1 + i * 0.04 }}
                    className="w-[42%] rounded-t-md bg-primary/80"
                  />
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(expenseData[i] / maxVal) * 100}%` }}
                    transition={{ duration: 0.5, delay: 0.15 + i * 0.04 }}
                    className="w-[42%] rounded-t-md bg-accent/80"
                  />
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-popover border border-border rounded-lg px-2.5 py-1.5 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    <div className="text-xs text-foreground font-medium">{month.month_label}</div>
                    <div className="text-xs text-muted-foreground">In: {fmt(incomeData[i])}</div>
                    <div className="text-xs text-muted-foreground">Out: {fmt(expenseData[i])}</div>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{month.month_label?.slice(0, 3)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default SpendingChart
