import type { Check, Finding } from '../types.js';

type PowerSet = {
  Id: string;
  Name: string;
  Label: string;
  IsOwnedByProfile: boolean;
  Profile: { Name: string } | null;
  PermissionsModifyAllData: boolean;
  PermissionsViewAllData: boolean;
};

export const permissionsCheck: Check = {
  id: 'high-power-access',
  title: 'High-power access',
  category: 'Security',
  async run({ conn }) {
    const sets = await conn.query<PowerSet>(
      'SELECT Id, Name, Label, IsOwnedByProfile, Profile.Name, PermissionsModifyAllData, PermissionsViewAllData ' +
        'FROM PermissionSet WHERE PermissionsModifyAllData = true OR PermissionsViewAllData = true'
    );
    const ids = sets.records.map((s) => `'${s.Id}'`);
    const holders = new Map<string, number>();
    if (ids.length) {
      const counts = await conn.query<{ PermissionSetId: string; expr0: number }>(
        `SELECT PermissionSetId, COUNT(Id) FROM PermissionSetAssignment WHERE Assignee.IsActive = true AND PermissionSetId IN (${ids.join(',')}) GROUP BY PermissionSetId`
      );
      counts.records.forEach((row) => holders.set(row.PermissionSetId, row.expr0));
    }
    let totalUsers = 0;
    const findings: Finding[] = sets.records
      .map((set) => {
        const users = holders.get(set.Id) ?? 0;
        totalUsers += users;
        const power = [set.PermissionsModifyAllData ? 'Modify All Data' : '', set.PermissionsViewAllData ? 'View All Data' : '']
          .filter(Boolean)
          .join(' + ');
        const name = set.IsOwnedByProfile ? `Profile ${set.Profile?.Name ?? set.Name}` : `Permission set ${set.Label}`;
        return {
          item: name,
          detail: `${power} · ${users} active user(s)`,
          severity: (users === 0 ? 'info' : set.PermissionsModifyAllData && users > 3 ? 'high' : 'medium') as Finding['severity'],
          users,
        };
      })
      .filter((f) => f.users > 0 || !f.item.startsWith('Profile'))
      .sort((a, b) => b.users - a.users)
      .map(({ users, ...finding }) => finding);
    return {
      summary: `${findings.length} profile(s) or permission set(s) grant org-wide data access to ${totalUsers} active assignment(s). Keep this list short.`,
      findings,
    };
  },
};
