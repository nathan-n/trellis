import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  CircularProgress,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import PeopleIcon from '@mui/icons-material/People';
import SyncIcon from '@mui/icons-material/Sync';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import MedicationIcon from '@mui/icons-material/Medication';
import NoteAltIcon from '@mui/icons-material/NoteAlt';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import SummarizeIcon from '@mui/icons-material/Summarize';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import TimelineIcon from '@mui/icons-material/Timeline';
import FavoriteIcon from '@mui/icons-material/Favorite';
import SecurityIcon from '@mui/icons-material/Security';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import MockTaskList from './mocks/MockTaskList';
import MockVisitCalendar from './mocks/MockVisitCalendar';
import MockMedications from './mocks/MockMedications';
import MockCareLog from './mocks/MockCareLog';
import MockEmergency from './mocks/MockEmergency';
import MockDoctorPrep from './mocks/MockDoctorPrep';
import MockExpenses from './mocks/MockExpenses';
import MockActivityFeed from './mocks/MockActivityFeed';
import MockWellbeing from './mocks/MockWellbeing';
import MockDocumentVault from './mocks/MockDocumentVault';
import MockResources from './mocks/MockResources';
import FolderIcon from '@mui/icons-material/Folder';
import MenuBookIcon from '@mui/icons-material/MenuBook';

// ─── Feature section data ────────────────────────────────────────────────────

interface Feature {
  title: string;
  headline: string;
  description: string;
  icon: React.ReactElement;
  mock: React.ReactElement;
}

const features: Feature[] = [
  {
    title: 'Task Management',
    headline: 'Nothing falls through the cracks',
    description:
      'Track medical, legal, and everyday tasks with priorities, assignees, and due dates. Set recurring schedules for regular tasks, control visibility (circle-wide, private, or specific people), and schedule doctor appointments that link directly to visit prep reports.',
    icon: <TaskAltIcon />,
    mock: <MockTaskList />,
  },
  {
    title: 'Visit Scheduling',
    headline: 'See who is helping and when',
    description:
      'Coordinate family visits on a shared calendar. Click a day to quick-add, drag across days for multi-day visits. Mark visits as confirmed or tentative. Monthly view for periodic check-ins, or switch to coverage mode with automatic gap detection.',
    icon: <CalendarMonthIcon />,
    mock: <MockVisitCalendar />,
  },
  {
    title: 'Medication Tracking',
    headline: 'Every dose accounted for',
    description:
      'Search medications from the FDA drug database with auto-populated side effects, interactions, and dosage suggestions. Log each dose as given or skipped. Get refill alerts and automatic interaction warnings when adding new medications.',
    icon: <MedicationIcon />,
    mock: <MockMedications />,
  },
  {
    title: 'Daily Care Log',
    headline: 'A complete picture of each day',
    description:
      'Record meals, hydration, mood, sleep, behaviors, and activities in structured entries. Shift handoff summaries ensure the next caregiver knows exactly what happened.',
    icon: <NoteAltIcon />,
    mock: <MockCareLog />,
  },
  {
    title: 'Emergency Quick Access',
    headline: 'Critical info in seconds',
    description:
      'One-tap access to patient info, allergies, medications, emergency contacts, and insurance details. Medications sync automatically from the medication tracker. Cached offline for when you need it most.',
    icon: <LocalHospitalIcon />,
    mock: <MockEmergency />,
  },
  {
    title: 'Doctor Visit Prep',
    headline: 'Walk in prepared, not guessing',
    description:
      'Auto-generate a printable care summary with medication adherence, mood patterns, and behavioral observations. Collect questions from the whole family before the appointment and track the doctor\'s answers after.',
    icon: <SummarizeIcon />,
    mock: <MockDoctorPrep />,
  },
  {
    title: 'Document Vault',
    headline: 'Important papers, always accessible',
    description:
      'Store and organize legal documents, insurance cards, medical records, and identification. Categorized for quick access — never scramble for a POA or insurance policy number again.',
    icon: <FolderIcon />,
    mock: <MockDocumentVault />,
  },
  {
    title: 'Caregiver Resources',
    headline: 'Help is closer than you think',
    description:
      'Build a shared library of local services, online guides, support groups, hotlines, government programs, and financial aid. Color-coded by type so the right resource is always a glance away.',
    icon: <MenuBookIcon />,
    mock: <MockResources />,
  },
  {
    title: 'Expense Tracking',
    headline: 'Know where the money goes',
    description:
      'Log caregiving expenses with categories, receipt photos, and who paid. Monthly totals and breakdowns for tax deductions, insurance claims, or family cost-sharing.',
    icon: <ReceiptLongIcon />,
    mock: <MockExpenses />,
  },
  {
    title: 'Activity Feed',
    headline: 'Stay in the loop without asking',
    description:
      'A chronological stream of everything happening in the care circle. Tasks completed, visits scheduled, medications administered, care logs posted — all in one place.',
    icon: <TimelineIcon />,
    mock: <MockActivityFeed />,
  },
  {
    title: 'Caregiver Wellbeing',
    headline: 'You matter too',
    description:
      'Check in on your stress, sleep, and emotional state whenever you need to. Admins can see wellbeing trends across the circle to ensure no one is burning out. Links to the Alzheimer\'s Association helpline and support resources.',
    icon: <FavoriteIcon />,
    mock: <MockWellbeing />,
  },
];

