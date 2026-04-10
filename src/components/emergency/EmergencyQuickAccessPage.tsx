import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Stack,
  Divider,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import MedicationIcon from '@mui/icons-material/Medication';
import ContactEmergencyIcon from '@mui/icons-material/ContactEmergency';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import PhoneIcon from '@mui/icons-material/Phone';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useCircle } from '../../contexts/CircleContext';
import { formatDate } from '../../utils/dateUtils';
import { CircleRole } from '../../constants';
import { hasMinRole } from '../../utils/roleUtils';
import type { EmergencyProfile } from '../../types';
import EmergencyProfileEditDialog from './EmergencyProfileEditDialog';
import LoadingSpinner from '../shared/LoadingSpinner';
import EmptyState from '../shared/EmptyState';

const cardSx = { borderRadius: 3, mb: 2 };

function SectionHeader({ icon, label, color = 'text.primary' }: { icon: React.ReactNode; label: string; color?: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, color }}>
      {icon}
      <Typography variant="h6" fontWeight={600} color="inherit">{label}</Typography>
    </Box>
  );
}

export default function EmergencyQuickAccessPage() {
  const { activeCircle, role } = useCircle();
  const [profile, setProfile] = useState<EmergencyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!activeCircle) return;
    const unsubscribe = onSnapshot(
      doc(db, 'circles', activeCircle.id, 'emergencyProfile', 'profile'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as EmergencyProfile;
          setProfile(data);
          try { localStorage.setItem(`emergency_${activeCircle.id}`, JSON.stringify(data)); } catch { /* ignore */ }
        } else {
          setProfile(null);
        }
        setLoading(false);
      },
      () => {
        try {
          const cached = localStorage.getItem(`emergency_${activeCircle.id}`);
          if (cached) setProfile(JSON.parse(cached));
        } catch { /* ignore */ }
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [activeCircle?.id]);

  if (loading) return <LoadingSpinner />;

  if (!profile) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>Emergency Information</Typography>
        <EmptyState
          icon={<ContactEmergencyIcon />}
          title="No emergency profile yet"
          description="Set up the emergency profile with patient info, medications, and contacts."
          actionLabel="Set Up Profile"
          onAction={() => setEditOpen(true)}
        />
        <EmergencyProfileEditDialog open={editOpen} onClose={() => setEditOpen(false)} profile={null} />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Emergency Information</Typography>
        {role && hasMinRole(role, CircleRole.FAMILY) && (
          <Button startIcon={<EditIcon />} onClick={() => setEditOpen(true)}>Edit</Button>
        )}
      </Box>

      {/* Patient Header */}
      <Card sx={{ ...cardSx, bgcolor: 'primary.main', color: 'white' }}>
        <CardContent sx={{ py: 3, px: 3 }}>
          <Typography variant="h4" fontWeight={700}>{profile.patientName}</Typography>
          {profile.dateOfBirth && (
            <Typography variant="h6" sx={{ opacity: 0.9 }}>DOB: {formatDate(profile.dateOfBirth)}</Typography>
          )}
          {profile.bloodType && (
            <Chip
              label={`Blood Type: ${profile.bloodType}`}
              sx={{ mt: 1, bgcolor: 'white', color: 'primary.dark', fontWeight: 700, fontSize: '1rem' }}
            />
          )}
        </CardContent>
      </Card>

      {/* Allergies */}
      {profile.allergies?.length > 0 && (
        <Card sx={{ ...cardSx, borderLeft: 4, borderLeftColor: 'warning.main' }}>
          <CardContent>
            <SectionHeader icon={<WarningAmberIcon />} label="Allergies" color="warning.dark" />
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 0.5 }}>
              {profile.allergies.map((a, i) => (
                <Chip
                  key={i}
                  label={a}
                  sx={{ bgcolor: 'warning.light', color: 'warning.dark', fontSize: '0.95rem', fontWeight: 600 }}
                />
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Conditions */}
      {profile.conditions?.length > 0 && (
        <Card sx={{ ...cardSx, borderLeft: 4, borderLeftColor: 'secondary.light' }}>
          <CardContent>
            <SectionHeader icon={<HealthAndSafetyIcon />} label="Conditions" color="secondary.main" />
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 0.5 }}>
              {profile.conditions.map((c, i) => (
                <Chip key={i} label={c} color="secondary" variant="outlined" sx={{ fontSize: '0.95rem' }} />
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Current Medications */}
      {profile.currentMedications?.length > 0 && (
        <Card sx={{ ...cardSx, borderLeft: 4, borderLeftColor: 'primary.light' }}>
          <CardContent>
            <SectionHeader icon={<MedicationIcon />} label="Current Medications" color="primary.main" />
            {profile.currentMedications.map((m, i) => (
              <Typography key={i} variant="body1" sx={{ py: 0.5 }}>
                <strong>{m.name}</strong> <Typography component="span" color="text.secondary">— {m.dosage}</Typography>
              </Typography>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Emergency Contacts */}
      {profile.emergencyContacts?.length > 0 && (
        <Card sx={{ ...cardSx, borderLeft: 4, borderLeftColor: 'primary.main' }}>
          <CardContent>
            <SectionHeader icon={<ContactEmergencyIcon />} label="Emergency Contacts" color="primary.main" />
            <Stack spacing={1.5}>
              {profile.emergencyContacts.map((c, i) => (
                <Box key={i} sx={{ bgcolor: 'grey.50', borderRadius: 2, p: 2 }}>
                  <Typography variant="body1" fontWeight={600}>
                    {c.name} <Typography component="span" color="text.secondary">({c.relationship})</Typography>
                  </Typography>
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<PhoneIcon />}
                    href={`tel:${c.phone}`}
                    component="a"
                    size="small"
                    sx={{ mt: 1 }}
                  >
                    {c.phone}
                  </Button>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Medical & Insurance */}
      <Card sx={{ ...cardSx, borderLeft: 4, borderLeftColor: 'secondary.main' }}>
        <CardContent>
          <SectionHeader icon={<LocalHospitalIcon />} label="Medical" color="secondary.main" />
          <Stack spacing={1}>
            {profile.physicianName && (
              <Box>
                <Typography variant="body2"><strong>Physician:</strong> {profile.physicianName}</Typography>
                {profile.physicianPhone && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<PhoneIcon />}
                    href={`tel:${profile.physicianPhone}`}
                    component="a"
                    sx={{ mt: 0.5 }}
                  >
                    {profile.physicianPhone}
                  </Button>
                )}
              </Box>
            )}
            {profile.hospitalPreference && (
              <Box>
                <Typography variant="body2"><strong>Hospital:</strong> {profile.hospitalPreference}</Typography>
                {profile.hospitalAddress && (
                  <Typography variant="body2" color="text.secondary">{profile.hospitalAddress}</Typography>
                )}
              </Box>
            )}
          </Stack>

          {profile.insuranceProvider && (
            <>
              <Divider sx={{ my: 2 }} />
              <SectionHeader icon={<VerifiedUserIcon />} label="Insurance" color="secondary.main" />
              <Stack spacing={0.5}>
                <Typography variant="body2"><strong>Provider:</strong> {profile.insuranceProvider}</Typography>
                {profile.insurancePolicyNumber && <Typography variant="body2">Policy: {profile.insurancePolicyNumber}</Typography>}
                {profile.insuranceGroupNumber && <Typography variant="body2">Group: {profile.insuranceGroupNumber}</Typography>}
              </Stack>
            </>
          )}
        </CardContent>
      </Card>

      <EmergencyProfileEditDialog open={editOpen} onClose={() => setEditOpen(false)} profile={profile} />
    </Box>
  );
}
