'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import ExcelExportButton from '../components/ExcelExportButton';

// --- Types ---
type Stop = {
    id: string;
    startTime: string;
    stopTime: string | null;
    causeCode: string;
    causeName: string;
    causeCategory: string;
    equipe: number;
    causeAffectTRS?: number; // 0 or 1
};

type PagedResponse = {
    items: Stop[];
    total: number;
    page: number;
    limit: number;
};

type AnalyticsData = {
    causeCode: string;
    causeName: string;
    totalDowntimeSeconds: number;
};

type DailyStopsRow = {
    day: string; // YYYY-MM-DD
    totalWorkSeconds: number;
    totalDowntimeSeconds: number;
    stopsCount: number;
    trsDowntimeSeconds?: number;
};

// --- Helper Functions ---

function calculateAvailableTime(day: string, equipe?: string): number {
    const SHIFT_HOURS = 8;
    const DAY_HOURS = 24;

    // Limits
    const refSeconds = SHIFT_HOURS * 3600;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (day < todayStr) return refSeconds;
    if (day > todayStr) return 0;

    let startHour = 0;
    if (equipe === '1') startHour = 6;
    else if (equipe === '2') startHour = 14;
    else if (equipe === '3') startHour = 22;

    const startTime = new Date(day);
    startTime.setHours(startHour, 0, 0, 0);

    let diff = (now.getTime() - startTime.getTime()) / 1000;

    if (diff < 0) return 0;
    if (diff > refSeconds) return refSeconds;
    return diff;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...(init?.headers ?? {}),
        },
    });

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`${res.status} ${res.statusText} - ${text}`);
    }
    return (await res.json()) as T;
}

function pad2(n: number) {
    return String(n).padStart(2, '0');
}

function formatHMS(totalSeconds: number) {
    const sec = Math.max(0, Math.floor(totalSeconds));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

function formatDuration(seconds: number) {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m < 60) return `${m}m ${s}s`;
    const h = Math.floor(m / 60);
    const remM = m % 60;
    return `${h}h ${remM}m ${s}s`;
}

function formatDayFR(day: string) {
    if (!day) return '';
    const datePart = day.split('T')[0];
    const [y, m, d] = datePart.split('-');
    return `${d}/${m}/${y}`;
}

function formatDateTime(dateStr: string | null) {
    if (!dateStr) return 'En cours';
    const d = new Date(dateStr);
    return d.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// Fixed Color Mapping
function getColorForCause(causeName: string, index: number): string {
    const normalized = causeName.toLowerCase().trim();
    if (normalized.includes('chute libre')) return '#3b82f6'; // Blue
    if (normalized.includes('changement')) return '#f59e0b'; // Amber
    if (normalized.includes('panne')) return '#ef4444'; // Red
    if (normalized.includes('pause')) return '#10b981'; // Emerald
    if (normalized.includes('manque')) return '#8b5cf6'; // Violet

    // Deterministic hash for others
    let hash = 0;
    for (let i = 0; i < causeName.length; i++) {
        hash = causeName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00ffffff).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
}

// Icons
const Icons = {
    Search: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
    ),
    Refresh: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 4v6h-6"></path>
            <path d="M1 20v-6h6"></path>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
        </svg>
    ),
    Clock: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
    ),
};

