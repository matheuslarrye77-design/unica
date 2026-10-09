import type { RootState } from '@/store';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { fetchPosts } from '../lib/api';
import Post from './Post';

const Profile = () => {
	const currentUser = useSelector((state: RootState) => state.auth.currentUser);
	const favorites = useSelector((state: RootState) => state.auth.favorites);

	const { data: allPosts } = useQuery({
		queryKey: ['posts'],
		queryFn: fetchPosts
	});

	const favoritePosts =
		allPosts?.filter(post => favorites.includes(post.id)) || [];

	if (!currentUser) {
		return (
			<div className="min-h-full">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
					<h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Profile</h1>
					<div className="bg-white shadow rounded-lg p-4 sm:p-6">
						<p className="text-sm sm:text-base text-gray-500 text-center sm:text-left">Please log in to view your profile.</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-full">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
				<h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Profile</h1>
				<div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
					<div className="flex items-center mb-4">
						<div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
							<span className="text-gray-500 text-xl sm:text-2xl">
								{currentUser.name.charAt(0).toUpperCase()}
							</span>
						</div>
						<div className="ml-3 sm:ml-4 min-w-0">
							<h2 className="text-lg sm:text-xl font-bold truncate">{currentUser.name}</h2>
							<p className="text-sm sm:text-base text-gray-500 truncate">{currentUser.email}</p>
							<p className="text-xs sm:text-sm text-gray-400">@{currentUser.username}</p>
						</div>
					</div>
				</div>

				<div>
					<h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">
						Favorite Posts ({favoritePosts.length})
					</h2>
					{favoritePosts.length > 0 ? (
						<div>
							{favoritePosts.map(post => (
								<Post
									key={post.id}
									post={post}
									showCommentsButton={false}
								/>
							))}
						</div>
					) : (
						<div className="bg-white shadow rounded-lg p-6">
							<p className="text-gray-500 text-center">
								You haven't added any posts to favorites yet.
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default Profile;
