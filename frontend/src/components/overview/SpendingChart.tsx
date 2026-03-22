import { motion } from "framer-motion"
import { mockMonthlyData } from "@/data/mockData"

const months = mockMonthlyData.map(m => m.month)
const incomeData = mockMonthlyData.map(m => m.income / 1000)
const expenseData = mockMonthlyData.map(m => m.expense / 1000)
const maxVal = Math.max(...incomeData, ...expenseData)

const SpendingChart = () => {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-foreground">Income vs Expenses</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-primary/80" />
            <span className="text-xs text-muted-foreground">Income</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-accent/80" />
            <span className="text-xs text-muted-foreground">Expenses</span>
          </div>
        </div>
      </div>
      <div className="bg-muted/30 rounded-lg p-3">
        <div className="flex items-end justify-between gap-1.5 h-48">
          {months.map((month, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full flex items-end justify-center gap-[2px] h-40">
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
              </div>
              <span className="text-xs text-muted-foreground">{month}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SpendingChart
