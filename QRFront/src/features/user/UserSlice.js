import { createSlice } from "@reduxjs/toolkit";

const ACCESS_KEY = "access_token";
const ROLE_KEY = "myRole";

function readRole() {
    try {
        const raw = localStorage.getItem(ROLE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return localStorage.getItem(ROLE_KEY);
    }
}
const initialToken = localStorage.getItem(ACCESS_KEY);
const initialRole = readRole();

const initialState = {
    // --- 로그인 상태 ---
    myRole: initialRole ?? null,
    loading: false,
    error: null,
    token: initialToken ?? null,
    booting: false,
};

const userSlice = createSlice({
    name: "user",
    initialState,
    reducers: {
        // --- 로그인 ---
        loginRequest(state) {
            state.loading = true;
            state.error = null;
        },
        loginSuccess(state, action) {
            // payload는 보통 { myRole, token } 형태 (또는 { user/me/role })
            const p = action.payload || {};
            const role =
                p.myRole ?? p.role ?? p.user ?? p.me ?? null;
            const token = p.token ?? null;

            state.loading = false;
            state.myRole = role;
            state.token = token;
            state.error = null;

            //로컬스토리지에도 저장(하드 리다이렉트/새로고침 대응)
            if (token) localStorage.setItem(ACCESS_KEY, token);
            if (role !== undefined) localStorage.setItem(ROLE_KEY, JSON.stringify(role));

            // 하드 리다이렉트 계속 쓰고 싶다면 유지
            // (소프트 네비게이션을 쓰려면 이 줄은 지우고 컴포넌트에서 navigate 사용)
            window.location.assign("/main");
        },
        loginFailure(state, action) {
            state.loading = false;
            state.error = action.payload || "로그인에 실패했습니다.";
        },

        // --- 새로고침 복구 (옵션) ---
        bootstrapRequest(state) {
            state.booting = true;
        },
        bootstrapSuccess(state) {
            // localStorage 값으로 동기화 (안전 보정)
            state.token = localStorage.getItem(ACCESS_KEY) || null;
            state.myRole = readRole() ?? null;
            state.booting = false;
        },
        bootstrapFailure(state) {
            state.booting = false;
        },

    },
});

export const {
    loginRequest,
    loginSuccess,
    loginFailure,
    bootstrapRequest,
    bootstrapSuccess,
    bootstrapFailure,
} = userSlice.actions;

export default userSlice.reducer;
