import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import Post from '../component/Post';
import { fetchPostsByTag } from '../lib/api';

export const Route = createFileRoute('/posts/tag/$tag')({
	component: PostsListTagPage
});

function PostsListTagPage() {
	const { tag } = Route.useParams() as { tag: string };

	const { data, isLoading, error } = useQuery({
		queryKey: ['posts', 'tag', tag],
		queryFn: () => fetchPostsByTag(tag)
	});

	if (isLoading) {
		return <h2>Loading posts with tag "{tag}"...</h2>;
	}

	if (error) {
		return <h2>Something went wrong: {error.message}</h2>;
	}

	return (
		<div className="max-w-4xl mx-auto p-4">
			<h2 className="text-2xl font-bold mb-4">
				Posts with tag: <span className="text-blue-600">#{tag}</span> (
				{data?.length || 0})
			</h2>

			{data?.map(post => (
				<Post
					key={post.id}
					post={post}
				/>
			))}
		</div>
	);
}
