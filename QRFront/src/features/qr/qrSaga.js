// features/qr/qrSaga.js
import { call, put, takeLatest, all } from "redux-saga/effects";
import { api } from "@/lib/api";
import {
    // save/update
    qrSaveRequest, qrSaveSuccess, qrSaveFailure,
    qrUpdateRequest, qrUpdateSuccess, qrUpdateFailure,
    // list
    qrListRequest, qrListSuccess, qrListFailure,
    // date search
    qrSearchRequest, qrSearchSuccess, qrSearchFailure,
    // serial search
    qrSerialRequest, qrSerialSuccess, qrSerialFailure,
} from "./qrSlice";

// ---------- 공통 ----------
const PAGING_MODE = (import.meta.env.VITE_QR_PAGING_MODE ?? "page").toLowerCase(); // 'page' | 'cursor'
const ZERO_BASED = (import.meta.env.VITE_QR_ZERO_BASED ?? "false") === "true";

function buildListParams({ page = 1, pageSize = 10, sorter = null, filters = {}, cursor = null }) {
    const params = { ...filters };
    if (PAGING_MODE === "cursor") {
        if (cursor) params.cursor = cursor;
        params.limit = pageSize;
    } else {
        params.page = ZERO_BASED ? Math.max(0, page - 1) : page;
        params.size = pageSize;
    }
    if (sorter && sorter.field && sorter.order) {
        const dir = sorter.order === "ascend" ? "asc" : sorter.order === "descend" ? "desc" : undefined;
        if (dir) params.sort = `${sorter.field},${dir}`;
    }
    return params;
}

function normalizeListResponse(data, { page }) {
    const raw = data.items ?? data.content ?? data.data ?? [];
    const total = data.total ?? data.totalElements ?? data.count ?? 0;
    const nextCursor = data.nextCursor ?? data.pageInfo?.nextCursor ?? null;

    const items = raw.map((it, idx) => ({
        key: String(it.id ?? it.serial ?? it.code ?? `${page}-${idx}`),
        imageUrl: it.imageUrl ?? it.image_url ?? "",
        qrUrl: it.qrUrl ?? it.url ?? it.qr_url ?? "",
        serial: it.serial ?? it.code ?? "",
        message: it.message ?? "",
        createdDate: it.createdDate ?? it.created_date ?? it.date ?? "",
        itemName: it.itemName ?? it.item_name ?? it.product ?? "",
        _raw: it,
    }));
    return { items, total, nextCursor };
}

function fetchList(params) {
    return api.get("/api/admin/qr", { params });
}

// ---------- save / update ----------
function postOne(dto) { return api.post("/api/qr", dto); }
function* saveQrWorker({ payload }) {
    try {
        if (Array.isArray(payload)) {
            const results = [];
            for (const dto of payload) {
                const { data } = yield call(postOne, dto);
                results.push(data);
            }
            yield put(qrSaveSuccess(results));
            return;
        }
        const { data } = yield call(postOne, payload);
        yield put(qrSaveSuccess(data));
    } catch (err) {
        yield put(qrSaveFailure(err?.response?.data?.message || err.message));
    }
}

function putOne(dto) {
    const serial = encodeURIComponent(dto.serial);
    return api.put(`/api/qr/${serial}`, dto);
}
function* updateQrWorker({ payload }) {
    try {
        const { data } = yield call(putOne, payload);
        yield put(qrUpdateSuccess(data ?? payload));
    } catch (err) {
        yield put(qrUpdateFailure(err?.response?.data?.message || err.message));
    }
}

// ---------- list ----------
function* listQrWorker({ payload }) {
    try {
        const { page = 1, pageSize = 20, sorter = null, filters = {}, cursor = null, append = false } = payload || {};
        const params = buildListParams({ page, pageSize, sorter, filters, cursor });
        const { data } = yield call(fetchList, params);
        const { items, total, nextCursor } = normalizeListResponse(data, { page });
        yield put(qrListSuccess({ items, page, pageSize, total, nextCursor, append }));
    } catch (err) {
        yield put(qrListFailure(err?.response?.data?.message || err.message));
    }
}

// ---------- date search ----------
function* searchQrWorker({ payload }) {
    try {
        const { page = 1, pageSize = 10, filters = {}, sorter = null, cursor = null } = payload || {};
        const params = buildListParams({ page, pageSize, sorter, filters, cursor });
        const { data } = yield call(fetchList, params);
        const { items, total, nextCursor } = normalizeListResponse(data, { page });
        yield put(qrSearchSuccess({ items, page, pageSize, total, nextCursor }));
    } catch (err) {
        yield put(qrSearchFailure(err?.response?.data?.message || err.message || "검색 실패"));
    }
}

// ---------- serial search ----------
function* serialSearchWorker({ payload }) {
    try {
        const { page = 1, pageSize = 10, filters = {}, sorter = null, cursor = null } = payload || {};
        const params = buildListParams({ page, pageSize, sorter, filters, cursor });
        const { data } = yield call(fetchList, params);
        const { items, total, nextCursor } = normalizeListResponse(data, { page });
        yield put(qrSerialSuccess({ items, page, pageSize, total, nextCursor }));
    } catch (err) {
        yield put(qrSerialFailure(err?.response?.data?.message || err.message || "시리얼 검색 실패"));
    }
}

export function* qrSaga() {
    yield all([
        takeLatest(qrSaveRequest.type, saveQrWorker),
        takeLatest(qrUpdateRequest.type, updateQrWorker),
        takeLatest(qrListRequest.type, listQrWorker),
        takeLatest(qrSearchRequest.type, searchQrWorker),
        takeLatest(qrSerialRequest.type, serialSearchWorker),
    ]);
}
