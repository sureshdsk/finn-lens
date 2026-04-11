import { motion } from 'framer-motion'
import { X, ArrowUpRight, ArrowDownRight, CreditCard, Repeat, Receipt, IndianRupee, CalendarCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, isToday } from 'date-fns'
import type { CalendarDayEvents } from './types'

interface DayDetailPanelProps {
  date: Date
  events: CalendarDayEvents | undefined
  onClose: () => void
}

const fmt = (n: number) =>
  `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

export default function DayDetailPanel({ date, events, onClose }: DayDetailPanelProps) {
  const tx = events?.transactions
  const bills = events?.ccBills ?? []
  const subs = events?.subscriptions ?? []
  const hasData = tx || bills.length > 0 || subs.length > 0
  const today = isToday(date)

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="h-full bg-card flex flex-col overflow-hidden w-full"
    >
      {/* Header */}
      <div className="relative px-5 pt-5 pb-4 shrink-0">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-end gap-3">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-primary uppercase leading-none">{format(date, 'EEE')}</span>
            <span className="text-xl font-bold text-primary leading-tight mt-0.5">{format(date, 'd')}</span>
          </div>
          <div className="pb-0.5">
            <h3 className="text-base font-bold text-foreground leading-tight">
              {format(date, 'EEEE')}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(date, 'MMMM d, yyyy')}
              {today && <span className="ml-2 text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">Today</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Spending summary cards */}
      {tx && (tx.totalDebits > 0 || tx.totalCredits > 0) && (
        <div className="px-5 pb-4 shrink-0">
          <div className="grid grid-cols-2 gap-2.5">
            {tx.totalDebits > 0 && (
              <div className="rounded-xl bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-950/20 dark:to-rose-950/10 p-3 border border-rose-200/30 dark:border-rose-800/20">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded-md bg-rose-500/15 flex items-center justify-center">
                    <ArrowDownRight className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  </div>
                  <span className="text-[10px] font-medium text-rose-600/70 dark:text-rose-400/70 uppercase tracking-wider">Spent</span>
                </div>
                <div className="text-lg font-bold text-rose-700 dark:text-rose-300 tracking-tight privacy-mask">{fmt(tx.totalDebits)}</div>
                <div className="text-[10px] text-rose-500/60 dark:text-rose-400/50 mt-0.5">{tx.debits.length} transaction{tx.debits.length !== 1 ? 's' : ''}</div>
              </div>
            )}
            {tx.totalCredits > 0 && (
              <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-950/10 p-3 border border-emerald-200/30 dark:border-emerald-800/20">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded-md bg-emerald-500/15 flex items-center justify-center">
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-[10px] font-medium text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-wider">Received</span>
                </div>
                <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300 tracking-tight privacy-mask">{fmt(tx.totalCredits)}</div>
                <div className="text-[10px] text-emerald-500/60 dark:text-emerald-400/50 mt-0.5">{tx.credits.length} credit{tx.credits.length !== 1 ? 's' : ''}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-5">
        {!hasData && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
              <Receipt className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No financial activity</p>
            <p className="text-[11px] text-muted-foreground/60 mt-0.5">This day has no transactions or events</p>
          </div>
        )}

        {tx && tx.debits.length > 0 && (
          <Section title="Transactions" count={tx.debits.length} icon={<IndianRupee className="w-3.5 h-3.5" />} color="text-blue-600 dark:text-blue-400" bgColor="bg-blue-500/10">
            {tx.debits.map((t, i) => (
              <div key={t.id} className={cn(
                'flex items-center justify-between py-2.5',
                i !== tx.debits.length - 1 && 'border-b border-border/40',
              )}>
                <div className="min-w-0 flex-1 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">DR</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium text-foreground truncate">{t.merchant || t.description}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{t.category}</div>
                  </div>
                </div>
                <span className="text-[12px] font-bold text-rose-600 dark:text-rose-400 ml-3 shrink-0">
                  <span className="privacy-mask">-{fmt(t.amount)}</span>
                </span>
              </div>
            ))}
          </Section>
        )}

        {tx && tx.credits.length > 0 && (
          <Section title="Credits" count={tx.credits.length} icon={<ArrowUpRight className="w-3.5 h-3.5" />} color="text-emerald-600 dark:text-emerald-400" bgColor="bg-emerald-500/10">
            {tx.credits.map((t, i) => (
              <div key={t.id} className={cn(
                'flex items-center justify-between py-2.5',
                i !== tx.credits.length - 1 && 'border-b border-border/40',
              )}>
                <div className="min-w-0 flex-1 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">CR</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium text-foreground truncate">{t.merchant || t.description}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{t.category}</div>
                  </div>
                </div>
                <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400 ml-3 shrink-0">
                  <span className="privacy-mask">+{fmt(t.amount)}</span>
                </span>
              </div>
            ))}
          </Section>
        )}

        {bills.length > 0 && (
          <Section title="Credit Card Bills" count={bills.length} icon={<CreditCard className="w-3.5 h-3.5" />} color="text-orange-600 dark:text-orange-400" bgColor="bg-orange-500/10">
            {bills.map((b, i) => (
              <div key={`${b.id}-${b.kind}`} className={cn(
                'flex items-center justify-between py-2.5',
                i !== bills.length - 1 && 'border-b border-border/40',
              )}>
                <div className="min-w-0 flex-1 flex items-center gap-2.5">
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                    b.kind === 'paid'
                      ? 'bg-emerald-50 dark:bg-emerald-950/20'
                      : 'bg-orange-50 dark:bg-orange-950/20',
                  )}>
                    {b.kind === 'paid'
                      ? <CalendarCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      : <CreditCard className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                    }
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium text-foreground">{b.cardLabel}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {b.kind === 'paid'
                        ? b.paidDate
                          ? <>Paid on {format(new Date(b.paidDate), 'MMM d, yyyy')}</>
                          : 'Payment recorded'
                        : <>Due {format(new Date(b.dueDate), 'MMM d, yyyy')}</>
                      }
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 ml-3 shrink-0">
                  <span className="text-[12px] font-bold text-foreground privacy-mask">{fmt(b.totalDue)}</span>
                  <span className={cn(
                    'text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider',
                    b.kind === 'paid'
                      ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                      : b.isPaid
                        ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                        : 'bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400',
                  )}>
                    {b.kind === 'paid' ? 'Paid' : b.isPaid ? 'Paid' : 'Due'}
                  </span>
                </div>
              </div>
            ))}
          </Section>
        )}

        {subs.length > 0 && (
          <Section title="Subscriptions" count={subs.length} icon={<Repeat className="w-3.5 h-3.5" />} color="text-violet-600 dark:text-violet-400" bgColor="bg-violet-500/10">
            {subs.map((s, i) => (
              <div key={s.id} className={cn(
                'flex items-center justify-between py-2.5',
                i !== subs.length - 1 && 'border-b border-border/40',
              )}>
                <div className="min-w-0 flex-1 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950/20 flex items-center justify-center text-base shrink-0">
                    {s.icon || '💳'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium text-foreground">{s.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 capitalize">{s.cycle} renewal</div>
                  </div>
                </div>
                <span className="text-[12px] font-bold text-foreground ml-3 shrink-0 privacy-mask">{fmt(s.cost)}</span>
              </div>
            ))}
          </Section>
        )}
      </div>
    </motion.div>
  )
}

function Section({ title, count, icon, color, bgColor, children }: {
  title: string
  count: number
  icon: React.ReactNode
  color: string
  bgColor: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <div className={cn('w-6 h-6 rounded-md flex items-center justify-center', bgColor, color)}>
          {icon}
        </div>
        <span className="text-[11px] font-semibold text-foreground">{title}</span>
        <span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-md font-medium">{count}</span>
      </div>
      <div>{children}</div>
    </div>
  )
}
