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
    Cell
} from 'recharts';

// --- Types ---
type Stop = {
    id: string;
    startTime: string;
    stopTime: string | null;
    causeCode: string;
    causeName: string;
    causeCategory: string;
    equipe: number;
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
    totalDowntimeMinutes: number;
};

// --- API Helper ---
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

// --- Icons (Inline SVGs) ---
const Icons = {
    Search: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
    ),
    Refresh: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
    ),
    Plus: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
    ),
    Alert: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
    ),
    Check: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
    ),
    Close: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    ),
    Clock: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
    )
};

// --- Main Component ---
export default function StopsClient() {
    const [data, setData] = useState<PagedResponse | null>(null);
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    // Filters
    const [search, setSearch] = useState('');
    const [equipe, setEquipe] = useState<'all' | '1' | '2' | '3'>('all');

    const queryString = useMemo(() => {
        const params = new URLSearchParams();
        params.set('page', '1');
        params.set('limit', '50');
        if (search.trim()) params.set('causeCode', search.trim());
        if (equipe !== 'all') params.set('equipe', equipe);
        return params.toString();
    }, [search, equipe]);

    async function load() {
        setLoading(true);
        setErr(null);
        try {
            const analyticsPath = equipe === 'all'
                ? '/api/stops/analytics/downtime'
                : `/api/stops/analytics/downtime?equipe=${equipe}`;

            const [stopsRes, analyticsRes] = await Promise.all([
                apiFetch<PagedResponse>(`/api/stops?${queryString}`),
                apiFetch<AnalyticsData[]>(analyticsPath)
            ]);
            setData(stopsRes);
            setAnalyticsData(analyticsRes);
        } catch (e: any) {
            setErr(e?.message ?? 'Failed to load stops');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queryString]);

    function formatDateTime(dateStr: string | null) {
        if (!dateStr) return 'Ongoing';
        const d = new Date(dateStr);
        return d.toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    return (
        <div className="text-sm">
            {/* Top Tabs */}
            <div className="flex justify-center mb-6">
                <div className="bg-slate-800/50 p-1 rounded-full flex gap-1">
                    <Link href="/stops" className="px-6 py-1.5 bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 rounded-full font-medium">Stops & Analytics</Link>
                    <Link href="/" className="px-4 py-1.5 text-slate-400 hover:text-white rounded-full transition">Downtime Causes</Link>
                    <Link href="/metrage" className="px-4 py-1.5 text-slate-400 hover:text-white rounded-full transition">
                        Métrage
                    </Link>

                    <Link href="/vitesse" className="px-4 py-1.5 text-slate-400 hover:text-white rounded-full transition">
                        Vitesse
                    </Link>
                </div>
            </div>

            {/* Analytics Chart */}
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl mb-8 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-white">Downtime per Cause</h2>
                        <p className="text-slate-400 text-xs mt-1">Total minutes lost by cause category</p>
                    </div>
                    <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                        <Icons.Alert /> LIVE ANALYTICS
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
                                    tick={{ fill: '#94a3b8' }}
                                />
                                <YAxis
                                    stroke="#94a3b8"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `${val}m`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#0f172a',
                                        borderColor: '#334155',
                                        borderRadius: '12px',
                                        color: '#f8fafc',
                                        fontSize: '12px'
                                    }}
                                    itemStyle={{ color: '#818cf8' }}
                                    cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                                />
                                <Bar dataKey="totalDowntimeMinutes" radius={[6, 6, 0, 0]} barSize={40}>
                                    {analyticsData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={index % 2 === 0 ? '#6366f1' : '#818cf8'}
                                            fillOpacity={0.8 + (index * 0.05)}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-500 italic">
                            {loading ? "Calculating metrics..." : "No downtime data available for the chart."}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Card */}
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">

                {/* Header Action Bar */}
                <div className="flex flex-col md:flex-row justify-between items-center p-5 border-b border-slate-700/50 gap-4">

                    {/* Left: Refresh Button */}
                    <div className="flex items-center gap-6 w-full md:w-auto">
                        <h2 className="text-xl font-bold text-white px-2">Machine Stops</h2>
                    </div>

                    {/* Right: Search, Equipe, Refresh, Count */}
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <select
                            value={equipe}
                            onChange={(e) => setEquipe(e.target.value as any)}
                            className="bg-slate-800/50 border border-slate-700 text-slate-200 px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 transition-all text-xs"
                        >
                            <option value="all">All équipes</option>
                            <option value="1">Equipe 1 (06:00-14:00)</option>
                            <option value="2">Equipe 2 (14:00-22:00)</option>
                            <option value="3">Equipe 3 (22:00-06:00)</option>
                        </select>

                        <div className="relative group flex-1 md:w-64">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                                <Icons.Search />
                            </div>
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by Cause Code..."
                                className="w-full bg-slate-800/50 border border-slate-700 text-slate-200 pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
                            />
                        </div>

                        <button
                            onClick={load}
                            disabled={loading}
                            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-slate-700 transition-all"
                            title="Refresh"
                        >
                            <Icons.Refresh />
                        </button>

                        <div className="text-slate-500 font-medium whitespace-nowrap px-2">
                            Total: <span className="text-slate-200">{data?.total ?? 0}</span> stops
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {err && (
                    <div className="bg-red-500/10 border-l-4 border-red-500 p-4 m-4 text-red-400">
                        <strong>Error:</strong> {err}
                    </div>
                )}

                {/* Table Content */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700/50 bg-slate-800/30">
                                <th className="px-6 py-4">Time Start</th>
                                <th className="px-6 py-4">Time Stop</th>
                                <th className="px-6 py-4">Duration</th>
                                <th className="px-6 py-4">Equipe</th>
                                <th className="px-6 py-4">Cause Name</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {loading && !data && (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">Loading...</td></tr>
                            )}

                            {!loading && data?.items.length === 0 && (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">No stops found.</td></tr>
                            )}

                            {data?.items.map((stop) => {
                                const duration = stop.stopTime
                                    ? Math.round((new Date(stop.stopTime).getTime() - new Date(stop.startTime).getTime()) / 1000 / 60)
                                    : null;

                                return (
                                    <tr key={stop.id} className="group hover:bg-slate-800/40 transition-colors">
                                        <td className="px-6 py-4 font-mono text-slate-300 group-hover:text-white transition-colors">
                                            <div className="flex items-center gap-2">
                                                <Icons.Clock />
                                                {formatDateTime(stop.startTime)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-slate-300 group-hover:text-white transition-colors">
                                            {formatDateTime(stop.stopTime)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {duration !== null ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-indigo-300 border border-slate-700 shadow-sm">
                                                    {duration} min
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-900/20 text-amber-400 border border-amber-900/50">
                                                    Ongoing
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                                                Equipe {stop.equipe}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-slate-200">{stop.causeName || 'Unassigned'}</div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Footer / Pagination (simplified) */}
                {!loading && data && (
                    <div className="px-6 py-4 border-t border-slate-700/50 flex justify-between items-center text-xs text-slate-500">
                        <div>Showing {data.items.length} of {data.total} entries</div>
                    </div>
                )}
            </div>
        </div>
    );
}
