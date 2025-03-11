import { configureStore } from '@reduxjs/toolkit';
import schemaReducer from './schemaSlice';

export const store = configureStore({
  reducer: {
    schema: schemaReducer,
  },
}); 