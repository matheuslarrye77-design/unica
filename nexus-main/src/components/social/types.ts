export type Attachment = {
  type: 'video' | 'document';
  name: string;
  url?: string;
};

export type SocialComment = {
  id: string;
  author: string;
  authorId?: string;
  avatar: string;
  body: string;
  time: string;
  likes: number;
  liked: boolean;
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
  attachment?: Attachment;
  likes: number;
  liked: boolean;
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
};
