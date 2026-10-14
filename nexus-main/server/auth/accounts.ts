import { currentUser, employees } from '../../src/data/mockData';

export type AuthAccount = {
  id: string;
  name: string;
  role: string;
  department: string;
  avatar: string;
  email: string;
};

export function builtinAccounts(): AuthAccount[] {
  return [
    { ...currentUser, email: 'matheus.larrie@unica.local' },
    ...employees
      .filter((employee) => employee.id !== currentUser.id && employee.email)
      .map((employee) => ({
        id: employee.id,
        name: employee.name,
        role: employee.role,
        department: employee.department,
        avatar: employee.avatar,
        email: employee.email!,
      })),
  ];
}
