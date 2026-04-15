/// <reference types="vitest/globals" />
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';

const PROJECT_ID = 'trellis-test';
const CIRCLE_ID = 'circle-1';

// Fixed UIDs for each role
const ADMIN_UID = 'admin-user';
const FAMILY_UID = 'family-user';
const PROFESSIONAL_UID = 'professional-user';
const READONLY_UID = 'readonly-user';
const OUTSIDER_UID = 'outsider-user';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();

  // Seed circle and members with roles
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'circles', CIRCLE_ID), { name: 'Test Circle', patientName: 'Patient', memberCount: 4 });
    await setDoc(doc(db, 'circles', CIRCLE_ID, 'members', ADMIN_UID), { uid: ADMIN_UID, role: 'admin', email: 'admin@test.com' });
    await setDoc(doc(db, 'circles', CIRCLE_ID, 'members', FAMILY_UID), { uid: FAMILY_UID, role: 'family', email: 'family@test.com' });
    await setDoc(doc(db, 'circles', CIRCLE_ID, 'members', PROFESSIONAL_UID), { uid: PROFESSIONAL_UID, role: 'professional', email: 'pro@test.com' });
    await setDoc(doc(db, 'circles', CIRCLE_ID, 'members', READONLY_UID), { uid: READONLY_UID, role: 'readonly', email: 'readonly@test.com' });
  });
});

