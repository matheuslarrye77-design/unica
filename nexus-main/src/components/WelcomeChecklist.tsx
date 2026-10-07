import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { storage } from '@/lib/utils';
import { X, Sparkles } from 'lucide-react';
import { useState, type FC, useEffect } from 'react';

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
}

interface WelcomeChecklistProps {
  onDismiss: () => void;
}

export const WelcomeChecklist: FC<WelcomeChecklistProps> = ({ onDismiss }) => {
  const [items, setItems] = useState<ChecklistItem[]>([
    {
      id: 'quick-links',
      label: 'Adicione um link rápido',
      description: 'Deixe os atalhos da rotina na coluna da direita',
      completed: false
    },
    {
      id: 'team-calendar',
      label: 'Veja o calendário',
      description: 'Eventos, aniversários e datas da equipe',
      completed: false
    },
    {
      id: 'focus-mode',
      label: 'Experimente o modo foco',
      description: 'Use o botão no cabeçalho para reduzir distrações',
      completed: false
    },
    {
      id: 'kudos',
      label: 'Reconheça alguém',
      description: 'Deixe um agradecimento no reconhecimento',
      completed: false
    },
    {
      id: 'directory',
      label: 'Conheça as pessoas',
      description: 'Encontre colegas por área',
      completed: false
    }
  ]);

  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;

  const handleCheckItem = (itemId: string, checked: boolean) => {
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, completed: checked } : item
    ));
  };

  const handleDismiss = () => {
    storage.setOnboarded();
    onDismiss();
  };

  useEffect(() => {
    // Removed automatic checking logic - users must manually check all items
  }, []);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-2 sm:space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Bem-vindo à Única
          </CardTitle>
          <CardDescription>
            Primeiros passos ({completedCount}/{totalCount})
          </CardDescription>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleDismiss}
          className="h-8 w-8 p-0 self-start sm:self-auto"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-start space-x-3">
              <Checkbox
                id={item.id}
                checked={item.completed}
                onCheckedChange={(checked) => handleCheckItem(item.id, checked as boolean)}
                className="mt-1"
              />
              <div className="flex-1 space-y-1">
                <label
                  htmlFor={item.id}
                  className={`text-sm font-medium leading-none cursor-pointer ${
                    item.completed ? 'line-through text-muted-foreground' : ''
                  }`}
                >
                  {item.label}
                </label>
                <p className="text-xs text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        {completedCount === totalCount && (
          <div className="mt-4 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
            <p className="text-sm text-green-800 dark:text-green-300 font-medium">
              🎉 Congratulations! You've completed the welcome checklist.
            </p>
            <Button 
              size="sm" 
              onClick={handleDismiss} 
              className="mt-2"
            >
              Finish Setup
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
