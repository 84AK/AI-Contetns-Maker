"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Clock, ChevronDown, Check, X } from "lucide-react";

export interface VersionItem {
    id: string;
    title: string;
    created_at: string;
    content: Record<string, unknown>;
}

interface Props {
    type: string;
    currentId: string | null;
    getToken: () => Promise<string | null>;
    onSelect: (id: string, content: Record<string, unknown>) => void;
    refreshTrigger?: number; // 새 버전 생성 후 증가시켜 목록 갱신
}

export default function VersionSwitcher({ type, currentId, getToken, onSelect, refreshTrigger = 0 }: Props) {
    const [open, setOpen] = useState(false);
    const [versions, setVersions] = useState<VersionItem[]>([]);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchVersions = useCallback(async () => {
        const token = await getToken();
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/ai/history?type=${encodeURIComponent(type)}&limit=6`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setVersions(data);
            }
        } catch { /* 무시 */ } finally {
            setLoading(false);
        }
    }, [type, getToken]);

    useEffect(() => { fetchVersions(); }, [fetchVersions, refreshTrigger]);

    // 드롭다운 외부 클릭 닫기
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // 버전이 1개 이하면 표시 안 함
    if (versions.length <= 1 && !loading) return null;

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                style={{
                    background: open ? "var(--primary-light)" : "var(--surface-2)",
                    color: open ? "var(--primary)" : "var(--foreground-soft)",
                    border: `1.5px solid ${open ? "var(--primary)" : "var(--border)"}`,
                }}>
                <Clock size={12} />
                이전 버전 {versions.length > 0 ? `(${versions.length})` : ""}
                <ChevronDown size={12} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </button>

            {open && (
                <div
                    className="absolute right-0 top-full mt-2 z-50 rounded-2xl overflow-hidden"
                    style={{
                        width: "280px",
                        background: "white",
                        border: "1.5px solid var(--border)",
                        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                    }}>
                    {/* 헤더 */}
                    <div className="flex items-center justify-between px-4 py-3 border-b"
                        style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                        <p className="text-xs font-black" style={{ color: "var(--foreground-soft)" }}>
                            최근 생성 버전
                        </p>
                        <button onClick={() => setOpen(false)}
                            className="w-5 h-5 flex items-center justify-center rounded-md"
                            style={{ color: "var(--foreground-muted)" }}>
                            <X size={12} />
                        </button>
                    </div>

                    {/* 버전 목록 */}
                    {loading ? (
                        <div className="px-4 py-5 text-center text-sm"
                            style={{ color: "var(--foreground-muted)" }}>
                            불러오는 중...
                        </div>
                    ) : (
                        <div className="divide-y" style={{ borderColor: "var(--border)", maxHeight: "320px", overflowY: "auto" }}>
                            {versions.map((v, idx) => {
                                const isCurrent = v.id === currentId;
                                const vLabel = idx === 0 ? "최신" : `v${versions.length - idx}`;
                                return (
                                    <button
                                        key={v.id}
                                        onClick={() => { onSelect(v.id, v.content); setOpen(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all"
                                        style={{
                                            background: isCurrent ? "var(--primary-light)" : "transparent",
                                        }}
                                        onMouseEnter={e => { if (!isCurrent) (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)"; }}
                                        onMouseLeave={e => { if (!isCurrent) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}>
                                        {/* 버전 배지 */}
                                        <span className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
                                            style={{
                                                background: isCurrent ? "var(--primary)" : "var(--surface-2)",
                                                color: isCurrent ? "white" : "var(--foreground-soft)",
                                            }}>
                                            {vLabel === "최신" ? "★" : vLabel}
                                        </span>
                                        {/* 정보 */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-black truncate"
                                                style={{ color: isCurrent ? "var(--primary)" : "var(--foreground)" }}>
                                                {v.title || "(제목 없음)"}
                                            </p>
                                            <p className="text-xs mt-0.5"
                                                style={{ color: "var(--foreground-muted)" }}>
                                                {formatDate(v.created_at)}
                                                {isCurrent && " · 현재 보는 중"}
                                            </p>
                                        </div>
                                        {isCurrent && <Check size={14} style={{ color: "var(--primary)", shrink: 0 } as React.CSSProperties} />}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    <div className="px-4 py-2.5 border-t"
                        style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                        <p className="text-xs" style={{ color: "var(--foreground-muted)" }}>
                            💡 버전을 클릭하면 즉시 전환됩니다
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