function getDb(uid: string, email?: string) {
  return testEnv.authenticatedContext(uid, email ? { email } : undefined).firestore();
}
function getUnauthDb() {
  return testEnv.unauthenticatedContext().firestore();
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

describe('tasks', () => {
  describe('read - visibility enforcement', () => {
    it('allows read when task has no visibility field (backward compat)', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'circles', CIRCLE_ID, 'tasks', 't1'), {
          title: 'Legacy task', createdByUid: ADMIN_UID,
        });
      });
      const db = getDb(READONLY_UID);
      await assertSucceeds(getDoc(doc(db, 'circles', CIRCLE_ID, 'tasks', 't1')));
    });

    it('allows read when visibility is circle for any member', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'circles', CIRCLE_ID, 'tasks', 't1'), {
          title: 'Circle task', visibility: 'circle', visibleToUids: [], createdByUid: ADMIN_UID,
        });
      });
      const db = getDb(READONLY_UID);
      await assertSucceeds(getDoc(doc(db, 'circles', CIRCLE_ID, 'tasks', 't1')));
    });

    it('allows admin to read private tasks', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'circles', CIRCLE_ID, 'tasks', 't1'), {
          title: 'Private task', visibility: 'private', visibleToUids: [FAMILY_UID], createdByUid: FAMILY_UID,
        });
      });
      const db = getDb(ADMIN_UID);
      await assertSucceeds(getDoc(doc(db, 'circles', CIRCLE_ID, 'tasks', 't1')));
    });

    it('allows creator to read their own private task', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'circles', CIRCLE_ID, 'tasks', 't1'), {
          title: 'My private task', visibility: 'private', visibleToUids: [FAMILY_UID], createdByUid: FAMILY_UID,
        });
      });
      const db = getDb(FAMILY_UID);
      await assertSucceeds(getDoc(doc(db, 'circles', CIRCLE_ID, 'tasks', 't1')));
    });

    it('allows user in visibleToUids to read specific task', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'circles', CIRCLE_ID, 'tasks', 't1'), {
          title: 'Specific task', visibility: 'specific', visibleToUids: [PROFESSIONAL_UID], createdByUid: ADMIN_UID,
        });
      });
      const db = getDb(PROFESSIONAL_UID);
      await assertSucceeds(getDoc(doc(db, 'circles', CIRCLE_ID, 'tasks', 't1')));
    });

    it('denies read to member not in visibleToUids for private task', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'circles', CIRCLE_ID, 'tasks', 't1'), {
          title: 'Private task', visibility: 'private', visibleToUids: [FAMILY_UID], createdByUid: FAMILY_UID,
        });
      });
      const db = getDb(PROFESSIONAL_UID);
      await assertFails(getDoc(doc(db, 'circles', CIRCLE_ID, 'tasks', 't1')));
    });

    it('denies read to non-member', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'circles', CIRCLE_ID, 'tasks', 't1'), {
          title: 'Task', visibility: 'circle', visibleToUids: [], createdByUid: ADMIN_UID,
        });
      });
      const db = getDb(OUTSIDER_UID);
      await assertFails(getDoc(doc(db, 'circles', CIRCLE_ID, 'tasks', 't1')));
    });
  });

  describe('create by role', () => {
    const taskData = { title: 'New task', visibility: 'circle', visibleToUids: [], createdByUid: ADMIN_UID, status: 'todo' };

    it('allows professional to create', async () => {
      const db = getDb(PROFESSIONAL_UID);
      await assertSucceeds(addDoc(collection(db, 'circles', CIRCLE_ID, 'tasks'), taskData));
    });

    it('allows family to create', async () => {
      const db = getDb(FAMILY_UID);
      await assertSucceeds(addDoc(collection(db, 'circles', CIRCLE_ID, 'tasks'), taskData));
    });

    it('allows admin to create', async () => {
      const db = getDb(ADMIN_UID);
      await assertSucceeds(addDoc(collection(db, 'circles', CIRCLE_ID, 'tasks'), taskData));
    });

    it('denies readonly from creating', async () => {
      const db = getDb(READONLY_UID);
      await assertFails(addDoc(collection(db, 'circles', CIRCLE_ID, 'tasks'), taskData));
    });

    it('denies non-member from creating', async () => {
      const db = getDb(OUTSIDER_UID);
      await assertFails(addDoc(collection(db, 'circles', CIRCLE_ID, 'tasks'), taskData));
    });
  });

  describe('delete by role', () => {
    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'circles', CIRCLE_ID, 'tasks', 't1'), {
          title: 'To delete', visibility: 'circle', visibleToUids: [], createdByUid: ADMIN_UID,
        });
      });
    });

    it('allows admin to delete', async () => {
      const db = getDb(ADMIN_UID);
      await assertSucceeds(deleteDoc(doc(db, 'circles', CIRCLE_ID, 'tasks', 't1')));
    });

    it('denies family from deleting', async () => {
      const db = getDb(FAMILY_UID);
      await assertFails(deleteDoc(doc(db, 'circles', CIRCLE_ID, 'tasks', 't1')));
    });

    it('denies professional from deleting', async () => {
      const db = getDb(PROFESSIONAL_UID);
      await assertFails(deleteDoc(doc(db, 'circles', CIRCLE_ID, 'tasks', 't1')));
    });
  });
});

// ─── Medications ─────────────────────────────────────────────────────────────

describe('medications', () => {
  const medData = { name: 'Aspirin', dosage: '100mg', frequency: 'daily', isActive: true };

  it('allows any member to read', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'circles', CIRCLE_ID, 'medications', 'm1'), medData);
    });
    const db = getDb(READONLY_UID);
    await assertSucceeds(getDoc(doc(db, 'circles', CIRCLE_ID, 'medications', 'm1')));
  });

  it('allows family to create', async () => {
    const db = getDb(FAMILY_UID);
    await assertSucceeds(addDoc(collection(db, 'circles', CIRCLE_ID, 'medications'), medData));
  });

  it('denies professional from creating', async () => {
    const db = getDb(PROFESSIONAL_UID);
    await assertFails(addDoc(collection(db, 'circles', CIRCLE_ID, 'medications'), medData));
  });

  it('allows only admin to delete', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'circles', CIRCLE_ID, 'medications', 'm1'), medData);
    });
    await assertFails(deleteDoc(doc(getDb(FAMILY_UID), 'circles', CIRCLE_ID, 'medications', 'm1')));
    await assertSucceeds(deleteDoc(doc(getDb(ADMIN_UID), 'circles', CIRCLE_ID, 'medications', 'm1')));
  });
});

