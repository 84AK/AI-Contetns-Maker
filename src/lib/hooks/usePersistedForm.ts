import { useState, useEffect, useRef } from "react";

/**
 * useState와 동일하게 쓰되, localStorage에 자동 저장/복원한다.
 * 페이지 이동·탭 전환·새로고침 후에도 입력값이 유지된다.
 */
export function usePersistedForm<T extends Record<string, string>>(
    storageKey: string,
    initialValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
    const loaded = useRef(false);

    const [form, setForm] = useState<T>(() => {
        if (typeof window === "undefined") return initialValue;
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) return { ...initialValue, ...JSON.parse(saved) };
        } catch {}
        return initialValue;
    });

    useEffect(() => {
        // 첫 마운트 시 한 번 더 동기화 (SSR hydration 대응)
        if (!loaded.current) {
            loaded.current = true;
            try {
                const saved = localStorage.getItem(storageKey);
                if (saved) setForm(prev => ({ ...prev, ...JSON.parse(saved) }));
            } catch {}
        }
    }, [storageKey]);

    useEffect(() => {
        if (!loaded.current) return;
        try {
            localStorage.setItem(storageKey, JSON.stringify(form));
        } catch {}
    }, [form, storageKey]);

    return [form, setForm];
}
