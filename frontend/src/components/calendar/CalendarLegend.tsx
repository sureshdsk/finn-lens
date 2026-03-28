const items = [
  { label: 'Transactions', color: 'bg-blue-500' },
  { label: 'CC Bills', color: 'bg-orange-500' },
  { label: 'Subscriptions', color: 'bg-violet-500' },
]

export default function CalendarLegend() {
  return (
    <div className="flex items-center gap-1 bg-muted/40 rounded-lg px-3 py-1.5 border border-border/40">
      {items.map((item, i) => (
        <div key={item.label} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-border/60 mr-1">|</span>}
          <span className={`w-2 h-2 rounded-full ${item.color}`} />
          <span className="text-[10px] font-medium text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  )
}
