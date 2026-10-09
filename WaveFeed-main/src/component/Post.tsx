import { useAuthGuard } from '@/hooks/useAuthGuard';
import type { RootState } from '@/store';
import { toggleFavorite } from '@/store/slices/authSlice';
import { useNavigate } from '@tanstack/react-router';
import { useDispatch, useSelector } from 'react-redux';
import type { Post as PostType } from '../lib/api';
import { Button } from './ui/button';

type PostProps = {
	post: PostType;
	showCommentsButton?: boolean;
};

const Post = ({ post, showCommentsButton = true }: PostProps) => {
	const navigate = useNavigate();
	const dispatch = useDispatch();
	const { id, title, body, tags, reactions, views } = post;
	const isAuth = useAuthGuard();

	const favorites = useSelector((state: RootState) => state.auth.favorites);
	const isFavorite = favorites.includes(id);

	const handleSelectTag = (e: React.MouseEvent, tag: string) => {
		e.stopPropagation();
		if (!isAuth) {
			navigate({ to: '/login' });
			return;
		}

		navigate({ to: '/posts/tag/$tag', params: { tag: tag } });
	};

	const handlePostClick = () => {
		if (!isAuth) {
			navigate({ to: '/login' });
			return;
		}
		navigate({
			to: '/posts/$id',
			params: { id: String(id) },
			search: { comments: false }
		});
	};

	const handleComments = (e: React.MouseEvent) => {
		if (!isAuth) {
			navigate({ to: '/login' });
			return;
		}
		e.stopPropagation();
		navigate({
			to: '/posts/$id',
			params: { id: String(id) },
			search: { comments: true }
		});
	};

	const handleFavorite = (e: React.MouseEvent) => {
		if (!isAuth) {
			navigate({ to: '/login' });
			return;
		}
		e.stopPropagation();
		dispatch(toggleFavorite(id));
	};

	return (
		<article
			onClick={handlePostClick}
			className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 p-6 max-w-2xl mx-auto mb-6 cursor-pointer group"
		>
			<div className="mb-4">
				<h2 className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-2">
					{title}
				</h2>
				<p className="text-gray-700 leading-relaxed line-clamp-3">{body}</p>
			</div>

			<div className="flex flex-wrap gap-2 mb-4">
				{tags.map(tag => (
					<button
						onClick={e => handleSelectTag(e, tag)}
						key={tag}
						className="px-3 py-1 cursor-pointer bg-blue-50 text-blue-700 rounded-full text-sm font-medium hover:bg-blue-100 transition-colors border border-blue-200"
					>
						#{tag}
					</button>
				))}
			</div>

			<div className="flex items-center justify-between pt-4 border-t border-gray-100">
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-1 text-gray-600">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							className="text-red-500"
						>
							<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
						</svg>
						<span className="font-medium text-gray-900">{reactions.likes}</span>
					</div>

					<div className="flex items-center gap-1 text-gray-600">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							className="text-gray-400 rotate-180"
						>
							<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
						</svg>
						<span className="font-medium text-gray-900">
							{reactions.dislikes}
						</span>
					</div>

					<div className="flex items-center gap-1 text-gray-600">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							className="text-blue-500"
						>
							<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
							<circle
								cx="12"
								cy="12"
								r="3"
							/>
						</svg>
						<span className="font-medium text-gray-900">{views}</span>
					</div>
				</div>

				<div className="flex items-center gap-2">
					{showCommentsButton && (
						<Button
							variant="ghost"
							size="sm"
							onClick={handleComments}
							className="text-gray-600 hover:text-blue-600"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="18"
								height="18"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								className="mr-1"
							>
								<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
							</svg>
							Comments
						</Button>
					)}

					<Button
						variant="ghost"
						size="icon"
						onClick={handleFavorite}
						className={`text-gray-600 hover:text-red-500 cursor-pointer ${
							isFavorite ? 'text-red-500' : ''
						}`}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill={isFavorite ? 'currentColor' : 'none'}
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
						</svg>
					</Button>
				</div>
			</div>
		</article>
	);
};

export default Post;
