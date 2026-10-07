import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Header } from '@/components/Header';
import { PageWrapper, PageSection } from '@/components/PageWrapper';
import { RightSidebar } from '@/components/shell/RightSidebar';
import { TeamMood } from '@/components/shell/TeamMood';
import { CalendarPage } from '@/pages/CalendarPage';
import { kudos as initialKudos, currentUser, type Kudo } from '@/data/mockData';
import { assertPermission, useInstitution } from '@/lib/institution';
import { formatRelativeTime, generateId } from '@/lib/utils';
import { Heart, Plus, ArrowLeft, Search } from 'lucide-react';
import { useState, type FC } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export const KudosFeedPage: FC = () => {
  const [kudosList, setKudosList] = useState<Kudo[]>(initialKudos);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newKudoTo, setNewKudoTo] = useState('');
  const [newKudoMessage, setNewKudoMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [scope, setScope] = useState<'all' | 'received' | 'sent'>('all');
  const { canRecognize } = useInstitution();

  const addKudo = async () => {
    if (!newKudoTo.trim() || !newKudoMessage.trim()) return;
    try {
      await assertPermission('recognition');
    } catch {
      toast.error('Você não tem permissão para reconhecer.');
      return;
    }

    const newKudo: Kudo = {
      id: generateId(),
      from: currentUser.name,
      to: newKudoTo.trim(),
      message: newKudoMessage.trim(),
      timestamp: new Date()
    };

    setKudosList(prev => [newKudo, ...prev]);

    // Reset form
    setNewKudoTo('');
    setNewKudoMessage('');
    setIsAddDialogOpen(false);
  };

  // Filter kudos based on search
  const filteredKudos = kudosList.filter((kudo) => {
    const matchesSearch = kudo.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         kudo.to.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         kudo.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesScope = scope === 'all'
      || (scope === 'received' && kudo.to === currentUser.name)
      || (scope === 'sent' && kudo.from === currentUser.name);
    return matchesSearch && matchesScope;
  });

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
            
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Heart className="h-6 w-6" />
                <h1 className="text-2xl font-bold tracking-tight">Reconhecimento</h1>
              </div>
              <p className="text-muted-foreground">
                Reconheça um colaborador e acompanhe os reconhecimentos da equipe
              </p>
            </div>
          </div>
        </PageSection>

        {/* Actions & Search Section */}
        <PageSection index={1}>
          <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Reconhecer e buscar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Input */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou mensagem..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              {/* Give Kudos Button */}
              {canRecognize ? <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Reconhecer
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Reconhecer colaborador</DialogTitle>
                    <DialogDescription>
                      Escolha quem será reconhecido e publique a mensagem.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="to" className="text-right">
                        Para
                      </Label>
                      <Input
                        id="to"
                        value={newKudoTo}
                        onChange={(e) => setNewKudoTo(e.target.value)}
                        placeholder="Nome do colaborador"
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-start gap-4">
                      <Label htmlFor="message" className="text-right pt-2">
                        Mensagem
                      </Label>
                      <Textarea
                        id="message"
                        value={newKudoMessage}
                        onChange={(e) => setNewKudoMessage(e.target.value)}
                        placeholder="Escreva o reconhecimento"
                        className="col-span-3"
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      onClick={addKudo}
                      disabled={!newKudoTo.trim() || !newKudoMessage.trim()}
                    >
                      Publicar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog> : null}
            </div>
            <div className="mt-4">
              <Select value={scope} onValueChange={(value) => setScope(value as 'all' | 'received' | 'sent')}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Reconhecimentos da equipe</SelectItem>
                  <SelectItem value="received">Recebidos</SelectItem>
                  <SelectItem value="sent">Enviados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              {filteredKudos.length} de {kudosList.length} reconhecimentos
            </div>
          </CardContent>
        </Card>
        </PageSection>

        {/* Kudos Feed */}
        <div className="space-y-4">
          {filteredKudos.length === 0 ? (
            <PageSection index={2}>
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="text-center space-y-2">
                    <Heart className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                    <h3 className="font-medium">
                      {searchQuery || scope !== 'all' ? 'Nenhum reconhecimento encontrado' : 'Nenhum reconhecimento ainda'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {searchQuery || scope !== 'all'
                        ? 'Ajuste a busca ou o filtro.'
                        : 'Seja o primeiro a reconhecer um colaborador.'
                      }
                    </p>
                    {!searchQuery && canRecognize ? (
                      <Button className="mt-4 gap-2" onClick={() => setIsAddDialogOpen(true)}>
                        <Plus className="h-4 w-4" />
                        Reconhecer
                      </Button>
                    ) : null}
                </div>
              </CardContent>
            </Card>
            </PageSection>
          ) : (
            filteredKudos.map((kudo, index) => (
              <PageSection key={kudo.id} index={index + 2}>
                <div 
                  className="p-6 rounded-lg border bg-gradient-to-r from-rose-500/5 to-pink-500/5 border-rose-500/20 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                  <div className="mt-1 text-red-600 dark:text-red-400">
                    <Heart className="h-5 w-5 fill-current" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">
                          <span className="text-red-600 dark:text-red-400">{kudo.from}</span>
                          {' → '}
                          <span className="text-red-600 dark:text-red-400 font-semibold">{kudo.to}</span>
                        </p>
                        <p className="text-sm leading-relaxed text-foreground">
                          {kudo.message}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {formatRelativeTime(kudo.timestamp)}
                      </span>
                    </div>
                  </div>
                  </div>
                </div>
              </PageSection>
            ))
          )}
        </div>

        {/* Load More Button (for future pagination) */}
        {filteredKudos.length > 0 && (
          <div className="mt-8 text-center">
            <Button variant="outline" disabled>
              Tudo carregado
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Todos os reconhecimentos estão na lista
            </p>
          </div>
        )}
      </PageWrapper>
      <RightSidebar>
        <CalendarPage compact />
        <TeamMood />
        <section className="shrink-0 rounded-2xl border bg-card p-3">
          <h2 className="px-1 text-sm font-semibold">Recentes</h2>
          <div className="mt-1">
            {initialKudos.slice(0, 4).map((kudo) => (
              <p key={kudo.id} className="px-1 py-2 text-sm">
                <span className="font-medium">{kudo.from.split(' ')[0]}</span>
                <span className="text-muted-foreground"> para {kudo.to.split(' ')[0]}</span>
              </p>
            ))}
          </div>
        </section>
      </RightSidebar>
      </div>
    </div>
  );
};
