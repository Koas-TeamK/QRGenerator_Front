import { combineReducers } from '@reduxjs/toolkit';
import userReducer from '@/features/user/userSlice';
import qrReducer from '@/features/qr/qrSlice';

const rootReducer = combineReducers({
  user: userReducer,
  qr: qrReducer,
});

export default rootReducer;
