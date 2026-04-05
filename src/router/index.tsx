import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import AppShell from '../components/layout/AppShell';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import RoleGuard from '../guards/RoleGuard';
import { CircleRole } from '../constants';

const LoginPage = lazy(() => import('../components/auth/LoginPage'));
const InvitationAcceptPage = lazy(() => import('../components/circles/InvitationAcceptPage'));
const CircleSelectPage = lazy(() => import('../components/circles/CircleSelectPage'));
const CircleSettingsPage = lazy(() => import('../components/circles/CircleSettingsPage'));
const TaskListPage = lazy(() => import('../components/tasks/TaskListPage'));
const TaskDetailPage = lazy(() => import('../components/tasks/TaskDetailPage'));
const TaskCalendarView = lazy(() => import('../components/tasks/TaskCalendarView'));
const MyNextPriorityCard = lazy(() => import('../components/tasks/MyNextPriorityCard'));
const VisitCalendarPage = lazy(() => import('../components/visits/VisitCalendarPage'));
const MedicationListPage = lazy(() => import('../components/medications/MedicationListPage'));
const CareLogPage = lazy(() => import('../components/careLogs/CareLogPage'));
const EmergencyQuickAccessPage = lazy(() => import('../components/emergency/EmergencyQuickAccessPage'));
const DocumentVaultPage = lazy(() => import('../components/documents/DocumentVaultPage'));
const ActivityFeedPage = lazy(() => import('../components/activity/ActivityFeedPage'));
const ExpenseListPage = lazy(() => import('../components/expenses/ExpenseListPage'));
const DoctorPrepPage = lazy(() => import('../components/doctorPrep/DoctorPrepPage'));
const WellbeingHistoryPage = lazy(() => import('../components/wellbeing/WellbeingHistoryPage'));

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>;
}

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Lazy><LoginPage /></Lazy>,
  },
  {
    path: '/invite/:invitationId',
    element: <Lazy><InvitationAcceptPage /></Lazy>,
  },
  {
    path: '/select-circle',
    element: (
      <ProtectedRoute>
        <Lazy><CircleSelectPage /></Lazy>
      </ProtectedRoute>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/my-next" replace /> },
      { path: 'my-next', element: <Lazy><MyNextPriorityCard /></Lazy> },
      { path: 'tasks', element: <Lazy><TaskListPage /></Lazy> },
      { path: 'tasks/:taskId', element: <Lazy><TaskDetailPage /></Lazy> },
      { path: 'tasks/calendar', element: <Lazy><TaskCalendarView /></Lazy> },
      { path: 'visits', element: <Lazy><VisitCalendarPage /></Lazy> },
      { path: 'medications', element: <Lazy><MedicationListPage /></Lazy> },
      { path: 'care-log', element: <Lazy><CareLogPage /></Lazy> },
      { path: 'emergency', element: <Lazy><EmergencyQuickAccessPage /></Lazy> },
      { path: 'documents', element: <Lazy><DocumentVaultPage /></Lazy> },
      { path: 'expenses', element: <Lazy><ExpenseListPage /></Lazy> },
      { path: 'doctor-prep', element: <Lazy><DoctorPrepPage /></Lazy> },
      { path: 'activity', element: <Lazy><ActivityFeedPage /></Lazy> },
      { path: 'wellbeing', element: <Lazy><WellbeingHistoryPage /></Lazy> },
      {
        path: 'circle/settings',
        element: (
          <RoleGuard minRole={CircleRole.ADMIN}>
            <Lazy><CircleSettingsPage /></Lazy>
          </RoleGuard>
        ),
      },
    ],
  },
]);

export default router;
