import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/Header';
import { PageWrapper, PageSection } from '@/components/PageWrapper';
import { RightSidebar } from '@/components/shell/RightSidebar';
import { TeamMood } from '@/components/shell/TeamMood';
import { CalendarPage } from '@/pages/CalendarPage';
import { currentUser, employees, type Employee } from '@/data/mockData';
import { saveRamal, useInstitution } from '@/lib/institution';
import { ArrowLeft, Search, Mail, Phone, Plus } from 'lucide-react';
import { useEffect, useState, type FC, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { authHeaders, actor } from '@/lib/session';
import { isLeader } from '@/lib/institution';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const getDepartmentBadgeColor = (department: string) => {
  switch (department) {
    case 'Executive':
      return 'border-yellow-600 bg-yellow-50 text-yellow-700 dark:border-yellow-300 dark:bg-yellow-100 dark:text-yellow-800';
    case 'Engineering':
      return 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-300 dark:bg-blue-100 dark:text-blue-800';
    case 'Design':
      return 'border-purple-600 bg-purple-50 text-purple-700 dark:border-purple-300 dark:bg-purple-100 dark:text-purple-800';
    case 'Product':
      return 'border-green-600 bg-green-50 text-green-700 dark:border-green-300 dark:bg-green-100 dark:text-green-800';
    case 'Marketing':
      return 'border-orange-600 bg-orange-50 text-orange-700 dark:border-orange-300 dark:bg-orange-100 dark:text-orange-800';
    case 'Sales':
      return 'border-pink-600 bg-pink-50 text-pink-700 dark:border-pink-300 dark:bg-pink-100 dark:text-pink-800';
    case 'HR':
      return 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-300 dark:bg-indigo-100 dark:text-indigo-800';
    default:
      return 'border-muted-foreground/20 bg-muted text-muted-foreground';
  }
};

function teamRole(employee: Employee) {
  if (/chief|director|vp\b|head|manager|gerente|coordena|líder|lider|ceo/i.test(employee.role)) return 'Liderança';
  const index = [...employee.id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 3;
  return (['Ligação', 'E-mail', 'Chat'] as const)[index];
}

const RamalField: FC<{ employeeId: string }> = ({ employeeId }) => {
  const { people, isLeader } = useInstitution();
  const saved = people[employeeId]?.ramal ?? '';
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(saved);
  const canEdit = isLeader || employeeId === currentUser.id;

  useEffect(() => {
    setValue(saved);
  }, [saved]);

  if (!canEdit && !saved) return null;
  if (!editing) {
    return (
      <button type="button" className="text-xs text-muted-foreground" disabled={!canEdit} onClick={() => setEditing(true)}>
        Ramal: {saved || '—'}
      </button>
    );
  }

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const next = value.trim();
        if (next && !/^\d{3}$/.test(next)) return;
        void saveRamal(employeeId, next).then(() => setEditing(false));
      }}
    >
      <Input value={value} inputMode="numeric" placeholder="000" className="h-8 w-16" onChange={(event) => setValue(event.target.value.replace(/\D/g, '').slice(0, 3))} />
      <Button type="submit" size="sm" variant="outline">Salvar</Button>
    </form>
  );
};

type Colleague = Employee & { funcao?: string };

