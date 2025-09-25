import { combineReducers } from '@reduxjs/toolkit';
import UserReducer from '../features/user/UserSlice';

const rootReducer = combineReducers({
  user: UserReducer,
});

export default rootReducer;
