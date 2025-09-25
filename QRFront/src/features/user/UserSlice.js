import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    // --- 로그인 상태 ---
    myRole: null,
    loading: false,
    error: null,
    token: null,

    // 새로고침 복구
    booting: true,
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
            console.log("[UserSlice] loginSuccess : ", state, action);
            state.loading = false;
            state.myRole = action.payload.me ?? action.payload.user ?? null;
            state.token = action.payload.token ?? null;
            state.error = null;
        },
        loginFailure(state, action) {
            state.loading = false;
            state.error = action.payload || "로그인에 실패했습니다.";
        },

        // 새로고침 복구
        bootstrapRequest(state) {
            state.booting = true;
        },
        bootstrapSuccess(state) {
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
