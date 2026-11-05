export const SERVICE_FUNCOES = ['Ligação', 'Chat', 'E-mail'];
export const CALL_FIELDS = ['atendidas', 'perdidas', 'espera', 'duracao'];
export const SHARED_FIELDS = ['faltas'];
export const CORE_FIELDS = ['resolvidosCount', 'transferidos', 'primeira', 'resolucao'];

export const VALUE_FIELDS = [
  'resolvidosCount',
  'resolvidos',
  'transferidos',
  'primeira',
  'resolucao',
  'satisfacao',
  'atendidas',
  'perdidas',
  'espera',
  'duracao',
  'faltas',
];

export const FIELD_NAMES = {
  resolvidosCount: 'Tickets resolvidos',
  resolvidos: 'Tickets resolvidos (%)',
  transferidos: 'Tickets transferidos',
  primeira: 'Primeira resposta',
  resolucao: 'Tempo médio de resolução',
  satisfacao: 'Satisfação',
  atendidas: 'Ligações atendidas',
  perdidas: 'Ligações perdidas sem resgate',
  espera: 'Tempo de espera',
  duracao: 'Duração da ligação',
  faltas: 'Faltas sem atestado',
};

export const FIELD_UNITS = {
  resolvidos: '%',
  satisfacao: '%',
  primeira: ' min',
  resolucao: ' min',
  espera: ' min',
  duracao: ' min',
};

export const OVERALL_FIELD_DEFS = [
  { id: 'resolvidosCount', weightKey: 'resolvidos', higher: true, unit: '', ask: 'a quantidade de tickets resolvidos da meta', channels: ['Chat', 'E-mail'] },
  { id: 'transferidos', weightKey: 'transferidos', higher: false, unit: '', ask: 'a quantidade de tickets transferidos da meta', channels: ['Chat', 'E-mail'] },
  { id: 'primeira', weightKey: 'primeira', higher: false, unit: ' min', ask: 'os minutos da meta de Primeira resposta', channels: ['Chat', 'E-mail'] },
  { id: 'resolucao', weightKey: 'resolucao', higher: false, unit: ' min', ask: 'os minutos da meta de Tempo médio de resolução (TMA)', channels: ['Chat', 'E-mail'] },
  { id: 'atendidas', weightKey: 'atendidas', higher: true, unit: '', ask: 'a quantidade da meta de ligações atendidas', channels: ['Ligação'] },
  { id: 'perdidas', weightKey: 'perdidas', higher: false, unit: '', ask: 'a quantidade da meta de ligações perdidas sem resgate', channels: ['Ligação'] },
  { id: 'espera', weightKey: 'espera', higher: false, unit: ' min', ask: 'os minutos da meta de tempo de espera', channels: ['Ligação'] },
  { id: 'duracao', weightKey: 'duracao', higher: false, unit: ' min', ask: 'os minutos da meta de duração da ligação', channels: ['Ligação'] },
  { id: 'faltas', weightKey: 'faltas', higher: false, unit: '', ask: 'a quantidade da meta de faltas sem atestado', channels: SERVICE_FUNCOES },
];

export function blankValues() {
  return Object.fromEntries(VALUE_FIELDS.map((field) => [field, null]));
}

export function indicatorsForFuncao(funcao) {
  if (funcao === 'Ligação') return [...CALL_FIELDS, ...SHARED_FIELDS];
  if (funcao === 'Chat' || funcao === 'E-mail') return [...CORE_FIELDS, ...SHARED_FIELDS];
  return [];
}

export function fieldApplies(field, funcao) {
  const id = field === 'resolvidos' ? 'resolvidosCount' : field;
  if (String(id).startsWith('c:')) return Boolean(funcao);
  return indicatorsForFuncao(funcao).includes(id);
}

export function formatFieldValue(field, value) {
  if (value == null) return '';
  if (field === 'resolvidos' || field === 'satisfacao') return `${value}%`;
  if (field === 'primeira' || field === 'resolucao' || field === 'espera' || field === 'duracao') return `${value} min`;
  return String(value);
}
