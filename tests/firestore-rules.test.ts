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
    function taskDataFor(uid: string) {
      return { title: 'New task', visibility: 'circle', visibleToUids: [], createdByUid: uid, status: 'todo' };
    }

    it('allows professional to create', async () => {
      const db = getDb(PROFESSIONAL_UID);
      await assertSucceeds(addDoc(collection(db, 'circles', CIRCLE_ID, 'tasks'), taskDataFor(PROFESSIONAL_UID)));
    });

    it('allows family to create', async () => {
      const db = getDb(FAMILY_UID);
      await assertSucceeds(addDoc(collection(db, 'circles', CIRCLE_ID, 'tasks'), taskDataFor(FAMILY_UID)));
    });

    it('allows admin to create', async () => {
      const db = getDb(ADMIN_UID);
      await assertSucceeds(addDoc(collection(db, 'circles', CIRCLE_ID, 'tasks'), taskDataFor(ADMIN_UID)));
    });

    it('denies readonly from creating', async () => {
      const db = getDb(READONLY_UID);
      await assertFails(addDoc(collection(db, 'circles', CIRCLE_ID, 'tasks'), taskDataFor(READONLY_UID)));
    });

    it('denies spoofed createdByUid (F9)', async () => {
      const db = getDb(PROFESSIONAL_UID);
      await assertFails(addDoc(collection(db, 'circles', CIRCLE_ID, 'tasks'), taskDataFor(ADMIN_UID)));
    });

    it('denies non-member from creating', async () => {
      const db = getDb(OUTSIDER_UID);
      await assertFails(addDoc(collection(db, 'circles', CIRCLE_ID, 'tasks'), taskDataFor(OUTSIDER_UID)));
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

  it('allows any member to create with matching actorUid', async () => {
    const db = getDb(READONLY_UID);
    await assertSucceeds(addDoc(collection(db, 'circles', CIRCLE_ID, 'auditLog'), { action: 'test', actorUid: READONLY_UID }));
  });

  it('denies create with spoofed actorUid (F6)', async () => {
    const db = getDb(READONLY_UID);
    await assertFails(addDoc(collection(db, 'circles', CIRCLE_ID, 'auditLog'), { action: 'test', actorUid: ADMIN_UID }));
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

// ─── Care Logs (admin-or-author update + delete) ─────────────────────────────

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

  describe('update (admin OR author)', () => {
    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'circles', CIRCLE_ID, 'careLogs', 'cl1'), {
          authorUid: PROFESSIONAL_UID, logDate: '2024-01-01', mood: 'calm',
        });
      });
    });

    it('allows author to update their own', async () => {
      const db = getDb(PROFESSIONAL_UID);
      await assertSucceeds(updateDoc(doc(db, 'circles', CIRCLE_ID, 'careLogs', 'cl1'), { mood: 'happy' }));
    });

    it('allows admin to update any entry', async () => {
      const db = getDb(ADMIN_UID);
      await assertSucceeds(updateDoc(doc(db, 'circles', CIRCLE_ID, 'careLogs', 'cl1'), { mood: 'agitated' }));
    });

    it('denies a different non-admin member from updating', async () => {
      const db = getDb(FAMILY_UID); // not admin, not author
      await assertFails(updateDoc(doc(db, 'circles', CIRCLE_ID, 'careLogs', 'cl1'), { mood: 'agitated' }));
    });

    it('denies non-member from updating', async () => {
      const db = getDb(OUTSIDER_UID);
      await assertFails(updateDoc(doc(db, 'circles', CIRCLE_ID, 'careLogs', 'cl1'), { mood: 'agitated' }));
    });
  });

  describe('delete (admin OR author)', () => {
    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'circles', CIRCLE_ID, 'careLogs', 'cl1'), {
          authorUid: PROFESSIONAL_UID, logDate: '2024-01-01', mood: 'calm',
        });
      });
    });

    it('allows author to delete their own', async () => {
      const db = getDb(PROFESSIONAL_UID);
      await assertSucceeds(deleteDoc(doc(db, 'circles', CIRCLE_ID, 'careLogs', 'cl1')));
    });

    it('allows admin to delete any entry', async () => {
      const db = getDb(ADMIN_UID);
      await assertSucceeds(deleteDoc(doc(db, 'circles', CIRCLE_ID, 'careLogs', 'cl1')));
    });

    it('denies a different non-admin member from deleting', async () => {
      const db = getDb(FAMILY_UID);
      await assertFails(deleteDoc(doc(db, 'circles', CIRCLE_ID, 'careLogs', 'cl1')));
    });

    it('denies readonly from deleting', async () => {
      const db = getDb(READONLY_UID);
      await assertFails(deleteDoc(doc(db, 'circles', CIRCLE_ID, 'careLogs', 'cl1')));
    });

    it('denies non-member from deleting', async () => {
      const db = getDb(OUTSIDER_UID);
      await assertFails(deleteDoc(doc(db, 'circles', CIRCLE_ID, 'careLogs', 'cl1')));
    });
  });
});

// ─── Circle soft-delete ──────────────────────────────────────────────────────

