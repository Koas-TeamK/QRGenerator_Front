// src/store/index.js
import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
// ⬇ rootReducer가 named export이면 { rootReducer } 로, default export면 그냥 rootReducer 로
import rootReducer from './rootReducer';
import rootSaga from './rootSaga';

const sagaMiddleware = createSagaMiddleware();

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefault) =>
    getDefault({
      serializableCheck: {
        ignoredActionPaths: ['payload.formData'],
        ignoredActions: ['qr/qrSaveRequest', 'qr/qrSaveSuccess'],
        ignoredPaths: ['qr.lastResponse'],
      },
    }).concat(sagaMiddleware),
  devTools: true,
});

sagaMiddleware.run(rootSaga);
