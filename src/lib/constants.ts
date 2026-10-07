import type {
  AnnouncementType,
  EventType,
  MoodType,
  MoodVisibility,
  Priority,
  ReactionType,
  RecognitionCategory,
  TaskStatus,
} from "./types";

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "A fazer",
  doing: "Em andamento",
  review: "Em revisão",
  done: "Resolvidos",
};

export const STATUSES: TaskStatus[] = ["todo", "doing", "review", "done"];

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

export const PRIORITIES: Priority[] = ["low", "normal", "high", "urgent"];

export const ANNOUNCEMENT_LABEL: Record<AnnouncementType, string> = {
  comunicado: "Comunicado",
  noticia: "Notícia",
  aviso: "Aviso",
  evento: "Evento",
};

export const ANNOUNCEMENT_TYPES: AnnouncementType[] = ["comunicado", "noticia", "aviso", "evento"];

export const EVENT_LABEL: Record<EventType, string> = {
  reuniao: "Reunião",
  evento: "Evento",
};

export const MOODS: { id: MoodType; label: string; emoji: string }[] = [
  { id: "sobrecarregado", label: "Sobrecarregado", emoji: "😣" },
  { id: "cansado", label: "Cansado", emoji: "😕" },
  { id: "normal", label: "Normal", emoji: "😐" },
  { id: "bem", label: "Bem", emoji: "🙂" },
  { id: "motivado", label: "Motivado", emoji: "🚀" },
];

export const REACTIONS: { id: ReactionType; emoji: string; label: string }[] = [
  { id: "like", emoji: "👍", label: "Curtir" },
  { id: "heart", emoji: "❤️", label: "Apoiar" },
  { id: "clap", emoji: "👏", label: "Reconhecer" },
  { id: "idea", emoji: "💡", label: "Boa ideia" },
];

export const RECOGNITION_CATEGORIES: { id: RecognitionCategory; label: string; emoji: string }[] = [
  { id: "proatividade", label: "Proatividade", emoji: "👏" },
  { id: "equipe", label: "Trabalho em equipe", emoji: "🤝" },
  { id: "ideia", label: "Boa ideia", emoji: "💡" },
  { id: "resultado", label: "Resultado", emoji: "🚀" },
  { id: "atendimento", label: "Atendimento", emoji: "⭐" },
];

export const CATEGORY_SUGGESTIONS = [
  "Acadêmico",
  "Administrativo",
  "Atendimento",
  "Comunicação",
  "Financeiro",
  "Operacional",
];

export const VISIBILITY_LABEL: Record<MoodVisibility, string> = {
  public: "Público",
  private: "Privado",
};

export const INPUT_CLASS =
  "w-full min-h-11 rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none transition focus-visible:border-unica focus-visible:ring-2 focus-visible:ring-unica/25";

export const PRIORITY_STYLE: Record<Priority, string> = {
  low: "bg-[#F1F2F4] text-[#3F4A57]",
  normal: "bg-unica-wash text-unica",
  high: "bg-[#FBF3E4] text-warning",
  urgent: "bg-[#F8E8EB] text-danger",
};

export const PRIORITY_BAR: Record<Priority, string> = {
  low: "border-l-[#C5C8CE]",
  normal: "border-l-[#C4A6E4]",
  high: "border-l-[#D7B072]",
  urgent: "border-l-[#D48996]",
};