// ─── Wellbeing Check-ins (private to author) ─────────────────────────────────

describe('wellbeing check-ins', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'circles', CIRCLE_ID, 'wellbeingCheckins', 'wc1'), {
        authorUid: FAMILY_UID, stressLevel: 3, date: '2024-01-01',
      });
    });
  });

  it('allows only the author to read their own check-in', async () => {
    const db = getDb(FAMILY_UID);
    await assertSucceeds(getDoc(doc(db, 'circles', CIRCLE_ID, 'wellbeingCheckins', 'wc1')));
  });

  it('denies other members from reading', async () => {
    const db = getDb(PROFESSIONAL_UID);
    await assertFails(getDoc(doc(db, 'circles', CIRCLE_ID, 'wellbeingCheckins', 'wc1')));
  });

  it('allows admin to read others check-ins (for sparklines)', async () => {
    const db = getDb(ADMIN_UID);
    await assertSucceeds(getDoc(doc(db, 'circles', CIRCLE_ID, 'wellbeingCheckins', 'wc1')));
  });

  it('allows any member to create', async () => {
    const db = getDb(READONLY_UID);
    await assertSucceeds(addDoc(collection(db, 'circles', CIRCLE_ID, 'wellbeingCheckins'), {
      authorUid: READONLY_UID, stressLevel: 2, date: '2024-01-02',
    }));
  });

  it('denies update', async () => {
    const db = getDb(FAMILY_UID);
    await assertFails(updateDoc(doc(db, 'circles', CIRCLE_ID, 'wellbeingCheckins', 'wc1'), { stressLevel: 5 }));
  });

  it('denies delete', async () => {
    const db = getDb(FAMILY_UID);
    await assertFails(deleteDoc(doc(db, 'circles', CIRCLE_ID, 'wellbeingCheckins', 'wc1')));
  });
});

// ─── Audit Log (append-only) ─────────────────────────────────────────────────

describe('audit log', () => {
  it('allows any member to read', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'circles', CIRCLE_ID, 'auditLog', 'a1'), { action: 'test', actorUid: ADMIN_UID });
    });
    const db = getDb(READONLY_UID);
    await assertSucceeds(getDoc(doc(db, 'circles', CIRCLE_ID, 'auditLog', 'a1')));
  });

  it('allows any member to create', async () => {
    const db = getDb(READONLY_UID);
    await assertSucceeds(addDoc(collection(db, 'circles', CIRCLE_ID, 'auditLog'), { action: 'test', actorUid: READONLY_UID }));
  });

  it('denies update (append-only)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'circles', CIRCLE_ID, 'auditLog', 'a1'), { action: 'test' });
    });
    const db = getDb(ADMIN_UID);
    await assertFails(updateDoc(doc(db, 'circles', CIRCLE_ID, 'auditLog', 'a1'), { action: 'modified' }));
  });

  it('denies delete (append-only)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'circles', CIRCLE_ID, 'auditLog', 'a1'), { action: 'test' });
    });
    const db = getDb(ADMIN_UID);
    await assertFails(deleteDoc(doc(db, 'circles', CIRCLE_ID, 'auditLog', 'a1')));
  });
});

// ─── Care Logs (author-only update) ──────────────────────────────────────────

describe('care logs', () => {
  it('allows professional to create', async () => {
    const db = getDb(PROFESSIONAL_UID);
    await assertSucceeds(addDoc(collection(db, 'circles', CIRCLE_ID, 'careLogs'), {
      authorUid: PROFESSIONAL_UID, logDate: '2024-01-01', mood: 'calm',
    }));
  });

  it('denies readonly from creating', async () => {
    const db = getDb(READONLY_UID);
    await assertFails(addDoc(collection(db, 'circles', CIRCLE_ID, 'careLogs'), {
      authorUid: READONLY_UID, logDate: '2024-01-01', mood: 'calm',
    }));
  });

  it('allows only author to update', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'circles', CIRCLE_ID, 'careLogs', 'cl1'), {
        authorUid: PROFESSIONAL_UID, logDate: '2024-01-01', mood: 'calm',
      });
    });
    await assertSucceeds(updateDoc(doc(getDb(PROFESSIONAL_UID), 'circles', CIRCLE_ID, 'careLogs', 'cl1'), { mood: 'happy' }));
    await assertFails(updateDoc(doc(getDb(ADMIN_UID), 'circles', CIRCLE_ID, 'careLogs', 'cl1'), { mood: 'agitated' }));
  });
});

