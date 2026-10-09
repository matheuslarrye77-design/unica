import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { User } from '../../lib/api';

export interface LocalUser extends User {
	password: string;
}

export interface RegisterData {
	name: string;
	username: string;
	email: string;
	password: string;
}

export interface LoginData {
	email: string;
	password: string;
}

interface AuthState {
	users: LocalUser[];
	currentUser: LocalUser | null;
	isAuthenticated: boolean;
	favorites: number[];
}

const initialState: AuthState = {
	users: [],
	currentUser: null,
	isAuthenticated: false,
	favorites: []
};

const loadStateFrimStorage = () => {
	try {
		const serializedState = localStorage.getItem('wavefeed_auth');
		return serializedState === null
			? initialState
			: JSON.parse(serializedState);
	} catch (e) {
		console.log('Error while parsing: ', e);
		return initialState;
	}
};

export const authSlice = createSlice({
	name: 'auth',
	initialState: loadStateFrimStorage(),

	reducers: {
		register: (state, action: PayloadAction<RegisterData>) => {
			const existingUser = state.users.find(
				(user: LocalUser) => user.email === action.payload.email
			);

			if (!existingUser) {
				const newUser: LocalUser = {
					id: Date.now(),
					name: action.payload.name,
					username: action.payload.username,
					email: action.payload.email,
					password: action.payload.password
				};

				state.users.push(newUser);
				state.currentUser = newUser;
				state.isAuthenticated = true;
			}
		},

		login: (state, action: PayloadAction<LoginData>) => {
			const user = state.users.find(
				(user: LocalUser) => user.email === action.payload.email
			);

			if (user && user.password === action.payload.password) {
				state.currentUser = user;
				state.isAuthenticated = true;
			}
		},

		logout: state => {
			state.currentUser = null;
			state.isAuthenticated = false;
			state.favorites = [];
		},

		toggleFavorite: (state, action: PayloadAction<number>) => {
			const postId = action.payload;
			const index = state.favorites.indexOf(postId);

			if (index === -1) {
				state.favorites.push(postId);
			} else {
				state.favorites.splice(index, 1);
			}
		}
	}
});

export const { register, login, logout, toggleFavorite } = authSlice.actions;
