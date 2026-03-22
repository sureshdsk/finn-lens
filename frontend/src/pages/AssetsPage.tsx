import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, Check, Pencil, Trash2, TrendingUp, TrendingDown,
  MapPin, ChevronDown, ChevronUp, Landmark, Gem, Building2,
  Car, Watch, Package,
} from "lucide-react";

interface Asset {
  id: string;
  name: string;
  type: "land" | "gold" | "property" | "vehicle" | "collectible" | "other";
  purchaseDate: string;
  purchasePrice: number;
  currentValue: number;
  location?: string;
  description: string;
  documents: string[];
  appreciationRate: number; // annual %
  color: string;
}

const typeConfig: Record<string, { label: string; icon: typeof Landmark; color: string }> = {
  land: { label: "LAND", icon: MapPin, color: "hsl(145 100% 50%)" },
  gold: { label: "GOLD", icon: Gem, color: "hsl(45 90% 55%)" },
  property: { label: "PROPERTY", icon: Building2, color: "hsl(175 100% 50%)" },
  vehicle: { label: "VEHICLE", icon: Car, color: "hsl(270 80% 65%)" },
  collectible: { label: "COLLECTIBLE", icon: Watch, color: "hsl(320 100% 60%)" },
  other: { label: "OTHER", icon: Package, color: "hsl(200 90% 55%)" },
};

const initialAssets: Asset[] = [
  {
    id: "a1", name: "Farmland - Nashik", type: "land", purchaseDate: "2019-03-15",
    purchasePrice: 2400000, currentValue: 4200000, location: "Nashik, Maharashtra",
    description: "2 acres agricultural land near Nashik highway. Irrigated with borewell.",
    documents: ["Sale Deed", "7/12 Extract", "Tax Receipt"], appreciationRate: 12,
    color: "hsl(145 100% 50%)",
  },
  {
    id: "a2", name: "Gold Jewelry", type: "gold", purchaseDate: "2020-11-01",
    purchasePrice: 480000, currentValue: 720000, location: "Bank Locker - HDFC",
    description: "150g gold jewelry (22K). Necklace, bangles, and earrings.",
    documents: ["Purchase Invoice", "Hallmark Certificate"], appreciationRate: 14,
    color: "hsl(45 90% 55%)",
  },
  {
    id: "a3", name: "2BHK Flat - Pune", type: "property", purchaseDate: "2022-06-20",
    purchasePrice: 5500000, currentValue: 6800000, location: "Hinjewadi, Pune",
    description: "2BHK flat, 950 sqft. Currently rented at ₹18,000/month.",
    documents: ["Sale Deed", "Registration", "Society NOC", "Property Tax"], appreciationRate: 8,
    color: "hsl(175 100% 50%)",
  },
  {
    id: "a4", name: "Gold Coins (24K)", type: "gold", purchaseDate: "2021-04-14",
    purchasePrice: 200000, currentValue: 310000, location: "Home Safe",
    description: "40g gold coins (24K), 5 x 8g each. Investment grade.",
    documents: ["Purchase Invoice"], appreciationRate: 15,
    color: "hsl(45 90% 55%)",
  },
  {
    id: "a5", name: "Royal Enfield Classic 350", type: "vehicle", purchaseDate: "2023-01-10",
    purchasePrice: 210000, currentValue: 155000, location: "Home",
    description: "2023 model, 12,000 km driven. Good condition.",
    documents: ["RC", "Insurance", "Purchase Invoice"], appreciationRate: -12,
    color: "hsl(270 80% 65%)",
  },
  {
    id: "a6", name: "Vintage Watch - Omega", type: "collectible", purchaseDate: "2018-09-01",
    purchasePrice: 85000, currentValue: 145000, location: "Home Safe",
    description: "Omega Seamaster 1968, restored. Collector's piece.",
    documents: ["Certificate of Authenticity", "Service Record"], appreciationRate: 10,
    color: "hsl(320 100% 60%)",
  },
];

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const typeOptions = Object.keys(typeConfig) as Asset["type"][];

