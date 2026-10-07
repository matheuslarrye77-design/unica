import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/Header';
import { PageSection, PageWrapper } from '@/components/PageWrapper';
import { currentUser } from '@/data/mockData';
import { type FC } from 'react';

export const SettingsPage: FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PageWrapper className="px-4 py-6 sm:px-6 lg:px-8">
        <PageSection index={0}>
          <Card>
            <CardHeader>
              <CardTitle>Configurações</CardTitle>
              <CardDescription>Preferências da conta na Única.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">{currentUser.name}</p>
              <p className="text-muted-foreground">{currentUser.role}</p>
              <p className="text-muted-foreground">{currentUser.department}</p>
            </CardContent>
          </Card>
        </PageSection>
      </PageWrapper>
    </div>
  );
};
