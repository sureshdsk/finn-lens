import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import type { CalendarDayEvents } from './types'

interface CalendarDayCellProps {
  day: Date
  events: CalendarDayEvents | undefined
  isCurrentMonth: boolean
  isSelected: boolean
  isToday: boolean
  isWeekend: boolean
  maxDailySpend: number
  index: number
  onClick: () => void
}

function getSpendIntensity(totalDebits: number, maxDailySpend: number): number {
  if (maxDailySpend === 0) return 0
  return Math.min(totalDebits / maxDailySpend, 1)
}

export default function CalendarDayCell({
  day,
  events,
  isCurrentMonth,
  isSelected,
  isToday,
  isWeekend,
  maxDailySpend,
  index,
  onClick,
}: CalendarDayCellProps) {
  const hasTransactions = events?.transactions && (events.transactions.debits.length > 0 || events.transactions.credits.length > 0)
  const hasCCBills = (events?.ccBills?.length ?? 0) > 0
  const hasSubs = (events?.subscriptions?.length ?? 0) > 0
  const hasEvents = hasTransactions || hasCCBills || hasSubs
  const totalDebits = events?.transactions?.totalDebits ?? 0
  const totalCredits = events?.transactions?.totalCredits ?? 0
  const intensity = getSpendIntensity(totalDebits, maxDailySpend)
  const col = index % 7
  const isLastCol = col === 6

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.005, duration: 0.15, ease: 'easeOut' }}
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center py-2.5 px-1.5 transition-all duration-150 cursor-pointer group outline-none min-h-[88px]',
        'border-border/30',
        !isLastCol && 'border-r',
        'hover:bg-accent/40',
        !isCurrentMonth && 'opacity-25',
        isCurrentMonth && isWeekend && 'bg-muted/10',
        isSelected && 'bg-primary/[0.07] ring-1 ring-inset ring-primary/30',
        isToday && !isSelected && 'bg-primary/[0.04]',
      )}
    >
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center text-[13px] leading-none mb-1.5 transition-colors',
          isToday && 'bg-primary text-primary-foreground font-bold shadow-sm',
          !isToday && isCurrentMonth && 'text-foreground font-medium group-hover:text-primary',
          !isToday && !isCurrentMonth && 'text-muted-foreground',
        )}
      >
        {format(day, 'd')}
      </div>

      {intensity > 0 && isCurrentMonth && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(to top, rgba(59,130,246,${intensity * 0.1}) 0%, transparent 50%)`,
          }}
        />
      )}

      <div className="flex flex-col items-center gap-1 flex-1 justify-center relative z-10 w-full">
        {hasEvents && isCurrentMonth && (
          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            {hasTransactions && (
              <span
                className={cn(
                  'w-2 h-2 rounded-full transition-transform group-hover:scale-125',
                  totalCredits > 0 && totalDebits === 0
                    ? 'bg-emerald-500'
                    : 'bg-blue-500',
                )}
              />
            )}
            {hasCCBills && <span className="w-2 h-2 rounded-full bg-orange-500 transition-transform group-hover:scale-125" />}
            {hasSubs && <span className="w-2 h-2 rounded-full bg-violet-500 transition-transform group-hover:scale-125" />}
          </div>
        )}

        {totalDebits > 0 && isCurrentMonth && (
          <span className="text-[10px] text-muted-foreground/80 leading-none font-semibold tracking-tight">
            ₹{totalDebits >= 1000 ? `${(totalDebits / 1000).toFixed(1)}k` : Math.round(totalDebits)}
          </span>
        )}

        {hasCCBills && isCurrentMonth && (() => {
          const bills = events?.ccBills ?? []
          const paidOnly = bills.length > 0 && bills.every(b => b.kind === 'paid')
          return (
            <span className={cn(
              'text-[9px] leading-none font-medium px-1.5 py-0.5 rounded-sm',
              paidOnly
                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
                : 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30',
            )}>
              {paidOnly ? 'paid' : 'bill'}
            </span>
          )
        })()}

        {hasSubs && isCurrentMonth && events?.subscriptions && events.subscriptions.length > 0 && (
          <span className="text-[9px] text-violet-600 dark:text-violet-400 leading-none font-medium bg-violet-50 dark:bg-violet-950/30 px-1.5 py-0.5 rounded-sm truncate max-w-full">
            {events.subscriptions[0].icon} {events.subscriptions[0].name}
          </span>
        )}
      </div>
    </motion.button>
  )
}
