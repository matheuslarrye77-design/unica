import { configureStore, type Middleware } from '@reduxjs/toolkit';
import { authSlice } from './slices/authSlice';

const localStorageMiddleware: Middleware = store => next => action => {
	const result = next(action);
	const state = store.getState();

	localStorage.setItem('wavefeed_auth', JSON.stringify(state.auth));

	return result;
};

export const store = configureStore({
	reducer: {
		auth: authSlice.reducer
	},
	middleware: getDefaultMiddleware => {
		return getDefaultMiddleware().concat(localStorageMiddleware);
	}
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
