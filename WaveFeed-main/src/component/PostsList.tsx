import { useQuery } from '@tanstack/react-query';
import { fetchPosts } from '../lib/api';
import Post from './Post';

const PostsList = () => {
	const { data, isLoading, error } = useQuery({
		queryKey: ['posts'],
		queryFn: fetchPosts
	});

	if (isLoading) {
		return <h2>Loading...</h2>;
	}

	if (error) {
		return <h2>Something went wrong: {error.message}</h2>;
	}

	return (
		<div className=" max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<h2 className="text-2xl font-bold mb-4">Posts: {data?.length || 0}</h2>

			{data?.map(post => (
				<Post
					key={post.id}
					post={post}
					showCommentsButton={false}
				/>
			))}
		</div>
	);
};

export default PostsList;
