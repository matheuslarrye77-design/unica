import { useAuthGuard } from '@/hooks/useAuthGuard';
import type { RootState } from '@/store';
import { toggleFavorite } from '@/store/slices/authSlice';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '../component/ui/button';
import { fetchCommentsByPostId, fetchPostById } from '../lib/api';

export const Route = createFileRoute('/posts/$id')({
	component: PostDetailPage,
	validateSearch: (search: Record<string, unknown>) => {
		return {
			comments: search.comments === 'true' || search.comments === true
		};
	}
});

function PostDetailPage() {
	const { id } = Route.useParams();
	const { comments: commentsOpenFromUrl } = Route.useSearch();
	const navigate = useNavigate();
	const dispatch = useDispatch();
	const isAuth = useAuthGuard();
	const postId = Number(id);
	const showComments = commentsOpenFromUrl || false;

	const favorites = useSelector((state: RootState) => state.auth.favorites);
	const isFavorite = favorites.includes(postId);

	const {
		data: post,
		isLoading,
		error
	} = useQuery({
		queryKey: ['post', id],
		queryFn: () => fetchPostById(id)
	});

	const { data: commentsData, isLoading: commentsLoading } = useQuery({
		queryKey: ['comments', id],
		queryFn: () => fetchCommentsByPostId(id),
		enabled: showComments
	});

	const handleGoBack = () => {
		window.history.back();
	};

	const toggleComments = () => {
		const newShowComments = !showComments;

		navigate({
			to: '/posts/$id',
			params: { id },
			search: newShowComments ? { comments: true } : { comments: false },
			replace: true
		});
	};

	const handleFavorite = () => {
		if (!isAuth) {
			navigate({ to: '/login' });
			return;
		}
		dispatch(toggleFavorite(postId));
	};

	if (isLoading) {
		return <div className="max-w-2xl mx-auto p-4">Loading...</div>;
	}

	if (error) {
		return <div className="max-w-2xl mx-auto p-4">Error: {error.message}</div>;
	}

	if (!post) {
		return <div className="max-w-2xl mx-auto p-4">Post not found</div>;
	}

	return (
		<div className="min-h-full">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<button
					onClick={handleGoBack}
					className="mb-6 px-4 py-2 cursor-pointer bg-blue-200 hover:bg-blue-300 rounded-lg flex items-center gap-2 transition-colors"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-5 w-5"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fillRule="evenodd"
							d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
							clipRule="evenodd"
						/>
					</svg>
					Back
				</button>

				<article className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 max-w-2xl mx-auto">
					<div className="mb-6">
						<h1 className="text-3xl font-bold text-gray-900 mb-4">
							{post.title}
						</h1>
						<p className="text-gray-700 leading-relaxed text-lg">{post.body}</p>
					</div>

					<div className="flex flex-wrap gap-2 mb-6">
						{post.tags.map(tag => (
							<span
								key={tag}
								className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-200"
							>
								#{tag}
							</span>
						))}
					</div>

					{/* Статистика поста */}
					<div className="flex items-center gap-4 pt-6 border-t border-gray-100">
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
							<span className="font-medium text-gray-900">
								{post.reactions.likes}
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
								className="text-gray-400 rotate-180"
							>
								<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
							</svg>
							<span className="font-medium text-gray-900">
								{post.reactions.dislikes}
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
							<span className="font-medium text-gray-900">{post.views}</span>
						</div>
					</div>

					{/* Кнопки действий - отдельная строка */}
					<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-gray-100 mt-4">
						<Button
							variant="ghost"
							size="sm"
							onClick={toggleComments}
							className="text-gray-600 hover:text-blue-600 w-full sm:w-auto justify-center sm:justify-start"
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
							{showComments ? 'Hide Comments' : 'Show Comments'}
						</Button>

						<Button
							variant="ghost"
							size="sm"
							onClick={handleFavorite}
							className={`text-gray-600 hover:text-red-500 cursor-pointer w-full sm:w-auto justify-center sm:justify-start ${
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
								className="mr-1"
							>
								<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
							</svg>
							{isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
						</Button>
					</div>

					{showComments && (
						<div className="mt-8 pt-8 border-t border-gray-200">
							<h2 className="text-2xl font-bold mb-6 text-gray-900">
								Comments {commentsData && `(${commentsData.total})`}
							</h2>
							{commentsLoading ? (
								<div className="text-gray-500">Loading comments...</div>
							) : (
								<div className="space-y-6">
									{commentsData?.comments.map(comment => (
										<div
											key={comment.id}
											className="border-b border-gray-100 pb-6 last:border-b-0"
										>
											<div className="flex items-center gap-2 mb-3">
												<span className="font-semibold text-gray-900">
													{comment.user.fullName}
												</span>
												<span className="text-gray-500 text-sm">
													@{comment.user.username}
												</span>
											</div>
											<p className="text-gray-700 mb-3 leading-relaxed">
												{comment.body}
											</p>
											<div className="flex items-center gap-1 text-sm text-gray-500">
												<svg
													xmlns="http://www.w3.org/2000/svg"
													width="16"
													height="16"
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
												<span>{comment.likes} likes</span>
											</div>
										</div>
									))}
									{commentsData?.comments.length === 0 && (
										<p className="text-gray-500">No comments yet</p>
									)}
								</div>
							)}
						</div>
					)}
				</article>
			</div>
		</div>
	);
}
