export function migrationIdentities(accounts, auth) {
  const identities = accounts.map((account) => ({
    id: account.id,
    email: String(account.email).toLowerCase(),
    name: account.name,
    role: account.role,
    department: account.department ?? '',
    avatar: account.avatar ?? '',
  }));
  for (const colleague of Array.isArray(auth.colleagues) ? auth.colleagues : []) {
    const email = String(colleague.email ?? '').trim().toLowerCase();
    if (!email || identities.some((item) => item.email === email || item.id === colleague.id)) continue;
    identities.push({
      id: String(colleague.id),
      email,
      name: String(colleague.name ?? ''),
      role: String(colleague.role ?? ''),
      department: String(colleague.department ?? ''),
      avatar: String(colleague.avatar ?? ''),
    });
  }
  return identities.map((account) => ({
    ...account,
    password_hash: auth.passwordHash,
    password_salt: auth.salt,
  }));
}
