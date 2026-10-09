import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { actor } from '@/lib/session';
import { useInstitution } from '@/lib/institution';
import { type FC } from 'react';

export const ProfilePage: FC = () => {
  const user = actor();
  const { people } = useInstitution();
  const ramal = people[user.id]?.ramal;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-xl px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
          </CardHeader>
          <CardContent className="flex items-start gap-4 text-sm">
            <img src={user.avatar} alt="" className="h-16 w-16 rounded-full bg-muted" />
            <div className="space-y-1">
              <p className="text-base font-semibold">{user.name}</p>
              <p className="text-muted-foreground">{user.role}</p>
              <p className="text-muted-foreground">{user.department}</p>
              <p className="text-muted-foreground">{user.email}</p>
              {ramal ? <p className="text-muted-foreground">Ramal: {ramal}</p> : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
