import { CircleRole, ROLE_HIERARCHY } from '../constants';

export function hasMinRole(userRole: CircleRole, requiredRole: CircleRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function getRoleLabel(role: CircleRole): string {
  switch (role) {
    case CircleRole.ADMIN:
      return 'Admin';
    case CircleRole.FAMILY:
      return 'Family Member';
    case CircleRole.PROFESSIONAL:
      return 'Professional Caregiver';
    case CircleRole.READONLY:
      return 'View Only';
  }
}
