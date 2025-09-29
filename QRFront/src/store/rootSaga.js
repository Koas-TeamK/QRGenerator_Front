// store/rootSaga.js
import { all } from "redux-saga/effects";
import userSaga from "@/features/user/userSaga";
import { qrSaga } from "@/features/qr/qrSaga";

export default function* rootSaga() {
  yield all([
    qrSaga(),
    userSaga(),
  ]);
}
