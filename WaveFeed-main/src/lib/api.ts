export type Post = {
	id: number;
	title: string;
	body: string;
	tags: string[];
	reactions: {
		likes: number;
		dislikes: number;
	};
	views: number;
	userId: number;
};

export type User = {
	id: number;
	name: string;
	username: string;
	email: string;
};

export interface UserComment {
	id: number;
	username: string;
	fullName: string;
}

export type Comment = {
	id: number;
	body: string;
	postId: number;
	likes: number;
	user: UserComment;
};

export interface Comments {
	comments: Comment[];
	total: number;
	skip: number;
	limit: number;
}

export const fetchPosts = async (): Promise<Post[]> => {
	const response = await fetch('https://dummyjson.com/posts');

	if (!response.ok) {
		throw new Error('Some Error Occurred');
	}
	const data = await response.json();

	return data.posts;
};

export const fetchPostById = async (id: string): Promise<Post> => {
	const response = await fetch(`https://dummyjson.com/posts/${id}`);

	if (!response.ok) {
		throw new Error('Some Error Occurred');
	}

	const data = await response.json();
	return data;
};

export const fetchPostsByTag = async (tag: string): Promise<Post[]> => {
	const response = await fetch(`https://dummyjson.com/posts/tag/${tag}`);

	if (!response.ok) {
		throw new Error('Some Error Occurred');
	}

	const data = await response.json();
	return data.posts;
};

export const fetchCommentsByPostId = async (id: string): Promise<Comments> => {
	const response = await fetch(`https://dummyjson.com/posts/${id}/comments`);

	if (!response.ok) {
		throw new Error('Some Error Occurred');
	}

	const data = await response.json();
	return data;
};
