'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

type DailyPoint = {
    day: string; // YYYY-MM-DD
    totalMeters: number;
};

type TotalResponse = {
    from: string | null;
    to: string | null;
    totalMeters: number;
};

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

function toLocalDateInputValue(d: Date) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatDayFR(day: string) {
    // "YYYY-MM-DD" -> "DD/MM"
    const [y, m, d] = day.split('-');
    return `${d}/${m}`;
}

export default function MetrageClient() {
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);

    // Default: last 7 days
    const [from, setFrom] = useState<string>(toLocalDateInputValue(sevenDaysAgo));
    const [to, setTo] = useState<string>(toLocalDateInputValue(today));

    // manual insert
    const [recordedAt, setRecordedAt] = useState<string>(''); // datetime-local
    const [meters, setMeters] = useState<string>('0');
    const [note, setNote] = useState<string>('');

    const [daily, setDaily] = useState<DailyPoint[]>([]);
    const [total, setTotal] = useState<TotalResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const queryString = useMemo(() => {
        const params = new URLSearchParams();
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        return params.toString();
    }, [from, to]);

    async function load() {
        setLoading(true);
        setErr(null);
        try {
            const [dailyRes, totalRes] = await Promise.all([
                apiFetch<DailyPoint[]>(`/api/metrage/daily?${queryString}`),
                apiFetch<TotalResponse>(`/api/metrage/total?${queryString}`),
            ]);
            setDaily(dailyRes);
            setTotal(totalRes);
        } catch (e: any) {
            setErr(e?.message ?? 'Failed to load metrage');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queryString]);

    async function onCreate(e: React.FormEvent) {
        e.preventDefault();
        setErr(null);

        const metersNum = Number(meters);
        if (Number.isNaN(metersNum) || metersNum < 0) {
            setErr('meters must be a number >= 0');
            return;
        }

        try {
            await apiFetch('/api/metrage', {
                method: 'POST',
                body: JSON.stringify({
                    recordedAt: recordedAt || undefined,
                    meters: metersNum,
                    note: note || undefined,
                }),
            });

            setRecordedAt('');
            setMeters('0');
            setNote('');
            await load();
        } catch (e: any) {
            setErr(e?.message ?? 'Create failed');
        }
    }

    return (
        <div className="text-sm">
            {/* Top Tabs */}
            <div className="flex justify-center mb-6">
                <div className="bg-slate-800/50 p-1 rounded-full flex gap-1">
                    <Link href="/stops" className="px-4 py-1.5 text-slate-400 hover:text-white rounded-full transition">
                        Stops & Analytics
                    </Link>
                    <Link href="/" className="px-4 py-1.5 text-slate-400 hover:text-white rounded-full transition">
                        Downtime Causes
                    </Link>
                    <Link href="/metrage" className="px-6 py-1.5 bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 rounded-full font-medium">
                        Métrage
                    </Link>
                    <Link href="/vitesse" className="px-4 py-1.5 text-slate-400 hover:text-white rounded-full transition">
                        Vitesse
                    </Link>

                </div>
            </div>

            {err && (
                <div className="bg-red-500/10 border-l-4 border-red-500 p-4 mb-4 text-red-400">
                    <strong>Error:</strong> {err}
                </div>
            )}

            {/* Chart card */}
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl mb-8 p-6">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-white">Métrage produit par jour</h2>
                        <p className="text-slate-400 text-xs mt-1">Courbe journalière sur la période sélectionnée</p>
                    </div>

                    <div className="flex gap-3 items-end flex-wrap">
                        <label className="text-slate-300 text-xs">
                            From
                            <input
                                type="date"
                                value={from}
                                onChange={(e) => setFrom(e.target.value)}
                                className="mt-1 w-full bg-slate-800/50 border border-slate-700 text-slate-200 px-3 py-2 rounded-xl"
                            />
                        </label>

                        <label className="text-slate-300 text-xs">
                            To
                            <input
                                type="date"
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                className="mt-1 w-full bg-slate-800/50 border border-slate-700 text-slate-200 px-3 py-2 rounded-xl"
                            />
                        </label>

                        <button
                            onClick={load}
                            disabled={loading}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition"
                        >
                            Refresh
                        </button>

                        <div className="bg-slate-800/40 border border-slate-700 rounded-xl px-4 py-2">
                            <div className="text-slate-400 text-xs">Total période</div>
                            <div className="text-white font-bold text-lg">
                                {total ? `${total.totalMeters.toFixed(3)} m` : '—'}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="h-[320px] w-full">
                    {daily.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={daily} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis
                                    dataKey="day"
                                    stroke="#94a3b8"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(v) => formatDayFR(v)}
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
                                        fontSize: '12px',
                                    }}
                                    formatter={(value: any) => [`${Number(value).toFixed(3)} m`, 'Métrage']}
                                    labelFormatter={(label: any) => `Jour: ${label}`}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="totalMeters"
                                    stroke="#6366f1"
                                    strokeWidth={3}
                                    dot={{ r: 3 }}
                                    activeDot={{ r: 5 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-500 italic">
                            {loading ? 'Loading...' : 'Aucune donnée sur la période.'}
                        </div>
                    )}
                </div>
            </div>

            {/* Manual insert */}
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl p-6">
                <h2 className="text-xl font-bold text-white">Ajouter une entrée (manuel)</h2>

                <form onSubmit={onCreate} className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
                    <label className="text-slate-300 text-xs">
                        Recorded at (optionnel)
                        <input
                            type="datetime-local"
                            value={recordedAt}
                            onChange={(e) => setRecordedAt(e.target.value)}
                            className="mt-1 w-full bg-slate-800/50 border border-slate-700 text-slate-200 px-3 py-2 rounded-xl"
                        />
                    </label>

                    <label className="text-slate-300 text-xs">
                        Meters
                        <input
                            type="number"
                            step="0.001"
                            min="0"
                            value={meters}
                            onChange={(e) => setMeters(e.target.value)}
                            className="mt-1 w-full bg-slate-800/50 border border-slate-700 text-slate-200 px-3 py-2 rounded-xl"
                        />
                    </label>

                    <label className="text-slate-300 text-xs md:col-span-2">
                        Note (optionnel)
                        <input
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="mt-1 w-full bg-slate-800/50 border border-slate-700 text-slate-200 px-3 py-2 rounded-xl"
                            placeholder="ex: batch A, test..."
                        />
                    </label>

                    <div className="md:col-span-4">
                        <button
                            type="submit"
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/20 font-medium transition-transform active:scale-95"
                        >
                            Add entry
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