// ─── Visits ──────────────────────────────────────────────────────────────────

describe('visits', () => {
  const visitData = { caregiverUid: PROFESSIONAL_UID, caregiverName: 'Pro', status: 'confirmed' };

  it('allows professional to create', async () => {
    const db = getDb(PROFESSIONAL_UID);
    await assertSucceeds(addDoc(collection(db, 'circles', CIRCLE_ID, 'visits'), visitData));
  });

  it('denies readonly from creating', async () => {
    const db = getDb(READONLY_UID);
    await assertFails(addDoc(collection(db, 'circles', CIRCLE_ID, 'visits'), visitData));
  });

  it('allows only admin to delete', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'circles', CIRCLE_ID, 'visits', 'v1'), visitData);
    });
    await assertFails(deleteDoc(doc(getDb(PROFESSIONAL_UID), 'circles', CIRCLE_ID, 'visits', 'v1')));
    await assertSucceeds(deleteDoc(doc(getDb(ADMIN_UID), 'circles', CIRCLE_ID, 'visits', 'v1')));
  });
});

// ─── Cross-cutting ───────────────────────────────────────────────────────────

describe('cross-cutting', () => {
  it('denies unauthenticated access to circles', async () => {
    const db = getUnauthDb();
    await assertFails(getDoc(doc(db, 'circles', CIRCLE_ID)));
  });

  it('denies non-member access to circle data', async () => {
    const db = getDb(OUTSIDER_UID);
    await assertFails(getDoc(doc(db, 'circles', CIRCLE_ID)));
  });

  it('denies non-member access to tasks', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'circles', CIRCLE_ID, 'tasks', 't1'), {
        title: 'Task', visibility: 'circle', visibleToUids: [], createdByUid: ADMIN_UID,
      });
    });
    const db = getDb(OUTSIDER_UID);
    await assertFails(getDoc(doc(db, 'circles', CIRCLE_ID, 'tasks', 't1')));
  });
});

// ─── Invitations ─────────────────────────────────────────────────────────────

describe('invitations', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'invitations', 'inv1'), {
        circleId: CIRCLE_ID, inviteeEmail: 'invitee@test.com', status: 'pending',
        invitedByUid: ADMIN_UID, role: 'family',
      });
    });
  });

  it('allows read when email matches (case-insensitive)', async () => {
    const db = getDb('new-user', 'Invitee@Test.com');
    await assertSucceeds(getDoc(doc(db, 'invitations', 'inv1')));
  });

  it('allows read when user is circle member', async () => {
    const db = getDb(FAMILY_UID);
    await assertSucceeds(getDoc(doc(db, 'invitations', 'inv1')));
  });

  it('denies read to non-member with non-matching email', async () => {
    const db = getDb(OUTSIDER_UID, 'other@test.com');
    await assertFails(getDoc(doc(db, 'invitations', 'inv1')));
  });

  it('allows matching-email user to update (accept)', async () => {
    const db = getDb('new-user', 'invitee@test.com');
    await assertSucceeds(updateDoc(doc(db, 'invitations', 'inv1'), { status: 'accepted' }));
  });

  it('denies non-matching email from updating', async () => {
    const db = getDb(OUTSIDER_UID, 'other@test.com');
    await assertFails(updateDoc(doc(db, 'invitations', 'inv1'), { status: 'accepted' }));
  });
});
