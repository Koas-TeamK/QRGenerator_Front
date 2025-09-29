import { call, put, takeLatest, delay } from "redux-saga/effects";
import { message } from "antd";
import { loginRequest, loginSuccess, loginFailure, bootstrapRequest, bootstrapSuccess, bootstrapFailure } from "./userSlice";
import { api } from "../../lib/api";

const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";
const USE_MOCK = true;

// Authorization 헤더 세팅 유틸
function setAuthHeader(token) {
    if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
    else delete api.defaults.headers.common.Authorization;
}

//에러 메시지 추출
function getErrMsg(err, fallback) {
    return err?.response?.data?.message || err?.message || fallback;
}

function* handleLogin(action) {
    try {
        const { username, password } = action.payload;

        if (USE_MOCK) {
            yield delay(100);
            const myRole = "USER";
            const token = "dev-mock-token";
            setAuthHeader(token);
            localStorage.setItem(ACCESS_KEY, token);
            localStorage.setItem('myRole', JSON.stringify(myRole));
            yield put(loginSuccess({ myRole, token }));
            yield put(bootstrapSuccess());

            message.success(`로그인 성공. 데이터 유출에 조심해주세요.`);
            return;
        }

        ///////////
        const longinRes = yield call(apiLogin, { username, password });
        const data = longinRes?.data || {};
        console.log("[UserSaga] longinRes : ", longinRes.data);
        const accessToken = data.accessToken || data.token || null;
        const refreshToken = data.refreshToken || null;

        if (accessToken) {
            setAuthHeader(accessToken);
            localStorage.setItem(ACCESS_KEY, accessToken);
        }
        if (refreshToken) {
            localStorage.setItem(REFRESH_KEY, refreshToken);
        }

        // 내 정보 조회
        const meRes = yield call([api, api.get], "/api/user/me");
        const myRole = meRes?.data || null;
        localStorage.setItem('myRole', JSON.stringify(myRole));

        yield put(loginSuccess({ myRole, token: accessToken }));
        message.success(`로그인 성공. 데이터 유출에 조심해주세요.`);
        yield put(bootstrapSuccess());
    } catch (err) {
        const msg = getErrMsg(err, "아이디 또는 비밀번호를 확인해 주세요.");
        yield put(loginFailure(msg));
        message.error(msg);
    }
}

// --- 부트스트랩(새로고침 복구) ---
function* handleBootstrap() {
    try {
        const token = localStorage.getItem('access_token');
        const cachedMyRole = localStorage.getItem('myRole');

        // 토큰/캐시 둘 다 없으면 그냥 부트 종료
        if (!token && !cachedMyRole) {
            yield put(bootstrapSuccess());
            return;
        }

        // 1순위: 서버 me 동기화
        try {
            const meRes = yield call([api, api.get], '/api/user/me');
            const myRole = meRes?.data || null;
            localStorage.setItem('myRole', JSON.stringify(myRole || {}));
            yield put(loginSuccess({ myRole, token }));
            yield put(bootstrapSuccess());
            return;
        } catch (_) {
            // 2순위: 서버 실패 → 캐시로 복구
            if (cachedMyRole) {
                const myRole = JSON.parse(cachedMyRole);
                yield put(loginSuccess({ myRole, token }));
            }
            yield put(bootstrapSuccess());
            return;
        }
    } catch (e) {
        yield put(bootstrapFailure());
    }
}

export default function* userSaga() {
    yield takeLatest(loginRequest.type, handleLogin);
    yield takeLatest(bootstrapRequest.type, handleBootstrap);
}