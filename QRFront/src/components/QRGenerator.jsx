// src/pages/QRGenerator.jsx
import { useMemo, useState, useCallback } from "react";
import { useDispatch } from "react-redux";
import QR from "qrcode";
import { qrSaveRequest } from "@/features/qr/qrSlice";
import { makeTokenUrlSafe } from "@/utils/crypto";

// 간단 sleep
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function QRGenerator() {
    const dispatch = useDispatch();

    // ====== 상태 ======
    const [baseUrl, setBaseUrl] = useState(
        import.meta.env.VITE_QR_BASE_URL ?? "www.team-koas.com"
    );
    const [start, setStart] = useState(1);
    const [end, setEnd] = useState(20);
    const [showAll, setShowAll] = useState(false);

    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0); // 0~100

    // ====== 유틸 ======
    const pad4 = (n) => String(n).padStart(4, "0");

    const items = useMemo(() => {
        const s = Math.max(1, Math.min(9999, Math.floor(start)));
        const e = Math.max(1, Math.min(9999, Math.floor(end)));
        const lo = Math.min(s, e);
        const hi = Math.max(s, e);
        const temp = [];
        for (let i = lo; i <= hi; i++) {
            const code = pad4(i); // = serial
            const token = makeTokenUrlSafe(code);
            const url = `${baseUrl.replace(/\/$/, "")}/maruon/serial=${code}?token=${encodeURIComponent(
                token
            )}`;
            temp.push({ code, token, url });
        }
        return temp;
    }, [baseUrl, start, end]);

    const preview = showAll ? items : items.slice(0, 50);

    // DataURL → base64 본문만(용량 축소: width=128, margin=1)
    const toBase64Only = async (text, size = 128) => {
        const dataUrl = await QR.toDataURL(text, { width: size, margin: 1 });
        const idx = dataUrl.indexOf(",");
        return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl; // "AAAA..."만 반환
    };

    // ====== 업로드(청크 + 간격 / API는 그대로 dispatch 사용) ======
    const uploadAll = useCallback(async () => {
        if (items.length === 0) {
            alert("업로드할 항목이 없습니다.");
            return;
        }

        // 안전장치: 너무 큰 배치를 한 번에 올리면 경고
        if (items.length > 1000 && !confirm(`총 ${items.length}건입니다. 진행할까요?`)) {
            return;
        }

        setUploading(true);
        setProgress(0);

        try {
            const CHUNK = 1;
            const GAP_MS = 1000;

            for (let i = 0; i < items.length; i += CHUNK) {
                const slice = items.slice(i, i + CHUNK);

                const base64Bodies = await Promise.all(
                    slice.map((it) => toBase64Only(it.url, 128))
                );

                const dtos = slice.map((it, idx) => ({
                    image: base64Bodies[idx],
                    qrUrl: it.url,
                    serial: it.code,
                    createdDate: "",
                    itemName: "maruon",
                }));

                dispatch(qrSaveRequest(dtos));

                const done = Math.min(i + slice.length, items.length);
                setProgress(Math.round((done / items.length) * 100));

                await sleep(GAP_MS);
            }

            alert("전송 요청을 모두 보냈습니다. (백엔드 처리가 순차 진행 중일 수 있어요)");
        } catch (e) {
            alert("업로드 실패: " + e.message);
        } finally {
            setUploading(false);
        }
    }, [items, dispatch]);

    // ====== 스타일 ======
    const sx = {
        page: { padding: 16, display: "flex", flexDirection: "column", gap: 16 },
        title: { fontSize: 20, fontWeight: 600 },
        formGrid: {
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            alignItems: "start",
        },
        labelCol: { display: "flex", flexDirection: "column", gap: 4 },
        hintSm: { fontSize: 12, color: "#666" },
        input: {
            border: "1px solid #ccc",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 14,
            outline: "none",
        },
        row: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
        btnPrimary: {
            background: "#000",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 14,
            cursor: "pointer",
        },
        btnDisabled: { opacity: 0.6, cursor: "not-allowed" },
        checkboxLabel: { display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14 },
        grid: {
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        },
        card: {
            border: "1px solid #e5e5e5",
            borderRadius: 12,
            padding: 12,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            background: "#fff",
        },
        codeText: {
            fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontSize: 14,
        },
        progress: { fontSize: 12, color: "#6b7280" },
    };

    // ====== 렌더 ======
    return (
        <div style={sx.page}>
            <h1 style={sx.title}>QR Batch Uploader (AES + Dynamic)</h1>

            <div style={sx.formGrid}>
                <label style={sx.labelCol}>
                    <span style={sx.hintSm}>Dynamic base URL</span>
                    <input
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        placeholder="https://www.team-koas.com"
                        style={sx.input}
                    />
                    <span style={sx.hintSm}>
                        예: https://yourdomain.com/r → 실제로는 /api/r/[code] 같은 리다이렉트 엔드포인트로 연결
                    </span>
                </label>

                <label style={sx.labelCol}>
                    <span style={sx.hintSm}>Start</span>
                    <input
                        type="number"
                        min={1}
                        max={9999}
                        value={start}
                        onChange={(e) => setStart(Number(e.target.value))}
                        style={sx.input}
                    />
                </label>

                <label style={sx.labelCol}>
                    <span style={sx.hintSm}>End</span>
                    <input
                        type="number"
                        min={1}
                        max={9999}
                        value={end}
                        onChange={(e) => setEnd(Number(e.target.value))}
                        style={sx.input}
                    />
                </label>
            </div>

            <div style={sx.row}>
                <button
                    onClick={uploadAll}
                    style={{ ...sx.btnPrimary, ...(uploading ? sx.btnDisabled : {}) }}
                    disabled={uploading}
                >
                    {uploading ? `Uploading... ${progress}%` : `Send ALL to Backend (${items.length})`}
                </button>

                <label style={sx.checkboxLabel}>
                    <input
                        type="checkbox"
                        checked={showAll}
                        onChange={(e) => setShowAll(e.target.checked)}
                    />
                    Show all previews (보기용)
                </label>

                {uploading && <span style={sx.progress}>진행률: {progress}%</span>}
            </div>

            {/* 미리보기(최대 50개) */}
            <div style={sx.grid}>
                {preview.map((it) => (
                    <div key={it.code} style={sx.card}>
                        <img
                            alt={it.code}
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=128x128&data=${encodeURIComponent(
                                it.url
                            )}`}
                            width={128}
                            height={128}
                            style={{ borderRadius: 8 }}
                        />
                        <div style={sx.codeText}>{it.code}</div>
                    </div>
                ))}
            </div>

            {!showAll && items.length > preview.length && (
                <div style={sx.progress}>
                    미리보기는 50개까지만 표시. 전송은 전체({items.length}) 기준으로 진행됩니다.
                </div>
            )}
        </div>
    );
}
