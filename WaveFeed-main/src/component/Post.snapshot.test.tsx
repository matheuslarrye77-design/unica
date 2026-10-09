import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Post from './Post';
import { authSlice, register } from '../store/slices/authSlice';
import type { Post as PostType } from '../lib/api';

const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@tanstack/react-router')>();
	return {
		...actual,
		useNavigate: () => mockNavigate
	};
});

vi.mock('../hooks/useAuthGuard', () => ({
	useAuthGuard: () => true
}));

const mockPost: PostType = {
	id: 1,
	title: 'Snapshot Test Post Title',
	body: 'This is a snapshot test post body content that should be displayed correctly',
	tags: ['snapshot', 'test', 'example'],
	reactions: { likes: 10, dislikes: 2 },
	views: 100,
	userId: 1
};

describe('Post Component Snapshot Tests', () => {
	let store: ReturnType<typeof configureStore<{ auth: ReturnType<typeof authSlice.reducer> }>>;

	beforeEach(() => {
		localStorage.clear();
		store = configureStore({
			reducer: {
				auth: authSlice.reducer
			}
		});
		mockNavigate.mockClear();
	});

	const renderWithProviders = (component: React.ReactElement) => {
		return render(
			<Provider store={store}>
				{component}
			</Provider>
		);
	};

	it('should match snapshot for post without comments button', () => {
		store.dispatch(register({
			name: 'Test User',
			username: 'testuser',
			email: 'test@test.com',
			password: '123456'
		}));

		const { container } = renderWithProviders(
			<Post post={mockPost} showCommentsButton={false} />
		);
		expect(container).toMatchSnapshot('post-without-comments-button');
	});

	it('should match snapshot for post with comments button', () => {
		store.dispatch(register({
			name: 'Test User',
			username: 'testuser',
			email: 'test@test.com',
			password: '123456'
		}));

		const { container } = renderWithProviders(
			<Post post={mockPost} showCommentsButton={true} />
		);
		expect(container).toMatchSnapshot('post-with-comments-button');
	});
});

