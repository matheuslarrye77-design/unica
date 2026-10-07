export type Role = "collaborator" | "leadership";
export type TaskStatus = "todo" | "doing" | "review" | "done";
export type Priority = "low" | "normal" | "high" | "urgent";
export type AnnouncementType = "comunicado" | "noticia" | "aviso" | "evento";
export type ReactionType = "like" | "heart" | "clap" | "idea";
export type MoodType = "bem" | "normal" | "cansado" | "sobrecarregado" | "motivado";
export type MoodVisibility = "public" | "private";
export type RecognitionCategory = "proatividade" | "equipe" | "ideia" | "resultado" | "atendimento";
export type EventType = "reuniao" | "evento";
export type CalendarType = "aniversario" | "tarefa" | "reuniao" | "evento" | "comunicado";

export type SessionUser = {
  id: number;
  name: string;
  username: string;
  email: string;
  role: Role;
  jobTitle: string;
  department: string;
  birthday: string | null;
  bio: string;
  hasAvatar: boolean;
  theme: "light" | "dark";
  repostsVisible: boolean;
};

export type FeedComment = {
  id: number;
  body: string;
  createdAt: string;
  userId: number;
  userName: string;
  username: string;
  hasAvatar: boolean;
};

export type FeedPost = {
  id: number;
  body: string;
  createdAt: string;
  authorId: number;
  authorName: string;
  username: string;
  hasAvatar: boolean;
  hasImage: boolean;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  liked: boolean;
  reposted: boolean;
  repostedByName: string | null;
  comments: FeedComment[];
};

export type ActionResult = { ok: true; message?: string; id?: number } | { ok: false; error: string };

export type PersonOption = {
  id: number;
  name: string;
  jobTitle: string;
  department: string;
  hasAvatar: boolean;
  birthday: string | null;
  role?: Role;
  email?: string;
  active?: boolean;
  bio?: string;
};

export type TaskCard = {
  id: number;
  title: string;
  description: string;
  assigneeId: number;
  assigneeName: string;
  assigneeHasAvatar: boolean;
  creatorId: number;
  creatorName: string;
  priority: Priority;
  status: TaskStatus;
  dueDate: string | null;
  category: string;
  notes: string;
  commentCount: number;
  checklistTotal: number;
  checklistDone: number;
  overdue: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ChecklistItem = { id: number; title: string; done: boolean; position: number };
export type CommentItem = {
  id: number;
  body: string;
  createdAt: string;
  userId: number;
  userName: string;
  hasAvatar: boolean;
};
export type HistoryItem = { id: number; action: string; details: string; createdAt: string; userName: string };
export type AttachmentItem = { id: number; name: string; mime: string; size: number; createdAt: string };

export type TaskDetail = TaskCard & {
  checklist: ChecklistItem[];
  comments: CommentItem[];
  history: HistoryItem[];
  attachments: AttachmentItem[];
};

export type TeamMember = {
  id: number;
  name: string;
  jobTitle: string;
  department: string;
  hasAvatar: boolean;
  openCount: number;
  doingCount: number;
  overdueCount: number;
  doneCount: number;
};

export type TeamStats = {
  open: number;
  doing: number;
  overdue: number;
  done: number;
  dueToday: number;
};

export type ReactionCount = { type: ReactionType; count: number; mine: boolean };

export type AnnouncementCard = {
  id: number;
  title: string;
  content: string;
  type: AnnouncementType;
  authorId: number;
  authorName: string;
  authorHasAvatar: boolean;
  pinned: boolean;
  allowComments: boolean;
  eventDate: string | null;
  hasImage: boolean;
  createdAt: string;
  updatedAt: string;
  commentCount: number;
  reactions: ReactionCount[];
};

export type AnnouncementDetail = AnnouncementCard & { comments: CommentItem[] };

export type CalendarEntry = {
  id: string;
  type: CalendarType;
  title: string;
  date: string;
  time?: string | null;
  href?: string;
  meta?: string;
};

export type BirthdayPerson = {
  id: number;
  name: string;
  jobTitle: string;
  department: string;
  birthday: string;
  hasAvatar: boolean;
  nextDate: string;
  isToday: boolean;
};

export type BirthdayMessage = {
  id: number;
  body: string;
  year: number;
  createdAt: string;
  authorId: number;
  authorName: string;
  hasAvatar: boolean;
};

export type MoodSnapshot = { mood: MoodType; visibility: MoodVisibility; date: string };

export type MoodPerson = {
  userId: number;
  name: string;
  hasAvatar: boolean;
  mood: MoodType;
  visibility: MoodVisibility;
  date: string;
};

export type RecognitionItem = {
  id: number;
  fromId: number;
  fromName: string;
  fromHasAvatar: boolean;
  toId: number;
  toName: string;
  toHasAvatar: boolean;
  category: RecognitionCategory;
  message: string;
  createdAt: string;
};

export type AppNotification = {
  id: number;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

export type SearchResults = {
  tasks: { id: number; title: string; status: TaskStatus; dueDate: string | null }[];
  people: { id: number; name: string; jobTitle: string; department: string; hasAvatar: boolean }[];
  announcements: { id: number; title: string; type: AnnouncementType }[];
  events: { id: number; title: string; date: string; type: EventType }[];
};

export type TodayItem = { id: string; title: string; meta: string; href: string };

export type HomeData = {
  greeting: string;
  firstName: string;
  dateLabel: string;
  stats: { open: number; done: number; today: number; overdue: number };
  tasks: TaskCard[];
  today: TodayItem[];
  announcements: AnnouncementCard[];
  birthdays: BirthdayPerson[];
  recognitions: RecognitionItem[];
  mood: MoodSnapshot | null;
};

export type AuditItem = {
  id: number;
  action: string;
  entity: string;
  entityId: number | null;
  details: string;
  createdAt: string;
  userName: string | null;
};

export type FeedbackKind = "sugestao" | "critica" | "melhoria" | "observacao";
export type DocumentStatus = "pending" | "approved" | "rejected" | "archived";
export type DocumentPlatform = "pincel" | "prominas";

export type PollOptionView = { id: number; label: string; votes: number; selected: boolean };
export type PollView = {
  id: number;
  question: string;
  startsAt: string;
  endsAt: string;
  singleVote: boolean;
  hideResults: boolean;
  closed: boolean;
  canSeeResults: boolean;
  voted: boolean;
  authorName: string;
  options: PollOptionView[];
};

export type FeedbackView = {
  id: number;
  kind: FeedbackKind;
  body: string;
  anonymous: boolean;
  createdAt: string;
  authorName: string | null;
};

export type DocumentView = {
  id: number;
  title: string;
  description: string;
  category: string;
  platform: DocumentPlatform;
  status: DocumentStatus;
  originalName: string;
  authorId: number;
  authorName: string;
  createdAt: string;
  updatedAt: string;
};

export type CompanyEvent = {
  id: number;
  title: string;
  description: string;
  type: EventType;
  date: string;
  time: string | null;
  createdBy: number;
  creatorName: string;
};