export const EmployeeDirectoryPage: FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: '', funcao: 'Ligação', phone: '', ramal: '' });
  const leader = isLeader(actor());

  useEffect(() => {
    void fetch('/api/colleagues', { headers: authHeaders() })
      .then((response) => response.json() as Promise<{ colleagues: Colleague[] }>)
      .then((data) => setColleagues(data.colleagues ?? []))
      .catch(() => undefined);
  }, []);

  const roster: Colleague[] = [
    ...colleagues.filter((colleague) => !employees.some((employee) => employee.email && employee.email === colleague.email)),
    ...employees,
  ];
  const filteredEmployees = roster.filter((employee) => {
    const text = searchQuery.toLowerCase();
    return employee.name.toLowerCase().includes(text) ||
      employee.role.toLowerCase().includes(text) ||
      (employee.email?.toLowerCase().includes(text) ?? false);
  });

  async function addColleague(event: FormEvent) {
    event.preventDefault();
    const response = await fetch('/api/colleagues', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(form),
    });
    if (response.status === 409) {
      toast.error('Já existe um colaborador com este e-mail.');
      return;
    }
    if (!response.ok) {
      toast.error('Preencha nome, e-mail, função e cargo.');
      return;
    }
    const data = await response.json() as { colleague: Colleague };
    setColleagues((current) => [data.colleague, ...current]);
    setOpen(false);
    setForm({ name: '', email: '', role: '', funcao: 'Ligação', phone: '', ramal: '' });
    toast.success('Colaborador adicionado.');
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="flex w-full flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:items-start lg:px-8">
      <PageWrapper className="min-w-0 flex-1">
        {/* Header Section */}
        <PageSection index={0}>
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <Link to="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar ao início
                </Button>
              </Link>
            </div>
            
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight">Pessoas</h1>
                <p className="text-muted-foreground">Diretório da equipe</p>
              </div>
              {leader ? <Button className="gap-2" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Adicionar colaborador</Button> : null}
            </div>
          </div>
        </PageSection>

        <PageSection index={1}>
          <div className="space-y-6">
              {/* Filters Section */}
              <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Pesquisar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Search Input */}
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Pesquisar por nome, cargo ou e-mail..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-4 text-sm text-muted-foreground">
                  {filteredEmployees.length} de {roster.length} colaboradores
                </div>
              </CardContent>
            </Card>

        {/* Employee Cards */}
        <div className="space-y-4">
          {filteredEmployees.length === 0 ? (
            <PageSection index={2}>
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="text-center space-y-2">
                    <div className="h-12 w-12 mx-auto bg-muted rounded-full flex items-center justify-center">
                      <Search className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium">Nenhum colaborador encontrado</h3>
                    <p className="text-sm text-muted-foreground">
                      Ajuste a pesquisa.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </PageSection>
          ) : (
            <div className="equipe-wrap">
            <div className="equipe-grid">
              {filteredEmployees.map((employee, index) => (
                <PageSection key={employee.id} index={index + 2}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <img
                          src={employee.avatar}
                          alt={employee.name}
                          className="w-12 h-12 rounded-full bg-muted"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="space-y-3">
                          <div>
                            <h3 className="font-medium truncate">{employee.name}</h3>
                            <p className="text-sm text-muted-foreground truncate">{employee.role}</p>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            <Badge 
                              variant="outline"
                              className={getDepartmentBadgeColor(employee.department)}
                            >
                              {employee.department}
                            </Badge>
                            <Badge variant="outline">{employee.funcao || teamRole(employee)}</Badge>
                          </div>
                          <RamalField employeeId={employee.id} />

                          {/* Contact Information */}
                          <div className="space-y-2">
                            {employee.email && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                <span className="truncate">{employee.email}</span>
                              </div>
                            )}
                            {employee.phone && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                <span>{employee.phone}</span>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2 pt-2">
                            {employee.email && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 gap-2 text-xs"
                                onClick={() => window.open(`mailto:${employee.email}`, '_blank')}
                              >
                                <Mail className="h-3 w-3" />
                                Email
                              </Button>
                            )}
                            {employee.phone && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 gap-2 text-xs"
                                onClick={() => window.open(`tel:${employee.phone}`, '_blank')}
                              >
                                <Phone className="h-3 w-3" />
                                Call
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                </PageSection>
              ))}
            </div>
            </div>
          )}
        </div>
          </div>
        </PageSection>
      </PageWrapper>
      <RightSidebar>
        <CalendarPage compact />
        <TeamMood />
      </RightSidebar>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar colaborador</DialogTitle>
          </DialogHeader>
          <form id="novo-colaborador" className="grid gap-3" onSubmit={(event) => void addColleague(event)}>
            <div className="grid gap-1"><Label htmlFor="col-nome">Nome</Label><Input id="col-nome" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></div>
            <div className="grid gap-1"><Label htmlFor="col-email">E-mail</Label><Input id="col-email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></div>
            <div className="grid gap-1"><Label htmlFor="col-cargo">Cargo</Label><Input id="col-cargo" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} required /></div>
            <div className="grid gap-1">
              <Label htmlFor="col-funcao">Função</Label>
              <select id="col-funcao" className="h-9 rounded-md border bg-background px-3 text-sm" value={form.funcao} onChange={(event) => setForm({ ...form, funcao: event.target.value })}>
                {['Ligação', 'E-mail', 'Chat', 'Liderança'].map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div className="grid gap-1"><Label htmlFor="col-telefone">Telefone</Label><Input id="col-telefone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></div>
            <div className="grid gap-1"><Label htmlFor="col-ramal">Ramal</Label><Input id="col-ramal" inputMode="numeric" value={form.ramal} onChange={(event) => setForm({ ...form, ramal: event.target.value.replace(/\D/g, '').slice(0, 3) })} placeholder="000" /></div>
          </form>
          <DialogFooter>
            <Button type="submit" form="novo-colaborador">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