describe('circle soft-delete', () => {
  it('allows admin to mark circle deletedAt', async () => {
    const db = getDb(ADMIN_UID);
    await assertSucceeds(
      updateDoc(doc(db, 'circles', CIRCLE_ID), { deletedAt: new Date(), deletedByUid: ADMIN_UID })
    );
  });

  it('denies family from marking circle deletedAt', async () => {
    const db = getDb(FAMILY_UID);
    await assertFails(
      updateDoc(doc(db, 'circles', CIRCLE_ID), { deletedAt: new Date(), deletedByUid: FAMILY_UID })
    );
  });

  it('denies professional from marking circle deletedAt', async () => {
    const db = getDb(PROFESSIONAL_UID);
    await assertFails(
      updateDoc(doc(db, 'circles', CIRCLE_ID), { deletedAt: new Date(), deletedByUid: PROFESSIONAL_UID })
    );
  });

  it('denies readonly from marking circle deletedAt', async () => {
    const db = getDb(READONLY_UID);
    await assertFails(
      updateDoc(doc(db, 'circles', CIRCLE_ID), { deletedAt: new Date(), deletedByUid: READONLY_UID })
    );
  });

  it('hides soft-deleted circle from non-admin members (member read denied)', async () => {
    // Admin marks the circle as deleted
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'circles', CIRCLE_ID), {
        deletedAt: new Date(),
        deletedByUid: ADMIN_UID,
      });
    });
    // Family member can no longer read
    const db = getDb(FAMILY_UID);
    await assertFails(getDoc(doc(db, 'circles', CIRCLE_ID)));
  });

  it('allows admin to read soft-deleted circle (for eventual restore)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'circles', CIRCLE_ID), {
        deletedAt: new Date(),
        deletedByUid: ADMIN_UID,
      });
    });
    const db = getDb(ADMIN_UID);
    await assertSucceeds(getDoc(doc(db, 'circles', CIRCLE_ID)));
  });

  it('non-soft-deleted circle still readable by members (regression check)', async () => {
    const db = getDb(FAMILY_UID);
    await assertSucceeds(getDoc(doc(db, 'circles', CIRCLE_ID)));
  });

  it('denies non-member from reading regardless of deletedAt state', async () => {
    const db = getDb(OUTSIDER_UID);
    await assertFails(getDoc(doc(db, 'circles', CIRCLE_ID)));
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

  describe('delete (admin OR caregiver OR creator)', () => {
    it('allows admin to delete any visit', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'circles', CIRCLE_ID, 'visits', 'v1'), visitData);
      });
      await assertSucceeds(deleteDoc(doc(getDb(ADMIN_UID), 'circles', CIRCLE_ID, 'visits', 'v1')));
    });

    it('allows the caregiver on the visit to delete it', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'circles', CIRCLE_ID, 'visits', 'v1'), visitData);
      });
      await assertSucceeds(deleteDoc(doc(getDb(PROFESSIONAL_UID), 'circles', CIRCLE_ID, 'visits', 'v1')));
    });

    it('allows the visit creator (createdByUid) to delete it', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'circles', CIRCLE_ID, 'visits', 'v1'), {
          ...visitData,
          createdByUid: FAMILY_UID, // creator is different from caregiver
        });
      });
      await assertSucceeds(deleteDoc(doc(getDb(FAMILY_UID), 'circles', CIRCLE_ID, 'visits', 'v1')));
    });

    it('denies a non-admin member who is neither caregiver nor creator', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'circles', CIRCLE_ID, 'visits', 'v1'), {
          ...visitData,
          createdByUid: ADMIN_UID, // creator = admin, so family is uninvolved
        });
      });
      await assertFails(deleteDoc(doc(getDb(FAMILY_UID), 'circles', CIRCLE_ID, 'visits', 'v1')));
    });

    it('denies non-member regardless of role claims', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'circles', CIRCLE_ID, 'visits', 'v1'), visitData);
      });
      await assertFails(deleteDoc(doc(getDb(OUTSIDER_UID), 'circles', CIRCLE_ID, 'visits', 'v1')));
    });
  });
});

// ─── Members (viewedTaskIds self-write) ─────────────────────────────────────

describe('member viewedTaskIds (cross-device task-viewed sync)', () => {
  // Uses the existing member self-update rule clause:
  //   (request.auth.uid == memberId && request.resource.data.role != 'admin')
  // No firestore.rules change required — these tests lock in that the rule
  // permits a member to write viewedTaskIds on their own doc only.

  it('allows a member to write viewedTaskIds to their own doc', async () => {
    const db = getDb(FAMILY_UID);
    await assertSucceeds(
      updateDoc(doc(db, 'circles', CIRCLE_ID, 'members', FAMILY_UID), {
        viewedTaskIds: ['task-1', 'task-2'],
      })
    );
  });

  it('allows a professional to write viewedTaskIds to their own doc', async () => {
    const db = getDb(PROFESSIONAL_UID);
    await assertSucceeds(
      updateDoc(doc(db, 'circles', CIRCLE_ID, 'members', PROFESSIONAL_UID), {
        viewedTaskIds: ['task-a'],
      })
    );
  });

  it('denies a member from writing viewedTaskIds on ANOTHER member doc', async () => {
    const db = getDb(FAMILY_UID);
    await assertFails(
      updateDoc(doc(db, 'circles', CIRCLE_ID, 'members', PROFESSIONAL_UID), {
        viewedTaskIds: ['task-stolen'],
      })
    );
  });

  it('denies a non-member from writing viewedTaskIds to any member doc', async () => {
    const db = getDb(OUTSIDER_UID);
    await assertFails(
      updateDoc(doc(db, 'circles', CIRCLE_ID, 'members', FAMILY_UID), {
        viewedTaskIds: ['task-1'],
      })
    );
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
