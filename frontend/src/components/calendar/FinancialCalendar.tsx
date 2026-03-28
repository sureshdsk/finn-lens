import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { format, isSameMonth, isSameDay, isToday, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns'
import CalendarDayCell from './CalendarDayCell'
import type { CalendarEventsMap } from './types'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface FinancialCalendarProps {
  currentMonth: Date
  eventsMap: CalendarEventsMap
  selectedDate: Date | null
  onDateSelect: (date: Date) => void
  maxDailySpend: number
}

export default function FinancialCalendar({
  currentMonth,
  eventsMap,
  selectedDate,
  onDateSelect,
  maxDailySpend,
}: FinancialCalendarProps) {
  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart)
    const calEnd = endOfWeek(monthEnd)
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentMonth])

  const rowCount = Math.ceil(days.length / 7)

  return (
    <div className="flex flex-col h-full rounded-lg border border-border/60 bg-card overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border/60">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] py-2.5 border-r border-border/30 last:border-r-0">
            {d}
          </div>
        ))}
      </div>

      <motion.div
        key={format(currentMonth, 'yyyy-MM')}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="grid grid-cols-7 flex-1"
        style={{ gridTemplateRows: `repeat(${rowCount}, 1fr)` }}
      >
        {days.map((day, i) => {
          const dateKey = format(day, 'yyyy-MM-dd')
          const events = eventsMap.get(dateKey)
          const isCurrent = isSameMonth(day, currentMonth)
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
          const today = isToday(day)
          const isWeekend = day.getDay() === 0 || day.getDay() === 6

          return (
            <CalendarDayCell
              key={dateKey}
              day={day}
              events={events}
              isCurrentMonth={isCurrent}
              isSelected={isSelected}
              isToday={today}
              isWeekend={isWeekend}
              maxDailySpend={maxDailySpend}
              index={i}
              onClick={() => onDateSelect(day)}
            />
          )
        })}
      </motion.div>
    </div>
  )
}
