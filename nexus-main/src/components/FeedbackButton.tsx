import { useShell } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { MessageSquare } from 'lucide-react';
import { useEffect, useState, type FC } from 'react';
import { FeedbackDialog } from './FeedbackDialog';

export const FeedbackButton: FC = () => {
  const { rightCollapsed } = useShell();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function openFeedback() {
      setOpen(true);
    }
    window.addEventListener('unica-open-feedback', openFeedback);
    return () => window.removeEventListener('unica-open-feedback', openFeedback);
  }, []);

  return (
    <>
      <div className={cn('fixed bottom-6 z-40 right-6', rightCollapsed ? 'lg:right-16' : 'lg:right-[21.5rem]')}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-10 gap-2 rounded-full border-primary bg-background/90 px-3 shadow-md backdrop-blur-sm"
              onClick={() => setOpen(true)}
            >
              <MessageSquare className="h-4 w-4" />
              Suporte
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Feedback</TooltipContent>
        </Tooltip>
      </div>
      <FeedbackDialog open={open} onOpenChange={setOpen} />
    </>
  );
};
