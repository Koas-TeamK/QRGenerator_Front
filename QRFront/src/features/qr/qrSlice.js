// features/qr/qrSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    // 저장/수정
    items: [],
    saving: false,
    error: null,
    lastSavedAt: null,
    lastSavedCount: 0,

    // 🔹 목록(관리자 조회) — 서버에는 page만 보냄 (0-based)
    list: {
        items: [],
        loading: false,
        error: null,
        page: 0,   // 0-based
        total: 0,  // 서버가 주면 갱신, 아니면 0 유지
    },

    // 🔎 날짜 검색 모달 — page만, + 조건 유지용 filters
    search: {
        open: false,
        items: [],
        loading: false,
        error: null,
        page: 0,         // 0-based
        total: 0,
        filters: {},     // 날짜 범위 등 검색 조건
    },

    // 🔴 시리얼 검색 모달 — page만, + 조건 유지용 filters(예: { serial })
    searchSerial: {
        open: false,
        items: [],
        loading: false,
        error: null,
        page: 0,         // 0-based
        total: 0,
        filters: {},     // { serial } 등
    },
};

const qrSlice = createSlice({
    name: "qr",
    initialState,
    reducers: {
        // --- 생성/수정 ---
        qrSaveRequest(state) { state.saving = true; state.error = null; },
        qrSaveSuccess(state, action) {
            const rows = Array.isArray(action.payload) ? action.payload : [action.payload];
            state.items = state.items.concat(rows);
            state.saving = false;
            state.lastSavedAt = Date.now();
            state.lastSavedCount = rows.length;
        },
        qrSaveFailure(state, action) { state.saving = false; state.error = action.payload || "저장 실패"; },
        qrClear(state) {
            state.items = [];
            state.lastSavedCount = 0;
            state.error = null;
            state.saving = false;
            state.lastSavedAt = null;
        },
        qrUpdateRequest(state) { state.saving = true; state.error = null; },
        qrUpdateSuccess(state, action) {
            const p = action.payload;
            const idx = state.items.findIndex(it => it.serial === p.serial || it.key === p.key);
            if (idx >= 0) {
                const next = state.items.slice();       // 배열 참조 교체
                next[idx] = { ...next[idx], ...p };     // 행 참조 교체
                state.items = next;
            }
        },
        qrUpdateFailure(state, action) { state.saving = false; state.error = action.payload; },

        // --- 🔹 목록(관리자 조회) — page만 관리 ---
        qrListRequest(state, action) {
            const { page, append } = action.payload || {};
            state.list.loading = true;
            state.list.error = null;
            if (typeof page === "number") state.list.page = page; // 0도 허용
            if (!append) state.list.items = []; // 새 조회면 비움
        },
        qrListSuccess(state, action) {
            const { items, page, total, append } = action.payload || {};
            state.list.items = append ? state.list.items.concat(items) : items;
            if (typeof page === "number") state.list.page = page;
            if (typeof total === "number") state.list.total = total;
            state.list.loading = false;
        },
        qrListFailure(state, action) {
            state.list.loading = false;
            state.list.error = action.payload || "목록 조회 실패";
        },
        qrListReset(state) {
            state.list = { ...initialState.list };
        },

        // --- 🔎 날짜 검색 모달 ---
        qrSearchOpen(state, action) {
            state.search.open = true;
            if (action.payload?.reset) state.search = { ...initialState.search, open: true };
        },
        qrSearchClose(state) { state.search.open = false; },
        qrSearchRequest(state, action) {
            const { page, filters } = action.payload || {};
            state.search.loading = true;
            state.search.error = null;
            if (typeof page === "number") state.search.page = page; // 0 허용
            if (filters) state.search.filters = filters;
        },
        qrSearchSuccess(state, action) {
            const { items, page, total } = action.payload || {};
            state.search.items = items;
            if (typeof page === "number") state.search.page = page;
            if (typeof total === "number") state.search.total = total;
            state.search.loading = false;
        },
        qrSearchFailure(state, action) {
            state.search.loading = false;
            state.search.error = action.payload || "검색 실패";
        },
        qrSearchReset(state) { state.search = { ...initialState.search }; },

        // --- 🔴 시리얼 검색 모달 ---
        qrSerialOpen(state, action) {
            state.searchSerial.open = true;
            if (action.payload?.reset) state.searchSerial = { ...initialState.searchSerial, open: true };
        },
        qrSerialClose(state) { state.searchSerial.open = false; },
        qrSerialRequest(state, action) {
            const { page, filters } = action.payload || {};
            state.searchSerial.loading = true;
            state.searchSerial.error = null;
            if (typeof page === "number") state.searchSerial.page = page; // 0 허용
            if (filters) state.searchSerial.filters = filters;
        },
        qrSerialSuccess(state, action) {
            const { items, page, total } = action.payload || {};
            state.searchSerial.items = items;
            if (typeof page === "number") state.searchSerial.page = page;
            if (typeof total === "number") state.searchSerial.total = total;
            state.searchSerial.loading = false;
        },
        qrSerialFailure(state, action) {
            state.searchSerial.loading = false;
            state.searchSerial.error = action.payload || "시리얼 검색 실패";
        },
        qrSerialReset(state) { state.searchSerial = { ...initialState.searchSerial }; },
    },
});

export const {
    qrSaveRequest, qrSaveSuccess, qrSaveFailure, qrClear,
    qrUpdateRequest, qrUpdateSuccess, qrUpdateFailure,

    // list
    qrListRequest, qrListSuccess, qrListFailure, qrListReset,

    // date search
    qrSearchOpen, qrSearchClose, qrSearchRequest, qrSearchSuccess, qrSearchFailure, qrSearchReset,

    // serial search
    qrSerialOpen, qrSerialClose, qrSerialRequest, qrSerialSuccess, qrSerialFailure, qrSerialReset,
} = qrSlice.actions;

export default qrSlice.reducer;

// 선택자
export const selectQr = (s) => s.qr;
export const selectQrSaving = (s) => s.qr.saving;
export const selectQrError = (s) => s.qr.error;
export const selectQrList = (s) => s.qr.list;
export const selectQrSearch = (s) => s.qr.search;
export const selectQrSerial = (s) => s.qr.searchSerial;
