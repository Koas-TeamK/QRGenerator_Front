// features/qr/qrSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    // 저장/수정
    items: [],
    saving: false,
    error: null,
    lastSavedAt: null,
    lastSavedCount: 0,

    // 🔹 목록(관리자 조회) - 서버 페이징
    list: {
        items: [],
        loading: false,
        error: null,
        page: 1,
        pageSize: 20,
        total: 0,
        nextCursor: null,
        sortBy: null,
        sortDir: null, // 'asc' | 'desc'
        filters: {},
    },

    // 🔎 날짜 검색 모달 전용
    search: {
        open: false,
        items: [],
        loading: false,
        error: null,
        page: 1,
        pageSize: 10,
        total: 0,
        nextCursor: null,
        filters: {}, // 마지막 검색 파라미터 기억
    },

    // 🔴 시리얼 검색 모달 전용
    searchSerial: {
        open: false,
        items: [],
        loading: false,
        error: null,
        page: 1,
        pageSize: 10,
        total: 0,
        nextCursor: null,
        filters: {}, // { serialFrom, serialTo }
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
            const updated = action.payload;
            const serial = updated.serial ?? updated.code;
            const idx = state.items.findIndex((x) => (x.serial ?? x.code) === serial);
            if (idx >= 0) state.items[idx] = { ...state.items[idx], ...updated };
            state.saving = false;
        },
        qrUpdateFailure(state, action) { state.saving = false; state.error = action.payload; },

        // --- 🔹 목록(관리자 조회) ---
        qrListRequest(state, action) {
            const { page, pageSize, sorter, filters, append } = action.payload || {};
            state.list.loading = true;
            state.list.error = null;
            if (page) state.list.page = page;
            if (pageSize) state.list.pageSize = pageSize;
            if (filters) state.list.filters = { ...state.list.filters, ...filters };
            if (sorter) {
                state.list.sortBy = sorter.field || sorter.columnKey || sorter.dataIndex || null;
                state.list.sortDir = sorter.order === "ascend" ? "asc" : sorter.order === "descend" ? "desc" : null;
            }
            if (!append) state.list.items = [];
        },
        qrListSuccess(state, action) {
            const { items, page, pageSize, total, nextCursor, append } = action.payload;
            state.list.items = append ? state.list.items.concat(items) : items;
            if (page) state.list.page = page;
            if (pageSize) state.list.pageSize = pageSize;
            state.list.total = typeof total === "number" ? total : state.list.total;
            state.list.nextCursor = nextCursor ?? null;
            state.list.loading = false;
        },
        qrListFailure(state, action) { state.list.loading = false; state.list.error = action.payload || "목록 조회 실패"; },
        qrListReset(state) { state.list = { ...initialState.list }; },

        // --- 🔎 날짜 검색 모달 ---
        qrSearchOpen(state, action) {
            state.search.open = true;
            if (action.payload?.reset) state.search = { ...initialState.search, open: true };
        },
        qrSearchClose(state) { state.search.open = false; },
        qrSearchRequest(state, action) {
            const { page, pageSize, filters } = action.payload || {};
            state.search.loading = true;
            state.search.error = null;
            if (page) state.search.page = page;
            if (pageSize) state.search.pageSize = pageSize;
            if (filters) state.search.filters = filters;
        },
        qrSearchSuccess(state, action) {
            const { items, page, pageSize, total, nextCursor } = action.payload;
            state.search.items = items;
            if (page) state.search.page = page;
            if (pageSize) state.search.pageSize = pageSize;
            state.search.total = typeof total === "number" ? total : state.search.total;
            state.search.nextCursor = nextCursor ?? null;
            state.search.loading = false;
        },
        qrSearchFailure(state, action) { state.search.loading = false; state.search.error = action.payload || "검색 실패"; },
        qrSearchReset(state) { state.search = { ...initialState.search }; },

        // --- 🔴 시리얼 검색 모달 ---
        qrSerialOpen(state, action) {
            state.searchSerial.open = true;
            if (action.payload?.reset) state.searchSerial = { ...initialState.searchSerial, open: true };
        },
        qrSerialClose(state) { state.searchSerial.open = false; },
        qrSerialRequest(state, action) {
            const { page, pageSize, filters } = action.payload || {};
            state.searchSerial.loading = true;
            state.searchSerial.error = null;
            if (page) state.searchSerial.page = page;
            if (pageSize) state.searchSerial.pageSize = pageSize;
            if (filters) state.searchSerial.filters = filters;
        },
        qrSerialSuccess(state, action) {
            const { items, page, pageSize, total, nextCursor } = action.payload;
            state.searchSerial.items = items;
            if (page) state.searchSerial.page = page;
            if (pageSize) state.searchSerial.pageSize = pageSize;
            state.searchSerial.total = typeof total === "number" ? total : state.searchSerial.total;
            state.searchSerial.nextCursor = nextCursor ?? null;
            state.searchSerial.loading = false;
        },
        qrSerialFailure(state, action) { state.searchSerial.loading = false; state.searchSerial.error = action.payload || "시리얼 검색 실패"; },
        qrSerialReset(state) { state.searchSerial = { ...initialState.searchSerial }; },
    },
});

export const {
    qrSaveRequest, qrSaveSuccess, qrSaveFailure, qrClear,
    qrUpdateRequest, qrUpdateSuccess, qrUpdateFailure,
    qrListRequest, qrListSuccess, qrListFailure, qrListReset,
    qrSearchOpen, qrSearchClose, qrSearchRequest, qrSearchSuccess, qrSearchFailure, qrSearchReset,
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
