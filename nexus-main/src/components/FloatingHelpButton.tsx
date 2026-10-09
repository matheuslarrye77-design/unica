import { FeedbackDialog } from '@/components/FeedbackDialog';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Headphones } from 'lucide-react';
import { useEffect, useState, type FC } from 'react';

export const FloatingHelpButton: FC = () => {
  const [open, setOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  useEffect(() => {
    const openFeedback = () => setOpen(true);
    window.addEventListener('unica-open-feedback', openFeedback);
    return () => window.removeEventListener('unica-open-feedback', openFeedback);
  }, []);

  return (
    <>
      <div className="fixed bottom-26 right-6 z-40">
        <Tooltip open={tooltipOpen} onOpenChange={setTooltipOpen}>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="relative h-14 w-14 rounded-full border-primary bg-background/90 text-foreground shadow-md backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:scale-105 hover:bg-accent hover:text-foreground hover:shadow-lg"
              aria-label="Suporte"
              onClick={() => {
                setTooltipOpen(false);
                setOpen(true);
              }}
            >
              <Headphones size={24} style={{ width: '24px', height: '24px' }} className="text-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Suporte</TooltipContent>
        </Tooltip>
      </div>
      <FeedbackDialog open={open} onOpenChange={setOpen} />
    </>
  );
};