// ─── Pain points ─────────────────────────────────────────────────────────────

const painPoints = [
  {
    title: 'Scattered communication',
    desc: 'Important updates buried in group texts. Different siblings with different information. No single thread.',
  },
  {
    title: 'Forgotten tasks',
    desc: "Prescriptions lapse, appointments get missed, legal documents expire. There's too much to keep in anyone's head.",
  },
  {
    title: 'No single source of truth',
    desc: "Allergies on a sticky note. Insurance info in someone's email. Emergency contacts in a drawer somewhere.",
  },
];

// ─── How it works steps ──────────────────────────────────────────────────────

const steps = [
  {
    icon: <GroupAddIcon sx={{ fontSize: 40 }} />,
    title: 'Create a Care Circle',
    desc: 'Set up a circle for your loved one. Add their name, basic info, and any immediate care needs.',
  },
  {
    icon: <PeopleIcon sx={{ fontSize: 40 }} />,
    title: 'Invite Your Family',
    desc: 'Send invitations by email. Siblings, spouses, professional caregivers — everyone who helps gets access.',
  },
  {
    icon: <SyncIcon sx={{ fontSize: 40 }} />,
    title: 'Coordinate Together',
    desc: 'Assign tasks, schedule visits, log care, track medications. Everyone stays in sync, automatically.',
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { firebaseUser, loading, signIn } = useAuth();
  const { showMessage } = useSnackbar();
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    document.title = 'Trellis — Caregiving, Coordinated';
  }, []);

  if (!loading && firebaseUser) {
    return <Navigate to="/" replace />;
  }

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await signIn();
    } catch {
      showMessage('Failed to sign in. Please try again.', 'error');
    } finally {
      setSigningIn(false);
    }
  };

  const SignInButton = ({ size = 'large' }: { size?: 'small' | 'medium' | 'large' }) => (
    <Button
      variant="contained"
      size={size}
      startIcon={signingIn ? <CircularProgress size={20} color="inherit" /> : <GoogleIcon />}
      onClick={handleSignIn}
      disabled={signingIn}
      sx={{ py: size === 'large' ? 1.5 : 1, px: size === 'large' ? 4 : 3, fontWeight: 700 }}
    >
      {signingIn ? 'Signing in...' : 'Get Started with Google'}
    </Button>
  );

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #3A7D44 0%, #2D6B37 35%, #1B5E20 65%, #524470 100%)',
          color: 'white',
          pt: { xs: 8, md: 12 },
          pb: { xs: 10, md: 14 },
          px: 2,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle pattern overlay */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: 0.04,
            backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={6} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: '2.5rem', md: '3.5rem' },
                  lineHeight: 1.1,
                  mb: 2,
                }}
              >
                Caregiving,{' '}
                <Box component="span" sx={{ color: '#D4E8D1' }}>
                  coordinated.
                </Box>
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 400,
                  opacity: 0.9,
                  mb: 4,
                  maxWidth: 500,
                  lineHeight: 1.6,
                }}
              >
                Trellis helps families coordinate care for loved ones with Alzheimer's.
                Tasks, visits, medications, daily logs, and emergency info —
                all in one place your whole family can access.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <SignInButton />
                <Button
                  variant="outlined"
                  size="large"
                  sx={{
                    color: 'white',
                    borderColor: 'rgba(255,255,255,0.5)',
                    '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.08)' },
                    py: 1.5,
                    px: 3,
                  }}
                  onClick={() =>
                    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
                  }
                  endIcon={<KeyboardArrowDownIcon />}
                >
                  See how it works
                </Button>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }} sx={{ display: { xs: 'none', md: 'block' } }}>
              <Box sx={{ transform: 'perspective(1000px) rotateY(-5deg) rotateX(2deg)', transformOrigin: 'center center' }}>
                <MockTaskList />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ── Pain Points ────────────────────────────────────────────────────── */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Typography
          variant="h4"
          textAlign="center"
          fontWeight={700}
          sx={{ mb: 1 }}
        >
          Caregiving shouldn't mean chaos
        </Typography>
        <Typography
          variant="body1"
          textAlign="center"
          color="text.secondary"
          sx={{ mb: 6, maxWidth: 600, mx: 'auto' }}
        >
          When a family member has Alzheimer's, coordination becomes a second job.
          Important things get lost between siblings, spreadsheets, and group texts.
        </Typography>
        <Grid container spacing={3}>
          {painPoints.map((point, i) => (
            <Grid size={{ xs: 12, md: 4 }} key={i}>
              <Card
                sx={{
                  height: '100%',
                  textAlign: 'center',
                  borderTop: 3,
                  borderColor: i === 0 ? 'error.main' : i === 1 ? 'warning.main' : 'info.main',
                }}
              >
                <CardContent sx={{ py: 4, px: 3 }}>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    {point.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {point.desc}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* ── Feature Showcase ───────────────────────────────────────────────── */}
      <Box id="features">
        {features.map((feature, i) => {
          const isReversed = i % 2 === 1;
          return (
            <Box
              key={i}
              sx={{
                py: { xs: 6, md: 8 },
                px: 2,
                bgcolor: i % 2 === 0 ? 'background.default' : 'background.paper',
              }}
            >
              <Container maxWidth="lg">
                <Grid
                  container
                  spacing={6}
                  alignItems="center"
                  direction={isReversed ? 'row-reverse' : 'row'}
                >
                  {/* Text side */}
                  <Grid size={{ xs: 12, md: 5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, color: 'primary.main' }}>
                      {feature.icon}
                      <Typography variant="overline" fontWeight={700} color="primary">
                        {feature.title}
                      </Typography>
                    </Box>
                    <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>
                      {feature.headline}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                      {feature.description}
                    </Typography>
                  </Grid>
                  {/* Mock side */}
                  <Grid size={{ xs: 12, md: 7 }}>
                    <Box
                      sx={{
                        transform: {
                          md: isReversed
                            ? 'perspective(800px) rotateY(3deg)'
                            : 'perspective(800px) rotateY(-3deg)',
                        },
                        transition: 'transform 0.3s ease',
                      }}
                    >
                      {feature.mock}
                    </Box>
                  </Grid>
                </Grid>
              </Container>
            </Box>
          );
        })}
      </Box>

      {/* ── How It Works ───────────────────────────────────────────────────── */}
      <Box sx={{ py: { xs: 8, md: 12 }, px: 2, bgcolor: 'background.paper' }}>
        <Container maxWidth="md">
          <Typography variant="h4" textAlign="center" fontWeight={700} sx={{ mb: 1 }}>
            Up and running in minutes
          </Typography>
          <Typography variant="body1" textAlign="center" color="text.secondary" sx={{ mb: 6 }}>
            No setup fees, no downloads, no training manuals.
          </Typography>
          <Grid container spacing={4}>
            {steps.map((step, i) => (
              <Grid size={{ xs: 12, md: 4 }} key={i}>
                <Box sx={{ textAlign: 'center' }}>
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #3A7D44, #524470)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 2,
                    }}
                  >
                    {step.icon}
                  </Box>
                  <Typography variant="overline" color="primary" fontWeight={700}>
                    Step {i + 1}
                  </Typography>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    {step.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {step.desc}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── Built for Families ─────────────────────────────────────────────── */}
      <Box sx={{ py: { xs: 8, md: 10 }, px: 2, bgcolor: 'background.default' }}>
        <Container maxWidth="md">
          <Typography variant="h4" textAlign="center" fontWeight={700} sx={{ mb: 6 }}>
            Built for families. Ready to scale.
          </Typography>
          <Grid container spacing={3}>
            {[
              {
                icon: <PeopleIcon sx={{ fontSize: 32 }} />,
                title: 'Multi-circle support',
                desc: 'Belong to multiple care circles. Professional caregivers can coordinate across families.',
              },
              {
                icon: <AdminPanelSettingsIcon sx={{ fontSize: 32 }} />,
                title: 'Role-based access',
                desc: 'Admin, family, professional, and read-only roles. Everyone sees what they need — nothing more.',
              },
              {
                icon: <SecurityIcon sx={{ fontSize: 32 }} />,
                title: 'Privacy by design',
                desc: 'Data isolated per circle. Audit logging on every action. Architected for future HIPAA compliance.',
              },
              {
                icon: <WifiOffIcon sx={{ fontSize: 32 }} />,
                title: 'Works offline',
                desc: 'Emergency info cached locally. Installable on any phone as a progressive web app.',
              },
            ].map((item, i) => (
              <Grid size={{ xs: 12, sm: 6 }} key={i}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    <Box sx={{ color: 'primary.main', pt: 0.5 }}>{item.icon}</Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {item.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.desc}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── Final CTA ──────────────────────────────────────────────────────── */}
      <Box
        sx={{
          py: { xs: 8, md: 12 },
          px: 2,
          background: 'linear-gradient(135deg, #3A7D44 0%, #2D6B37 40%, #524470 100%)',
          color: 'white',
          textAlign: 'center',
        }}
      >
        <Container maxWidth="sm">
          <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>
            Your family deserves a better way
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.9, mb: 4, lineHeight: 1.7 }}>
            Trellis is free for families. Create your care circle today and
            start coordinating with the people who matter most.
          </Typography>
          <SignInButton />
        </Container>
      </Box>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <Box sx={{ py: 3, px: 2, textAlign: 'center', bgcolor: '#3D3555', color: 'rgba(255,255,255,0.6)' }}>
        <Typography variant="body2">
          Trellis — Caregiving coordination for your family
        </Typography>
      </Box>
    </Box>
  );
}
