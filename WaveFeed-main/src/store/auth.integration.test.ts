import { configureStore } from '@reduxjs/toolkit';
import { beforeEach, describe, expect, it } from 'vitest';
import type { LoginData, RegisterData } from './slices/authSlice';
import {
	authSlice,
	login,
	logout,
	register,
	toggleFavorite
} from './slices/authSlice';

type TestStore = ReturnType<
	typeof configureStore<{ auth: ReturnType<typeof authSlice.reducer> }>
>;

describe('Auth Store Integration Tests', () => {
	let store: TestStore;

	beforeEach(() => {
		localStorage.clear();
		store = configureStore({
			reducer: {
				auth: authSlice.reducer
			}
		});
	});

	it('should handle complete registration, logout, and login flow', () => {
		const registerData: RegisterData = {
			name: 'Jane Doe',
			username: 'janedoe',
			email: 'jane@example.com',
			password: 'secure123'
		};

		store.dispatch(register(registerData));
		const state = store.getState().auth;

		expect(state.isAuthenticated).toBe(true);
		expect(state.currentUser).toBeTruthy();
		expect(state.currentUser?.email).toBe('jane@example.com');
		expect(state.users).toHaveLength(1);

		store.dispatch(logout());
		const stateAfterLogout = store.getState().auth;
		expect(stateAfterLogout.isAuthenticated).toBe(false);
		expect(stateAfterLogout.currentUser).toBeNull();
		expect(stateAfterLogout.favorites).toHaveLength(0);

		const loginData: LoginData = {
			email: 'jane@example.com',
			password: 'secure123'
		};
		store.dispatch(login(loginData));
		const stateAfterLogin = store.getState().auth;

		expect(stateAfterLogin.isAuthenticated).toBe(true);
		expect(stateAfterLogin.currentUser?.email).toBe('jane@example.com');
		expect(stateAfterLogin.currentUser?.name).toBe('Jane Doe');
	});

	it('should integrate favorites with user authentication flow', () => {
		const registerData: RegisterData = {
			name: 'Test User',
			username: 'testuser',
			email: 'test@example.com',
			password: 'test123'
		};

		store.dispatch(register(registerData));

		store.dispatch(toggleFavorite(1));
		store.dispatch(toggleFavorite(2));
		store.dispatch(toggleFavorite(3));

		const stateAfterFavorites = store.getState().auth;
		expect(stateAfterFavorites.favorites).toHaveLength(3);
		expect(stateAfterFavorites.favorites).toContain(1);
		expect(stateAfterFavorites.favorites).toContain(2);
		expect(stateAfterFavorites.favorites).toContain(3);

		store.dispatch(toggleFavorite(2));
		const stateAfterRemove = store.getState().auth;
		expect(stateAfterRemove.favorites).toHaveLength(2);
		expect(stateAfterRemove.favorites).not.toContain(2);
		expect(stateAfterRemove.favorites).toContain(1);
		expect(stateAfterRemove.favorites).toContain(3);

		store.dispatch(logout());
		const stateAfterLogout = store.getState().auth;
		expect(stateAfterLogout.favorites).toHaveLength(0);
		expect(stateAfterLogout.isAuthenticated).toBe(false);
	});
});
