export const TEAM_FUNCOES = ['Líder', 'Supervisor', 'Chat', 'E-mail', 'Ligação'] as const;
export type TeamFuncao = (typeof TEAM_FUNCOES)[number];

export const UNIQUE_FUNCOES: TeamFuncao[] = ['Líder', 'Supervisor'];

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  ramal: string;
  funcao: TeamFuncao;
  role: string;
  avatar: string;
  phone?: string;
};

function avatar(seed: string) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

function member(id: string, name: string, funcao: TeamFuncao, ramal: string, role: string): TeamMember {
  const email = `${name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '.')}@company.com`;
  return { id, name, email, ramal, funcao, role, avatar: avatar(name) };
}

export const teamRoster: TeamMember[] = [
  member('tm-1', 'Alexandra Mitchell', 'Líder', '1001', 'Líder'),
  member('tm-2', 'Bruno Almeida', 'Supervisor', '1002', 'Supervisor'),
  member('tm-3', 'Camila Souza', 'Chat', '1003', 'Atendimento'),
  member('tm-4', 'Felipe Costa', 'E-mail', '1004', 'Atendimento'),
  member('tm-5', 'Gabriela Lima', 'Ligação', '1005', 'Atendimento'),
  member('tm-6', 'Lucas Pereira', 'Chat', '1006', 'Atendimento'),
  member('tm-7', 'Mariana Alves', 'E-mail', '1007', 'Atendimento'),
  member('tm-8', 'Rafael Oliveira', 'E-mail', '1008', 'Atendimento'),
  member('tm-9', 'Juliana Fernandes', 'Ligação', '1009', 'Atendimento'),
  member('tm-10', 'Thiago Martins', 'Chat', '1010', 'Atendimento'),
  member('tm-11', 'Larissa Rocha', 'Chat', '1011', 'Atendimento'),
  member('tm-12', 'Gustavo Silva', 'Ligação', '1012', 'Atendimento'),
  member('tm-13', 'Beatriz Nunes', 'E-mail', '1013', 'Atendimento'),
  member('tm-14', 'Pedro Henrique', 'Ligação', '1014', 'Atendimento'),
  member('tm-15', 'Isabela Costa', 'Chat', '1015', 'Atendimento'),
  member('tm-16', 'Rodrigo Alves', 'E-mail', '1016', 'Atendimento'),
  member('tm-17', 'Fernanda Dias', 'Ligação', '1017', 'Atendimento'),
];