export default function StopsClient() {
    // ---- Daily State ----
    const [dailyRows, setDailyRows] = useState<DailyStopsRow[]>([]);
    const [loadingDaily, setLoadingDaily] = useState(false);

    // ---- Details State ----
    const [selectedDay, setSelectedDay] = useState<string | null>(null);
    const [stopsData, setStopsData] = useState<PagedResponse | null>(null);
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    // Filters
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [equipe, setEquipe] = useState<'1' | '2' | '3'>('1');
    const [search, setSearch] = useState('');

    // Pagination State
    const [dailyPage, setDailyPage] = useState(1);
    const DAILY_LIMIT = 5;

    const [detailsPage, setDetailsPage] = useState(1);
    const DETAILS_LIMIT = 5;

    // Queries
    const dailyQuery = useMemo(() => {
        const params = new URLSearchParams();
        if (fromDate) params.set('from', fromDate);
        if (toDate) params.set('to', toDate);
        params.set('equipe', equipe);
        const qs = params.toString();
        return qs ? `?${qs}` : '';
    }, [fromDate, toDate, equipe]);

    useEffect(() => {
        // Reset details when main filters change
        setSelectedDay(null);
        setStopsData(null);
        setAnalyticsData([]);
        setDailyPage(1); // Reset daily pagination
        setDetailsPage(1); // Reset details pagination
    }, [fromDate, toDate, equipe]); // Added equipe to reset triggers

    async function loadDaily() {
        setLoadingDaily(true);
        setErr(null);
        try {
            const res = await apiFetch<DailyStopsRow[]>(`/api/stops/analytics/daily${dailyQuery}`);
            setDailyRows(res);
        } catch (e: any) {
            setErr(e?.message ?? 'Erreur lors du chargement des arrêts quotidiens');
            setDailyRows([]);
        } finally {
            setLoadingDaily(false);
        }
    }

    useEffect(() => {
        loadDaily();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dailyQuery]);

    const detailsStopsQuery = useMemo(() => {
        if (!selectedDay) return '';
        const params = new URLSearchParams();
        params.set('page', detailsPage.toString());
        params.set('limit', DETAILS_LIMIT.toString());
        params.set('from', selectedDay);
        params.set('to', selectedDay);
        params.set('equipe', equipe);
        if (search.trim()) params.set('causeCode', search.trim());
        return params.toString();
    }, [selectedDay, equipe, search, detailsPage]);

    const detailsAnalyticsQuery = useMemo(() => {
        if (!selectedDay) return '';
        const params = new URLSearchParams();
        params.set('from', selectedDay);
        params.set('to', selectedDay);
        params.set('equipe', equipe);
        const qs = params.toString();
        return qs ? `?${qs}` : '';
    }, [selectedDay, equipe]);

    async function loadDetails() {
        if (!selectedDay) return;
        setLoadingDetails(true);
        setErr(null);
        try {
            const [stopsRes, analyticsRes] = await Promise.all([
                apiFetch<PagedResponse>(`/api/stops?${detailsStopsQuery}`),
                apiFetch<AnalyticsData[]>(`/api/stops/analytics/downtime${detailsAnalyticsQuery}`),
            ]);
            setStopsData(stopsRes);
            setAnalyticsData(analyticsRes);
        } catch (e: any) {
            setErr(e?.message ?? 'Erreur lors du chargement des détails');
            setStopsData(null);
            setAnalyticsData([]);
        } finally {
            setLoadingDetails(false);
        }
    }

    useEffect(() => {
        if (!selectedDay) return;
        loadDetails();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [detailsStopsQuery, detailsAnalyticsQuery, selectedDay]); // Ensure dependency logic is correct

    function onSelectDay(day: string) {
        setSelectedDay(day.split('T')[0]);
        setSearch('');
        setDetailsPage(1); // Reset details page on new day selection
    }

    // Adaptive Units Logic
    const maxDuration = useMemo(() => {
        if (!analyticsData.length) return 0;
        return Math.max(...analyticsData.map(d => d.totalDowntimeSeconds));
    }, [analyticsData]);

    const useSeconds = maxDuration < 60;
    const timeUnit = useSeconds ? 's' : 'min';

    return (
        <div className="text-sm pb-8">
            {err && (
                <div className="bg-red-500/10 border-l-4 border-red-500 p-4 mb-4 text-red-400 rounded-r-lg">
                    <strong>Erreur:</strong> {err}
                </div>
            )}

            {/* Filters Section */}
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 mb-6 shadow-xl">
                <div className="flex flex-wrap items-end gap-4">
                    <div className="flex flex-col">
                        <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1 px-1">Période de visualisation</label>
                        <div className="flex items-center gap-2 bg-slate-800/50 p-1.5 rounded-xl border border-slate-700/50">
                            <div className="flex flex-col px-2">
                                <span className="text-[10px] text-slate-400">Début</span>
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="bg-transparent text-white text-xs focus:outline-none dark:[color-scheme:dark]"
                                />
                            </div>
                            <div className="w-px h-8 bg-slate-700"></div>
                            <div className="flex flex-col px-2">
                                <span className="text-[10px] text-slate-400">Fin</span>
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="bg-transparent text-white text-xs focus:outline-none dark:[color-scheme:dark]"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1 px-1">Equipe</label>
                        <select
                            value={equipe}
                            onChange={(e) => setEquipe(e.target.value as any)}
                            className="bg-slate-800/50 border border-slate-700/50 text-white px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none min-w-[120px]"
                        >
                            <option value="1">Equipe 1</option>
                            <option value="2">Equipe 2</option>
                            <option value="3">Equipe 3</option>
                        </select>
                    </div>

                    <div className="flex gap-2 ml-auto">
                        <button
                            onClick={() => { setFromDate(''); setToDate(''); }}
                            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-slate-700/50 transition-all text-xs font-medium uppercase tracking-wide"
                        >
                            <span className="hidden sm:inline">Effacer</span>
                        </button>
                        <button
                            onClick={loadDaily}
                            disabled={loadingDaily}
                            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/20 transition-all text-xs font-bold uppercase tracking-wide flex items-center gap-2"
                        >
                            <Icons.Refresh />
                            Actualiser
                        </button>
                    </div>
                </div>
            </div>

            {/* Split Layout: Daily Table (Left) & Stops Details (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

                {/* Left: Daily Summary Table */}
                <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-full">
                    <div className="p-5 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/20">
                        <div>
                            <h2 className="text-lg font-bold text-white">Résumé Arrêts</h2>
                            <p className="text-xs text-slate-400 mt-1">Sélectionnez un jour pour voir les détails</p>
                        </div>
                        <ExcelExportButton
                            data={dailyRows}
                            fileName="resume_arrets_jour"
                            sheetName="Resume"
                            label="Exporter excel"
                        />
                    </div>

                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700/50 bg-slate-800/40">
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Total Arrêt</th>
                                    <th className="px-4 py-3">Total Travail</th>
                                    <th className="px-4 py-3">TRS</th>
                                    <th className="px-4 py-3 text-right">Nb Arrêts</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/30 text-xs">
                                {loadingDaily && dailyRows.length === 0 && (
                                    <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Chargement...</td></tr>
                                )}
                                {!loadingDaily && dailyRows.length === 0 && (
                                    <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Aucune donnée trouvée.</td></tr>
                                )}

                                {dailyRows.slice((dailyPage - 1) * DAILY_LIMIT, dailyPage * DAILY_LIMIT).map((r) => {
                                    const isSelected = selectedDay === r.day;
                                    return (
                                        <tr
                                            key={r.day}
                                            onClick={() => onSelectDay(r.day)}
                                            className={`cursor-pointer transition-colors ${isSelected ? "bg-indigo-500/20 border-l-2 border-indigo-500" : "hover:bg-slate-800/40 border-l-2 border-transparent"}`}
                                        >
                                            <td className="px-4 py-3 font-medium text-slate-200">{formatDayFR(r.day)}</td>
                                            <td className="px-4 py-3 text-slate-300 font-mono">{formatHMS(r.totalDowntimeSeconds)}</td>
                                            <td className="px-4 py-3 text-slate-300 font-mono">{formatHMS(r.totalWorkSeconds)}</td>

                                            <td className="px-4 py-3">
                                                {(() => {
                                                    const refSeconds = 8 * 3600;
                                                    const avail = calculateAvailableTime(r.day, equipe);
                                                    const down = Number(r.trsDowntimeSeconds || 0);
                                                    const val = avail > 0 ? ((avail - down) / refSeconds) * 100 : 0;
                                                    const color = val >= 85 ? 'text-emerald-400' : val >= 50 ? 'text-amber-400' : 'text-red-400';
                                                    return <span className={`font-bold ${color}`}>{val.toFixed(2)}%</span>;
                                                })()}
                                            </td>

                                            <td className="px-4 py-3 text-right font-semibold text-slate-200">{r.stopsCount}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Daily Pagination Controls */}
                    {dailyRows.length > DAILY_LIMIT && (
                        <div className="px-4 py-3 border-t border-slate-700/50 flex justify-between items-center bg-slate-800/20">
                            <button
                                onClick={() => setDailyPage(p => Math.max(1, p - 1))}
                                disabled={dailyPage === 1}
                                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded border border-slate-700 text-xs"
                            >
                                Précédent
                            </button>
                            <span className="text-xs text-slate-500">
                                Page {dailyPage} / {Math.ceil(dailyRows.length / DAILY_LIMIT)}
                            </span>
                            <button
                                onClick={() => setDailyPage(p => Math.min(Math.ceil(dailyRows.length / DAILY_LIMIT), p + 1))}
                                disabled={dailyPage >= Math.ceil(dailyRows.length / DAILY_LIMIT)}
                                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded border border-slate-700 text-xs"
                            >
                                Suivant
                            </button>
                        </div>
                    )}
                </div>

                {/* Right: Detailed Stops Table (Only Visible if Day Selected) */}
                <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-full relative">
                    {!selectedDay ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 p-6 text-center">
                            <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                                <Icons.Search />
                            </div>
                            <p className="font-medium">Aucun jour sélectionné</p>
                            <p className="text-xs opacity-70 mt-1">Cliquez sur une ligne du tableau à gauche pour voir les détails</p>
                        </div>
                    ) : (
                        <>
                            <div className="p-5 border-b border-slate-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-800/20">
                                <div>
                                    <h2 className="text-lg font-bold text-white">Détails Arrêts</h2>
                                    <p className="text-xs text-indigo-400 font-medium">{formatDayFR(selectedDay)}</p>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    {/* Search Cause */}
                                    <div className="relative flex-1 sm:w-32">
                                        <input
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Filtrer cause..."
                                            className="w-full bg-slate-800 border border-slate-700/50 text-slate-200 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600"
                                        />
                                    </div>
                                    <button onClick={loadDetails} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700/50 transition-colors">
                                        <Icons.Refresh />
                                    </button>
                                    <ExcelExportButton
                                        data={stopsData?.items || []}
                                        fileName={`arrets_${selectedDay}`}
                                        sheetName="Details"
                                        label="Exporter excel"
                                    />
                                </div>
                            </div>

                            <div className="overflow-x-auto flex-1">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700/50 bg-slate-800/40">
                                            <th className="px-4 py-3">Heure</th>
                                            <th className="px-4 py-3">Durée</th>
                                            <th className="px-4 py-3">Cause</th>
                                            <th className="px-4 py-3 text-right">Impact TRS</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/30 text-xs">
                                        {loadingDetails && !stopsData && (
                                            <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Chargement...</td></tr>
                                        )}
                                        {!loadingDetails && stopsData?.items.length === 0 && (
                                            <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Aucun arrêt trouvé.</td></tr>
                                        )}
                                        {stopsData?.items.map((stop) => {
                                            const durationSeconds = stop.stopTime
                                                ? Math.floor((new Date(stop.stopTime).getTime() - new Date(stop.startTime).getTime()) / 1000)
                                                : null;

                                            return (
                                                <tr key={stop.id} className="group hover:bg-slate-800/40 transition-colors">
                                                    <td className="px-4 py-2 text-slate-300 font-mono whitespace-nowrap">
                                                        {new Date(stop.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        {durationSeconds !== null ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-indigo-300 border border-slate-700/50">
                                                                {formatDuration(durationSeconds)}
                                                            </span>
                                                        ) : (
                                                            <span className="text-amber-400 animate-pulse font-medium">En cours</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <div className="font-medium text-slate-200 truncate max-w-[150px]" title={stop.causeName}>
                                                            {stop.causeName || 'Non assigné'}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2 text-right">
                                                        {durationSeconds !== null && stop.causeAffectTRS === 1 ? (
                                                            <span className="text-red-400 font-medium">1</span>
                                                        ) : <span className="text-slate-600">0</span>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {/* Details Pagination Controls */}
                            {stopsData && stopsData.total > DETAILS_LIMIT && (
                                <div className="px-4 py-3 border-t border-slate-700/50 flex justify-between items-center bg-slate-800/20">
                                    <button
                                        onClick={() => setDetailsPage(p => Math.max(1, p - 1))}
                                        disabled={detailsPage === 1}
                                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded border border-slate-700 text-xs"
                                    >
                                        Précédent
                                    </button>
                                    <span className="text-xs text-slate-500">
                                        Page {detailsPage} / {Math.ceil(stopsData.total / DETAILS_LIMIT)}
                                    </span>
                                    <button
                                        onClick={() => setDetailsPage(p => Math.min(Math.ceil(stopsData.total / DETAILS_LIMIT), p + 1))}
                                        disabled={detailsPage >= Math.ceil(stopsData.total / DETAILS_LIMIT)}
                                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded border border-slate-700 text-xs"
                                    >
                                        Suivant
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Bottom: Analytics Chart */}
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl p-6 relative min-h-[400px]">
                {!selectedDay ? (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <p className="text-slate-500 text-sm font-medium">Sélectionnez un jour pour voir le graphique des causes</p>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-end mb-6">
                            <div>
                                <h2 className="text-lg font-bold text-white">Durée Totale Arrêts ({timeUnit === 's' ? 'sec' : 'min'})</h2>
                                <p className="text-xs text-slate-400 mt-1">Répartition par cause pour le {formatDayFR(selectedDay)}</p>
                            </div>
                        </div>

                        <div className="h-[300px] w-full">
                            {analyticsData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analyticsData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis
                                            dataKey="causeName"
                                            stroke="#94a3b8"
                                            fontSize={10}
                                            tickLine={false}
                                            axisLine={false}
                                            interval={0}
                                            tick={({ x, y, payload }) => (
                                                <g transform={`translate(${x},${y})`}>
                                                    <text
                                                        x={0}
                                                        y={0}
                                                        dy={16}
                                                        textAnchor="middle"
                                                        fill="#94a3b8"
                                                        fontSize={10}
                                                        transform="rotate(-15)" // Slight rotation for readability
                                                    >
                                                        {payload.value.length > 15 ? payload.value.substring(0, 15) + '...' : payload.value}
                                                    </text>
                                                </g>
                                            )}
                                        />
                                        <YAxis
                                            stroke="#94a3b8"
                                            fontSize={10}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(val) => {
                                                if (useSeconds) return `${val}s`;
                                                return `${Math.round(val / 60)}m`;
                                            }}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#0f172a',
                                                borderColor: '#334155',
                                                borderRadius: '12px',
                                                color: '#f8fafc',
                                                fontSize: '12px',
                                            }}
                                            itemStyle={{ color: '#818cf8' }}
                                            cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                                            formatter={(value: any) => [formatDuration(Number(value) || 0), 'Temps arrêt']}
                                            labelStyle={{ color: '#cbd5e1', marginBottom: '0.5rem' }}
                                        />
                                        <Bar dataKey="totalDowntimeSeconds" radius={[4, 4, 0, 0]} barSize={40}>
                                            {analyticsData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={getColorForCause(entry.causeName, index)} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-500 italic">
                                    Aucune donnée pour ce jour.
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
