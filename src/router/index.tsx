import { createBrowserRouter, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import LoginPage from '../components/auth/LoginPage';
import InvitationAcceptPage from '../components/circles/InvitationAcceptPage';
import CircleSelectPage from '../components/circles/CircleSelectPage';
import CircleSettingsPage from '../components/circles/CircleSettingsPage';
import AppShell from '../components/layout/AppShell';
import TaskListPage from '../components/tasks/TaskListPage';
import TaskDetailPage from '../components/tasks/TaskDetailPage';
import TaskCalendarView from '../components/tasks/TaskCalendarView';
import MyNextPriorityCard from '../components/tasks/MyNextPriorityCard';
import VisitCalendarPage from '../components/visits/VisitCalendarPage';
import MedicationListPage from '../components/medications/MedicationListPage';
import CareLogPage from '../components/careLogs/CareLogPage';
import EmergencyQuickAccessPage from '../components/emergency/EmergencyQuickAccessPage';
import DocumentVaultPage from '../components/documents/DocumentVaultPage';
import RoleGuard from '../guards/RoleGuard';
import { CircleRole } from '../constants';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/invite/:invitationId',
    element: <InvitationAcceptPage />,
  },
  {
    path: '/select-circle',
    element: (
      <ProtectedRoute>
        <CircleSelectPage />
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
      { path: 'my-next', element: <MyNextPriorityCard /> },
      { path: 'tasks', element: <TaskListPage /> },
      { path: 'tasks/:taskId', element: <TaskDetailPage /> },
      { path: 'tasks/calendar', element: <TaskCalendarView /> },
      { path: 'visits', element: <VisitCalendarPage /> },
      { path: 'medications', element: <MedicationListPage /> },
      { path: 'care-log', element: <CareLogPage /> },
      { path: 'emergency', element: <EmergencyQuickAccessPage /> },
      { path: 'documents', element: <DocumentVaultPage /> },
      {
        path: 'circle/settings',
        element: (
          <RoleGuard minRole={CircleRole.ADMIN}>
            <CircleSettingsPage />
          </RoleGuard>
        ),
      },
    ],
  },
]);

export default router;
