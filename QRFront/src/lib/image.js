// /src/lib/img.js
export const toImageSrc = (val) => {
    if (!val) return "";
    const s = String(val);
    if (s.startsWith("http") || s.startsWith("data:image")) return s;
    return `data:image/png;base64,${s}`;
};

export const stripDataUrlHeader = (dataUrl) => {
    if (!dataUrl) return "";
    const i = dataUrl.indexOf(",");
    return i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
};

export const base64ByteLength = (b64) => {
    if (!b64) return 0;
    const pad = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
    return (b64.length * 3) / 4 - pad;
};
