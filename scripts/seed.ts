/**
 * Dados de demonstração, separados do funcionamento real da plataforma.
 * Não rode isto em um ambiente com pessoas reais.
 *
 *   npm run seed
 *
 * Senha de todas as contas de demonstração: unica-demo
 */
import bcrypt from "bcryptjs";
import { insert, get, transaction } from "../src/lib/db";
import { nowISO } from "../src/lib/dates";

const PASSWORD = "unica-demo";

const existing = get<{ id: number }>("SELECT id FROM users WHERE email = ?", "helena.duarte@unica.local");
if (existing) {
  console.log("A demonstração já existe. Apague data/unica.db se quiser recomeçar.");
  process.exit(0);
}

const now = nowISO();
const hash = bcrypt.hashSync(PASSWORD, 10);

const ids = transaction(() => {
  function user(name: string, email: string, role: "leadership" | "collaborator", job: string, department: string, birthday: string) {
    return insert(
      `INSERT INTO users (name, email, password_hash, role, job_title, department, birthday, bio, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, '', 1, ?, ?)`,
      name,
      email,
      hash,
      role,
      job,
      department,
      birthday,
      now,
      now,
    );
  }

  const helena = user("Helena Duarte", "helena.duarte@unica.local", "leadership", "Coordenadora", "Coordenação", "1988-10-04");
  const joao = user("João Ferreira", "joao.ferreira@unica.local", "collaborator", "Analista acadêmico", "Secretaria", "1994-10-08");
  const marina = user("Marina Costa", "marina.costa@unica.local", "collaborator", "Analista financeira", "Financeiro", "1992-10-15");
  const caio = user("Caio Mendes", "caio.mendes@unica.local", "collaborator", "Atendente", "Atendimento", "1996-10-21");
  const livia = user("Lívia Ramos", "livia.ramos@unica.local", "collaborator", "Designer", "Comunicação", "1995-03-12");

  function task(title: string, description: string, assignee: number, creator: number, priority: string, status: string, due: string | null, category: string) {
    const id = insert(
      `INSERT INTO tasks (title, description, assignee_id, creator_id, priority, status, due_date, category, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?)`,
      title,
      description,
      assignee,
      creator,
      priority,
      status,
      due,
      category,
      now,
      now,
    );
    insert(
      "INSERT INTO task_history (task_id, user_id, action, details, created_at) VALUES (?, ?, 'created', 'Criou a atividade', ?)",
      id,
      creator,
      now,
    );
    return id;
  }

  const report = task("Atualizar relatório mensal", "Conferir os números de outubro e publicar a versão final.", helena, helena, "high", "doing", "2026-10-05", "Financeiro");
  task("Revisar calendário acadêmico", "Validar as datas com a secretaria antes da publicação.", joao, helena, "normal", "todo", "2026-10-08", "Acadêmico");
  task("Fechar conciliação", "Itens em aberto do mês anterior.", marina, helena, "urgent", "review", "2026-10-02", "Financeiro");
  task("Responder solicitações da manhã", "Fila de atendimento acumulada.", caio, caio, "normal", "doing", "2026-10-04", "Atendimento");
  task("Preparar peça do mural", "Versão para o comunicado de sexta.", livia, livia, "low", "todo", "2026-10-10", "Comunicação");
  task("Arquivar documentos de setembro", "Digitalizar e nomear os arquivos.", joao, joao, "low", "done", "2026-09-30", "Administrativo");
  task("Organizar pauta da reunião geral", "Enviar a pauta até quinta.", helena, helena, "high", "todo", "2026-10-09", "Comunicação");

  insert("INSERT INTO task_checklist_items (task_id, title, done, position) VALUES (?, 'Conferir planilha', 1, 0)", report);
  insert("INSERT INTO task_checklist_items (task_id, title, done, position) VALUES (?, 'Validar com o financeiro', 0, 1)", report);
  insert("INSERT INTO task_checklist_items (task_id, title, done, position) VALUES (?, 'Publicar versão final', 0, 2)", report);
  insert(
    "INSERT INTO task_comments (task_id, user_id, body, created_at) VALUES (?, ?, 'Já conferi os documentos.', ?)",
    report,
    marina,
    now,
  );

  const post = insert(
    `INSERT INTO announcements (title, content, type, author_id, pinned, pinned_at, allow_comments, event_date, created_at, updated_at)
     VALUES (?, ?, 'comunicado', ?, 1, ?, 1, '2026-10-10', ?, ?)`,
    "Reunião geral na sexta",
    "Na próxima sexta-feira teremos reunião geral às 14h, no auditório principal.",
    helena,
    now,
    now,
    now,
  );
  insert(
    `INSERT INTO announcements (title, content, type, author_id, pinned, allow_comments, created_at, updated_at)
     VALUES ('Boas-vindas ao espaço interno', 'Este é o lugar para atividades, comunicados e recados da equipe.', 'noticia', ?, 0, 1, ?, ?)`,
    helena,
    now,
    now,
  );

  insert(
    `INSERT INTO events (title, description, type, event_date, event_time, created_by, created_at, updated_at)
     VALUES ('Reunião geral', 'Encontro mensal da equipe.', 'reuniao', '2026-10-10', '14:00', ?, ?, ?)`,
    helena,
    now,
    now,
  );
  insert(
    `INSERT INTO events (title, description, type, event_date, event_time, created_by, created_at, updated_at)
     VALUES ('Integração dos novos colegas', 'Uma hora para apresentar o espaço interno.', 'evento', '2026-10-16', '09:30', ?, ?, ?)`,
    helena,
    now,
    now,
  );

  insert(
    "INSERT INTO birthday_messages (recipient_id, author_id, year, body, created_at) VALUES (?, ?, 2026, 'Feliz aniversário, Helena. Que seu dia seja excelente.', ?)",
    helena,
    livia,
    now,
  );
  insert(
    "INSERT INTO birthday_messages (recipient_id, author_id, year, body, created_at) VALUES (?, ?, 2026, 'Parabéns pela parceria de sempre.', ?)",
    helena,
    joao,
    now,
  );

  insert(
    `INSERT INTO moods (user_id, mood_date, mood, visibility, created_at, updated_at) VALUES (?, '2026-10-04', 'motivado', 'public', ?, ?)`,
    helena,
    now,
    now,
  );
  insert(
    `INSERT INTO moods (user_id, mood_date, mood, visibility, created_at, updated_at) VALUES (?, '2026-10-04', 'bem', 'public', ?, ?)`,
    joao,
    now,
    now,
  );
  insert(
    `INSERT INTO moods (user_id, mood_date, mood, visibility, created_at, updated_at) VALUES (?, '2026-10-04', 'cansado', 'private', ?, ?)`,
    marina,
    now,
    now,
  );
  insert(
    `INSERT INTO moods (user_id, mood_date, mood, visibility, created_at, updated_at) VALUES (?, '2026-10-03', 'bem', 'public', ?, ?)`,
    joao,
    now,
    now,
  );

  insert(
    `INSERT INTO recognitions (from_user_id, to_user_id, category, message, created_at)
     VALUES (?, ?, 'atendimento', 'Quero agradecer ao Caio pela ajuda no atendimento de hoje.', ?)`,
    livia,
    caio,
    now,
  );
  insert(
    `INSERT INTO recognitions (from_user_id, to_user_id, category, message, created_at)
     VALUES (?, ?, 'equipe', 'A Marina destravou a conciliação com muita clareza.', ?)`,
    helena,
    marina,
    now,
  );

  insert(
    `INSERT INTO notifications (user_id, type, title, body, link, created_at)
     VALUES (?, 'announcement', 'Novo comunicado da liderança', 'Reunião geral na sexta', ?, ?)`,
    joao,
    `/mural/${post}`,
    now,
  );

  return { helena, joao, marina, caio, livia, post };
});

console.log("Demonstração criada.");
console.log("Senha de todas as contas: unica-demo");
console.log("Liderança: helena.duarte@unica.local");
console.log("Colaborador: joao.ferreira@unica.local");
console.log("Outras contas: marina.costa, caio.mendes e livia.ramos @unica.local");
void ids;
