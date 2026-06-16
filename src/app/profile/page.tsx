"use client";

import { useState } from "react";
import { User, Briefcase, Save, Check, Trash2 } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

const BUSINESS_TYPES = [
    "카페/음료", "음식점/식품", "패션/의류", "뷰티/화장품",
    "인테리어/홈", "반려동물", "디지털/IT", "수공예/핸드메이드", "서비스업", "기타"
];

const AVATARS = ["🏪", "☕", "🍜", "👗", "💄", "🐾", "💻", "🛍️", "🌿", "✨"];

export default function ProfilePage() {
    const { user, updateProfile, history, clearHistory } = useAppStore();
    const [name, setName] = useState(user.name);
    const [businessType, setBusinessType] = useState(user.businessType);
    const [avatar, setAvatar] = useState(user.avatar);
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        updateProfile({ name, businessType, avatar });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="space-y-8 max-w-lg">
            <div>
                <h1 className="text-2xl font-black" style={{ color: "var(--foreground)" }}>프로필 설정</h1>
                <p className="text-sm mt-1" style={{ color: "var(--foreground-muted)" }}>
                    정보를 설정하면 AI가 더 맞춤화된 콘텐츠를 만들어줘요.
                </p>
            </div>

            <div className="edu-card p-6 space-y-6">
                {/* 아바타 */}
                <div>
                    <label className="block text-xs font-bold mb-3" style={{ color: "var(--foreground-muted)" }}>아이콘</label>
                    <div className="flex flex-wrap gap-2">
                        {AVATARS.map(a => (
                            <button
                                key={a}
                                onClick={() => setAvatar(a)}
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all"
                                style={{
                                    background: avatar === a ? "var(--primary-light)" : "var(--surface-2)",
                                    border: avatar === a ? "2px solid var(--primary)" : "2px solid transparent",
                                }}
                            >{a}</button>
                        ))}
                    </div>
                </div>

                {/* 이름 */}
                <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--foreground-muted)" }}>
                        <User size={11} className="inline mr-1" />이름 / 상호명
                    </label>
                    <input
                        className="w-full px-4 py-3 rounded-xl text-sm border outline-none transition-all"
                        style={{ background: "var(--surface-2)", border: "1.5px solid var(--border)", color: "var(--foreground)" }}
                        placeholder="예: 김민지 / 꽃다온 플로리스트"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onFocus={e => (e.target.style.borderColor = "var(--primary)")}
                        onBlur={e => (e.target.style.borderColor = "var(--border)")}
                    />
                </div>

                {/* 업종 */}
                <div>
                    <label className="block text-xs font-bold mb-2" style={{ color: "var(--foreground-muted)" }}>
                        <Briefcase size={11} className="inline mr-1" />업종
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {BUSINESS_TYPES.map(t => (
                            <button
                                key={t}
                                onClick={() => setBusinessType(t)}
                                className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                                style={{
                                    background: businessType === t ? "var(--primary)" : "var(--surface-2)",
                                    color: businessType === t ? "white" : "var(--foreground-soft)",
                                }}
                            >{t}</button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all flex items-center justify-center gap-2"
                    style={{ background: saved ? "var(--accent)" : "linear-gradient(135deg, var(--primary), #FF9A72)" }}
                >
                    {saved ? <><Check size={15} /> 저장됨!</> : <><Save size={15} /> 저장하기</>}
                </button>
            </div>

            {/* 갤러리 통계 */}
            <div className="edu-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-bold" style={{ color: "var(--foreground)" }}>
                        생성 이력
                        <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full"
                            style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
                            {history.length}개
                        </span>
                    </p>
                    {history.length > 0 && (
                        <button
                            onClick={() => { if (confirm("생성 이력을 모두 삭제할까요?")) clearHistory(); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                            style={{ background: "#FEE2E2", color: "#DC2626" }}
                        >
                            <Trash2 size={11} />
                            전체 삭제
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                    {([["cardnews", "카드뉴스"], ["detail-page", "상세페이지"], ["shorts", "쇼츠"]] as const).map(([type, label]) => (
                        <div key={type} className="text-center p-3 rounded-xl" style={{ background: "var(--surface-2)" }}>
                            <p className="text-xl font-black" style={{ color: "var(--foreground)" }}>
                                {history.filter(h => h.type === type).length}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: "var(--foreground-muted)" }}>{label}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
