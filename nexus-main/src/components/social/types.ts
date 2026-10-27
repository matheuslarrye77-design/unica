export type Attachment = {
  type: 'video' | 'document' | 'audio';
  name: string;
  url?: string;
  start?: number;
  duration?: number;
};

export type CommentMedia = { kind: 'gif' | 'sticker' | 'image' | 'video'; url: string };

export type PostBlock = { type: 'text'; text: string } | { type: 'image'; url: string };

export type SocialComment = {
  id: string;
  author: string;
  authorId?: string;
  avatar: string;
  body: string;
  time: string;
  likes: number;
  liked: boolean;
  media?: CommentMedia;
};

export type PollOption = {
  id: string;
  label: string;
  votes: number;
};

export type PostKind = 'text' | 'image' | 'announcement' | 'recognition' | 'leadership' | 'poll' | 'event';

export type SocialPost = {
  id: string;
  kind: PostKind;
  author: string;
  authorId?: string;
  role: string;
  department: string;
  avatar: string;
  time: string;
  body: string;
  image?: string;
  images?: string[];
  blocks?: PostBlock[];
  attachment?: Attachment;
  likes: number;
  liked: boolean;
  reaction?: 'like' | 'love' | null;
  myReactions?: ('like' | 'love')[];
  reactors?: { name: string; kind: 'like' | 'love' }[];
  saved?: boolean;
  shares: number;
  shared: boolean;
  comments: SocialComment[];
  commentsOpen: boolean;
  bannerTitle?: string;
  recognizedName?: string;
  tag?: string;
  poll?: PollOption[];
  votedId?: string | null;
  eventWhen?: string;
  eventWhere?: string;
  audience?: 'team' | 'management';
  mood?: string;
};
