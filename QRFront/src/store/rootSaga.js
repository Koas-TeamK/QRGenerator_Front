// store/rootSaga.js
import { all } from "redux-saga/effects";
import userSaga from "@/features/user/UserSaga";
import { qrSaga } from "@/features/qr/QrSaga";

export default function* rootSaga() {
  yield all([
    qrSaga(),
    userSaga(),
  ]);
}
