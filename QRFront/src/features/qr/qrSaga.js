// features/qr/qrSaga.js
import { call, put, takeLatest, all } from "redux-saga/effects";
import { api } from "@/lib/api";
import {
    // save/update
    qrSaveRequest, qrSaveSuccess, qrSaveFailure,
    qrUpdateRequest, qrUpdateSuccess, qrUpdateFailure,
    // list
    qrListRequest, qrListSuccess, qrListFailure,
    // search
    qrSearchRequest, qrSearchSuccess, qrSearchFailure,
} from "./qrSlice";

/** ========= 공통 설정 ========= */
// 서버는 page=0,1,2... (0-based)
const ZERO_BASED = (import.meta.env.VITE_QR_ZERO_BASED ?? "true") === "true";
// 디버그 로깅
const DEBUG = (import.meta.env.VITE_QR_DEBUG ?? "false") === "true";

/** ========= API ========= */
function fetchList(params) {
    return api.get("/api/admin/qr", { params });
}
// 저장
function postOne(dto) {
    return api.post("/api/admin/qr", dto);
}
// 업데이트
function putOne(dto) {
    const serial = encodeURIComponent(dto.serial);
    return api.put(`/api/admin/qr/${serial}`, dto);
}
// 검색
function fetchSearch(params) {
    console.log("[fetchSearch] parmas -> ", params);
    return api.post("/api/admin/search", params);
}

/** ========= 응답 정규화(배열/객체 모두 대응) ========= */
function normalizeListResponse(rawData, { page }) {
    const data = rawData;

    // items 배열 후보들
    const itemsRaw =
        (Array.isArray(data?.items) && data.items) ||
        (Array.isArray(data?.content) && data.content) ||
        (Array.isArray(data?.data) && data.data) ||
        (Array.isArray(data?.results) && data.results) ||
        (Array.isArray(data) ? data : []);

    const total =
        data?.total ??
        data?.totalElements ??
        data?.count ??
        data?.totalCount ??
        data?.page?.totalElements ??
        (Array.isArray(itemsRaw) ? itemsRaw.length : 0);

    const nextCursor = data?.nextCursor ?? data?.pageInfo?.nextCursor ?? null;

    const items = itemsRaw.map((it, idx) => ({
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
/** ========= 파라미터 빌더 ========= */
/** ★ 리스트용: page만 보냄 (size/sort/필터 일절 X) */
function buildPageOnlyParams({ page = 1 }) {
    const params = {
        page: ZERO_BASED ? Math.max(0, page - 1) : page,
    };
    if (DEBUG) console.log("[qrSaga] list params (page-only) →", params);
    return params;
}

/** ========= save / update ========= */
function* saveQrWorker({ payload }) {
    try {
        if (Array.isArray(payload)) {
            //console.log("[qrSaga] saveQrWorker →", payload);
            const results = [];
            for (const dto of payload) {
                const res = yield call(postOne, dto);
                results.push(res?.data ?? res);
            }
            yield put(qrSaveSuccess(results));
            return;
        }
        const res = yield call(postOne, payload);
        yield put(qrSaveSuccess(res?.data ?? res));
    } catch (err) {
        yield put(qrSaveFailure(err?.response?.data?.message || err.message));
    }
}

function* updateQrWorker({ payload }) {
    try {
        //console.log("[qrSaga] updateQrWorker →", payload);
        const res = yield call(putOne, payload);
        const data = res?.data ?? res;
        yield put(qrUpdateSuccess(data ?? payload));
    } catch (err) {
        yield put(qrUpdateFailure(err?.response?.data?.message || err.message));
    }
}

/** ========= list (page만 전송) ========= */
function* listQrWorker({ payload }) {
    try {
        const {
            page = 0,
            append = false,
        } = payload || {};

        const params = buildPageOnlyParams({ page });
        //console.log("[qrSaga] payload →", payload.page);
        //console.log("[qrSaga] buildPageOnlyParams →", page);
        const res = yield call(fetchList, params);
        const data = res?.data ?? res;
        //console.log("[qrSaga] list res.data →", data)
        if (DEBUG) console.log("[qrSaga] list res.data →", data);

        const { items, total, nextCursor } = normalizeListResponse(data, { page });

        yield put(qrListSuccess({
            items,
            page,
            total,
            nextCursor,
            append,
        }));
    } catch (err) {
        yield put(qrListFailure(err?.response?.data?.message || err.message));
    }
}

/** ========= search ========= */
function* searchQrWorker({ payload }) {
    try {
        //console.log("[QRSaga] searchQrWorker", payload);
        const res = yield call(fetchSearch, payload);
        const data = res?.data ?? res;
        //console.log("[QRSaga] searchQrWorker data -> ", data);
        yield put(qrSearchSuccess(data || []));
    } catch (err) {
        yield put(qrSearchFailure(err?.response?.data?.message || err.message || "검색 실패"));
    }
}

export function* qrSaga() {
    yield all([
        takeLatest(qrSaveRequest.type, saveQrWorker),
        takeLatest(qrUpdateRequest.type, updateQrWorker),
        takeLatest(qrListRequest.type, listQrWorker),
        takeLatest(qrSearchRequest.type, searchQrWorker),
    ]);
}