const AssetsPage = () => {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"all" | Asset["type"]>("all");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form state
  const [fName, setFName] = useState("");
  const [fType, setFType] = useState<Asset["type"]>("land");
  const [fPurchaseDate, setFPurchaseDate] = useState("");
  const [fPurchasePrice, setFPurchasePrice] = useState("");
  const [fCurrentValue, setFCurrentValue] = useState("");
  const [fLocation, setFLocation] = useState("");
  const [fDescription, setFDescription] = useState("");

  const filtered = assets.filter((a) => filterType === "all" || a.type === filterType);

  const totalPurchase = assets.reduce((s, a) => s + a.purchasePrice, 0);
  const totalCurrent = assets.reduce((s, a) => s + a.currentValue, 0);
  const totalGain = totalCurrent - totalPurchase;
  const totalPct = totalPurchase > 0 ? ((totalGain / totalPurchase) * 100).toFixed(1) : "0";

  // Breakdown by type
  const breakdown = Object.entries(
    assets.reduce((acc, a) => {
      acc[a.type] = (acc[a.type] || 0) + a.currentValue;
      return acc;
    }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]);

  const openAdd = () => {
    setEditId(null);
    setFName(""); setFType("land"); setFPurchaseDate(""); setFPurchasePrice("");
    setFCurrentValue(""); setFLocation(""); setFDescription("");
    setShowForm(true);
  };

  const openEdit = (a: Asset) => {
    setEditId(a.id);
    setFName(a.name); setFType(a.type); setFPurchaseDate(a.purchaseDate);
    setFPurchasePrice(String(a.purchasePrice)); setFCurrentValue(String(a.currentValue));
    setFLocation(a.location || ""); setFDescription(a.description);
    setShowForm(true);
  };

  const save = () => {
    const pp = parseInt(fPurchasePrice);
    const cv = parseInt(fCurrentValue);
    if (!fName || !pp || !cv) return;
    const years = fPurchaseDate
      ? (new Date("2026-03-08").getTime() - new Date(fPurchaseDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      : 1;
    const appRate = years > 0 ? ((cv / pp) ** (1 / years) - 1) * 100 : 0;

    if (editId) {
      setAssets((prev) => prev.map((a) => a.id === editId ? {
        ...a, name: fName, type: fType, purchaseDate: fPurchaseDate || a.purchaseDate,
        purchasePrice: pp, currentValue: cv, location: fLocation, description: fDescription,
        appreciationRate: Math.round(appRate * 10) / 10, color: typeConfig[fType].color,
      } : a));
    } else {
      setAssets((prev) => [...prev, {
        id: `a${Date.now()}`, name: fName, type: fType,
        purchaseDate: fPurchaseDate || "2026-03-08", purchasePrice: pp, currentValue: cv,
        location: fLocation, description: fDescription, documents: [],
        appreciationRate: Math.round(appRate * 10) / 10, color: typeConfig[fType].color,
      }]);
    }
    setShowForm(false);
  };

  const remove = (id: string) => setAssets((prev) => prev.filter((a) => a.id !== id));

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid sm:grid-cols-4 gap-4">
        {[
          { label: "Total Asset Value", value: fmt(totalCurrent), sub: `${assets.length} assets tracked`, accent: "text-primary" },
          { label: "Total Invested", value: fmt(totalPurchase), sub: "purchase cost basis", accent: "text-[hsl(var(--text-amber-600 dark:text-amber-400))]" },
          { label: "Total Gain/Loss", value: `${totalGain >= 0 ? "+" : ""}${fmt(totalGain)}`, sub: `${totalGain >= 0 ? "+" : ""}${totalPct}% overall`, accent: totalGain >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500" },
          { label: "Asset Types", value: String(new Set(assets.map((a) => a.type)).size), sub: "diversification", accent: "text-primary" },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="bg-card border border-border shadow-sm rounded-sm p-4">
            <div className="relative z-10">
              <div className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1">{card.label}</div>
              <div className={`text-lg font-semibold ${card.accent}`}>{card.value}</div>
              <div className="text-[9px] text-muted-foreground mt-0.5">{card.sub}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Allocation chart */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-card border border-border shadow-sm rounded-sm p-5">
          <div className="relative z-10">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-foreground mb-4">{'>'} Asset Allocation</h3>
            <div className="flex h-3 rounded-sm overflow-hidden mb-4">
              {breakdown.map(([type, value]) => (
                <div key={type} className="h-full" style={{
                  width: `${(value / totalCurrent) * 100}%`,
                  background: typeConfig[type]?.color,
                }} />
              ))}
            </div>
            <div className="space-y-2.5">
              {breakdown.map(([type, value]) => {
                const cfg = typeConfig[type];
                const Icon = cfg?.icon || Package;
                return (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-3 h-3" style={{ color: cfg?.color }} />
                      <span className="text-[10px] uppercase text-foreground">{cfg?.label || type}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-muted-foreground">{((value / totalCurrent) * 100).toFixed(1)}%</span>
                      <span className="text-[10px] font-bold text-foreground">{fmt(value)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Top performers */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-card border border-border shadow-sm rounded-sm p-5">
          <div className="relative z-10">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-foreground mb-4">{'>'} Performance Ranking</h3>
            <div className="space-y-2">
              {[...assets].sort((a, b) => b.appreciationRate - a.appreciationRate).map((a, i) => {
                const gain = a.currentValue - a.purchasePrice;
                const cfg = typeConfig[a.type];
                const Icon = cfg.icon;
                return (
                  <motion.div key={a.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.04 }}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[9px] text-muted-foreground w-4">#{i + 1}</span>
                      <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                      <div>
                        <div className="text-[10px] font-bold text-foreground">{a.name}</div>
                        <div className="text-[8px] text-muted-foreground">{cfg.label} • {a.purchaseDate.slice(0, 4)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-[10px] font-bold flex items-center gap-0.5 justify-end ${gain >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
                        {gain >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                        {gain >= 0 ? "+" : ""}{fmt(gain)}
                      </div>
                      <div className={`text-[8px] ${a.appreciationRate >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
                        {a.appreciationRate >= 0 ? "+" : ""}{a.appreciationRate}%/yr
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filter + Add */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {["all", ...typeOptions].map((t) => (
            <button key={t} onClick={() => setFilterType(t as any)}
              className={`px-2.5 py-1 rounded-sm text-[9px] uppercase tracking-wider transition-all ${
                filterType === t ? "text-primary border-border border terminal" : "text-muted-foreground hover:text-foreground"
              }`}>{t === "all" ? "All" : typeConfig[t]?.label || t}</button>
          ))}
        </div>
        <button onClick={openAdd} className="bg-primary text-primary-foreground font-medium shadow-sm hover:bg-primary/90 rounded-sm text-[10px] flex items-center gap-1.5 px-3 py-1.5">
          <Plus className="w-3 h-3" /> Add Asset
        </button>
      </div>

      {/* Add/Edit form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-card border border-border shadow-sm rounded-sm p-5">
            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-xs uppercase tracking-wider text-foreground">
                  {editId ? "> Edit Asset" : "> Register Asset"}
                </h3>
                <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[9px] text-muted-foreground uppercase tracking-widest block mb-1">Name</label>
                  <input value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Farmland - Nashik"
                    className="w-full h-8 rounded-sm bg-card border border-border shadow-sm px-2 text-[10px] text-foreground bg-transparent focus:outline-none" />
                </div>
                <div>
                  <label className="text-[9px] text-muted-foreground uppercase tracking-widest block mb-1">Type</label>
                  <select value={fType} onChange={(e) => setFType(e.target.value as Asset["type"])}
                    className="w-full h-8 rounded-sm bg-card border border-border shadow-sm px-2 text-[10px] text-foreground bg-transparent focus:outline-none">
                    {typeOptions.map((t) => <option key={t} value={t}>{typeConfig[t].label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-muted-foreground uppercase tracking-widest block mb-1">Purchase Date</label>
                  <input type="date" value={fPurchaseDate} onChange={(e) => setFPurchaseDate(e.target.value)}
                    className="w-full h-8 rounded-sm bg-card border border-border shadow-sm px-2 text-[10px] text-foreground bg-transparent focus:outline-none" />
                </div>
                <div>
                  <label className="text-[9px] text-muted-foreground uppercase tracking-widest block mb-1">Purchase Price (₹)</label>
                  <input type="number" value={fPurchasePrice} onChange={(e) => setFPurchasePrice(e.target.value)} placeholder="2400000"
                    className="w-full h-8 rounded-sm bg-card border border-border shadow-sm px-2 text-[10px] text-foreground bg-transparent focus:outline-none" />
                </div>
                <div>
                  <label className="text-[9px] text-muted-foreground uppercase tracking-widest block mb-1">Current Value (₹)</label>
                  <input type="number" value={fCurrentValue} onChange={(e) => setFCurrentValue(e.target.value)} placeholder="4200000"
                    className="w-full h-8 rounded-sm bg-card border border-border shadow-sm px-2 text-[10px] text-foreground bg-transparent focus:outline-none" />
                </div>
                <div>
                  <label className="text-[9px] text-muted-foreground uppercase tracking-widest block mb-1">Location</label>
                  <input value={fLocation} onChange={(e) => setFLocation(e.target.value)} placeholder="Nashik, Maharashtra"
                    className="w-full h-8 rounded-sm bg-card border border-border shadow-sm px-2 text-[10px] text-foreground bg-transparent focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-[9px] text-muted-foreground uppercase tracking-widest block mb-1">Description</label>
                <input value={fDescription} onChange={(e) => setFDescription(e.target.value)} placeholder="Details about the asset..."
                  className="w-full h-8 rounded-sm bg-card border border-border shadow-sm px-2 text-[10px] text-foreground bg-transparent focus:outline-none" />
              </div>
              <button onClick={save} className="bg-primary text-primary-foreground font-medium shadow-sm hover:bg-primary/90 rounded-sm text-[10px] flex items-center gap-1.5 px-3 py-1.5">
                <Check className="w-3 h-3" /> {editId ? "Update" : "Register"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Asset cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        {filtered.map((asset, i) => {
          const gain = asset.currentValue - asset.purchasePrice;
          const gainPct = ((gain / asset.purchasePrice) * 100).toFixed(1);
          const isExpanded = expandedId === asset.id;
          const cfg = typeConfig[asset.type];
          const Icon = cfg.icon;

          return (
            <motion.div key={asset.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
              className="bg-card border border-border shadow-sm rounded-sm overflow-hidden group">
              <div className="relative z-10">
                <button onClick={() => setExpandedId(isExpanded ? null : asset.id)}
                  className="w-full p-4 text-left hover:bg-secondary/20 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-sm bg-card border border-border shadow-sm flex items-center justify-center shrink-0"
                        style={{ borderColor: cfg.color.replace(")", " / 0.3)") }}>
                        <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-foreground">{asset.name}</span>
                          <span className="text-[8px] px-1.5 py-0.5 rounded-sm bg-card border border-border shadow-sm" style={{ color: cfg.color }}>{cfg.label}</span>
                        </div>
                        {asset.location && (
                          <div className="text-[8px] text-muted-foreground mt-0.5 flex items-center gap-0.5">
                            <MapPin className="w-2 h-2" /> {asset.location}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-[11px] font-semibold text-primary">{fmt(asset.currentValue)}</div>
                        <div className={`text-[9px] font-bold ${gain >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
                          {gain >= 0 ? "+" : ""}{gainPct}%
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                    </div>
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-border">
                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: "Purchased", value: fmt(asset.purchasePrice), accent: "text-muted-foreground" },
                            { label: "Gain/Loss", value: `${gain >= 0 ? "+" : ""}${fmt(gain)}`, accent: gain >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500" },
                            { label: "CAGR", value: `${asset.appreciationRate >= 0 ? "+" : ""}${asset.appreciationRate}%`, accent: asset.appreciationRate >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500" },
                          ].map((m) => (
                            <div key={m.label} className="bg-muted/50 rounded-sm p-2 border border-border">
                              <div className="text-[7px] text-muted-foreground uppercase tracking-widest mb-0.5">{m.label}</div>
                              <div className={`text-[10px] font-semibold ${m.accent}`}>{m.value}</div>
                            </div>
                          ))}
                        </div>

                        <p className="text-[9px] text-muted-foreground leading-relaxed">{asset.description}</p>

                        {asset.documents.length > 0 && (
                          <div>
                            <div className="text-[8px] text-muted-foreground uppercase tracking-widest mb-1">Documents</div>
                            <div className="flex flex-wrap gap-1">
                              {asset.documents.map((d) => (
                                <span key={d} className="text-[8px] px-1.5 py-0.5 rounded-sm bg-secondary text-muted-foreground">{d}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="text-[8px] text-muted-foreground">
                          Purchased: {new Date(asset.purchaseDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </div>

                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(asset)}
                            className="text-[9px] px-2 py-1 rounded-sm text-muted-foreground hover:text-primary hover:bg-secondary/50 transition-all flex items-center gap-1">
                            <Pencil className="w-2.5 h-2.5" /> Edit
                          </button>
                          <button onClick={() => remove(asset.id)}
                            className="text-[9px] px-2 py-1 rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all flex items-center gap-1">
                            <Trash2 className="w-2.5 h-2.5" /> Remove
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default AssetsPage;
