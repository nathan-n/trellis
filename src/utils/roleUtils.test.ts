/// <reference types="vitest/globals" />
import { hasMinRole, getRoleLabel } from './roleUtils';
import { CircleRole } from '../constants';

describe('hasMinRole', () => {
  describe('admin user', () => {
    it('satisfies admin requirement', () => expect(hasMinRole(CircleRole.ADMIN, CircleRole.ADMIN)).toBe(true));
    it('satisfies family requirement', () => expect(hasMinRole(CircleRole.ADMIN, CircleRole.FAMILY)).toBe(true));
    it('satisfies professional requirement', () => expect(hasMinRole(CircleRole.ADMIN, CircleRole.PROFESSIONAL)).toBe(true));
    it('satisfies readonly requirement', () => expect(hasMinRole(CircleRole.ADMIN, CircleRole.READONLY)).toBe(true));
  });

  describe('family user', () => {
    it('does NOT satisfy admin requirement', () => expect(hasMinRole(CircleRole.FAMILY, CircleRole.ADMIN)).toBe(false));
    it('satisfies family requirement', () => expect(hasMinRole(CircleRole.FAMILY, CircleRole.FAMILY)).toBe(true));
    it('satisfies professional requirement', () => expect(hasMinRole(CircleRole.FAMILY, CircleRole.PROFESSIONAL)).toBe(true));
    it('satisfies readonly requirement', () => expect(hasMinRole(CircleRole.FAMILY, CircleRole.READONLY)).toBe(true));
  });

  describe('professional user', () => {
    it('does NOT satisfy admin requirement', () => expect(hasMinRole(CircleRole.PROFESSIONAL, CircleRole.ADMIN)).toBe(false));
    it('does NOT satisfy family requirement', () => expect(hasMinRole(CircleRole.PROFESSIONAL, CircleRole.FAMILY)).toBe(false));
    it('satisfies professional requirement', () => expect(hasMinRole(CircleRole.PROFESSIONAL, CircleRole.PROFESSIONAL)).toBe(true));
    it('satisfies readonly requirement', () => expect(hasMinRole(CircleRole.PROFESSIONAL, CircleRole.READONLY)).toBe(true));
  });

  describe('readonly user', () => {
    it('does NOT satisfy admin requirement', () => expect(hasMinRole(CircleRole.READONLY, CircleRole.ADMIN)).toBe(false));
    it('does NOT satisfy family requirement', () => expect(hasMinRole(CircleRole.READONLY, CircleRole.FAMILY)).toBe(false));
    it('does NOT satisfy professional requirement', () => expect(hasMinRole(CircleRole.READONLY, CircleRole.PROFESSIONAL)).toBe(false));
    it('satisfies readonly requirement', () => expect(hasMinRole(CircleRole.READONLY, CircleRole.READONLY)).toBe(true));
  });
});

describe('getRoleLabel', () => {
  it('returns "Admin" for admin', () => expect(getRoleLabel(CircleRole.ADMIN)).toBe('Admin'));
  it('returns "Family Member" for family', () => expect(getRoleLabel(CircleRole.FAMILY)).toBe('Family Member'));
  it('returns "Professional Caregiver" for professional', () => expect(getRoleLabel(CircleRole.PROFESSIONAL)).toBe('Professional Caregiver'));
  it('returns "View Only" for readonly', () => expect(getRoleLabel(CircleRole.READONLY)).toBe('View Only'));
});
