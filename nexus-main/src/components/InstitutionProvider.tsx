import { loadInstitution } from '@/lib/institution';
import { useEffect, type FC, type ReactNode } from 'react';

export const InstitutionProvider: FC<{ children: ReactNode }> = ({ children }) => {
  useEffect(() => {
    void loadInstitution();
  }, []);
  return children;
};
