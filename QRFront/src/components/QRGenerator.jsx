// QRGenerator.jsx
import { useMemo, useState, useCallback } from "react";
import { useDispatch } from "react-redux";
import QR from "qrcode";
import { qrSaveRequest } from "@/features/qr/qrSlice";
import { makeTokenUrlSafe } from "@/utils/crypto";

export default function QRGenerator() {
    const dispatch = useDispatch();

    const [baseUrl, setBaseUrl] = useState(
        import.meta.env.VITE_QR_BASE_URL ?? "https://yourdomain.com/r"
    );
    const [start, setStart] = useState(1);
    const [end, setEnd] = useState(20);
    const [showAll, setShowAll] = useState(false);

    // 진행 상태
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0); // 0~100

    const pad4 = (n) => String(n).padStart(4, "0");

    const items = useMemo(() => {
        const s = Math.max(1, Math.min(9999, Math.floor(start)));
        const e = Math.max(1, Math.min(9999, Math.floor(end)));
        const lo = Math.min(s, e);
        const hi = Math.max(s, e);
        const temp = [];
        for (let i = lo; i <= hi; i++) {
            const code = pad4(i);              // = serial
            const token = makeTokenUrlSafe(code);
            const url = `${baseUrl.replace(/\/$/, "")}/maruon/serial=${code}?token=${encodeURIComponent(token)}`;
            temp.push({ code, token, url });   // code=serial
        }
        return temp;
    }, [baseUrl, start, end]);

    const preview = showAll ? items : items.slice(0, 50);

    // DataURL → Blob
    const dataUrlToBlob = async (dataUrl) => {
        const res = await fetch(dataUrl);
        return await res.blob();
    };

    // 오프스크린: URL로 QR 이미지 생성 → Blob
    const makeQrBlobFromUrl = async (text, size = 256) => {
        const dataUrl = await QR.toDataURL(text, { width: size, margin: 2 });
        return await dataUrlToBlob(dataUrl);
    };

    // dataURL에서 헤더 제거하고 베이스64 본문만 추출
    const toBase64Only = async (text, size = 256) => {
        const dataUrl = await QR.toDataURL(text, { width: size, margin: 2 }); // "data:image/png;base64,AAAA..."
        const idx = dataUrl.indexOf(",");
        return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl; // "AAAA..." (헤더 제거)
    };


    const toDataUrl = (text, size = 256) => QR.toDataURL(text, { width: size, margin: 2 });
    // ⚔️ 전량 일괄 전송(JSON) — QrRequestDto[]
    const uploadAll = useCallback(async () => {
        if (items.length === 0) {
            alert("업로드할 항목이 없습니다.");
            return;
        }

        setUploading(true);
        setProgress(0);

        try {
            const CHUNK = 200; // 서버 한도에 맞춰 조절
            for (let i = 0; i < items.length; i += CHUNK) {
                const slice = items.slice(i, i + CHUNK);

                // 1) 각 URL에 대한 QR 이미지를 dataURL로 생성
                const base64Bodies = await Promise.all(slice.map(it => toBase64Only(it.url, 256)));

                // 2) 백엔드 QrRequestDto 배열로 변환 (✅ qrUrl 포함)
                const dtos = slice.map((it, idx) => ({
                    image: base64Bodies[idx],  // "data:image/png;base64,..." 문자열
                    qrUrl: it.url,            // ✅ 추가된 필드
                    serial: it.code,          // = code
                    //message,                  
                    createdDate: "2025-09-29",
                    itemName: "maru_on",
                }));

                // 3) 사가로 JSON 배열 전송
                dispatch(qrSaveRequest(dtos));
                console.log(dtos)

                const done = Math.min(i + slice.length, items.length);
                setProgress(Math.round((done / items.length) * 100));
            }

            alert("전송 완료.");
        } catch (e) {
            alert("업로드 실패: " + e.message);
        } finally {
            setUploading(false);
        }
    }, [items, dispatch]);

    // ----- Styles -----
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
        btnDisabled: {
            opacity: 0.6,
            cursor: "not-allowed",
        },
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

    return (
        <div style={sx.page}>
            <h1 style={sx.title}>QR Batch Uploader (AES + Dynamic)</h1>

            <div style={sx.formGrid}>
                <label style={sx.labelCol}>
                    <span style={sx.hintSm}>Dynamic base URL</span>
                    <input
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        placeholder="https://yourdomain.com/r"
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
                {/* ⚔️ 이 버튼 하나로 전량 업로드 */}
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

            {/* 미리보기(보기용만 유지, 개별 버튼 제거) */}
            <div style={sx.grid}>
                {preview.map((it) => (
                    <div key={it.code} style={sx.card}>
                        {/* 시각 확인용 썸네일: 굳이 캔버스 참조는 필요 없으나 남겨도 무방 */}
                        <img
                            alt={it.code}
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=128x128&data=${encodeURIComponent(it.url)}`}
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
