import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Stack,
  Link,
  Divider,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import PhoneIcon from '@mui/icons-material/Phone';
import MedicationIcon from '@mui/icons-material/Medication';
import ContactEmergencyIcon from '@mui/icons-material/ContactEmergency';
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
          // Cache for offline access
          try { localStorage.setItem(`emergency_${activeCircle.id}`, JSON.stringify(data)); } catch { /* ignore */ }
        } else {
          setProfile(null);
        }
        setLoading(false);
      },
      () => {
        // Fallback to cached data if offline
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

      {/* Patient Info — Large, high-contrast */}
      <Card sx={{ mb: 2, bgcolor: 'error.dark', color: 'white' }}>
        <CardContent sx={{ py: 3 }}>
          <Typography variant="h4" fontWeight={700}>{profile.patientName}</Typography>
          {profile.dateOfBirth && (
            <Typography variant="h6">DOB: {formatDate(profile.dateOfBirth)}</Typography>
          )}
          {profile.bloodType && (
            <Chip label={`Blood Type: ${profile.bloodType}`} sx={{ mt: 1, bgcolor: 'white', color: 'error.dark', fontWeight: 700, fontSize: '1rem' }} />
          )}
        </CardContent>
      </Card>

      {/* Allergies — Critical */}
      {profile.allergies?.length > 0 && (
        <Card sx={{ mb: 2, border: 2, borderColor: 'error.main' }}>
          <CardContent>
            <Typography variant="h6" color="error" fontWeight={700}>ALLERGIES</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
              {profile.allergies.map((a, i) => (
                <Chip key={i} label={a} color="error" sx={{ fontSize: '1rem', fontWeight: 600 }} />
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Conditions */}
      {profile.conditions?.length > 0 && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600}>Conditions</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
              {profile.conditions.map((c, i) => (
                <Chip key={i} label={c} variant="outlined" sx={{ fontSize: '0.95rem' }} />
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Current Medications */}
      {profile.currentMedications?.length > 0 && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <MedicationIcon />
              <Typography variant="h6" fontWeight={600}>Current Medications</Typography>
            </Box>
            {profile.currentMedications.map((m, i) => (
              <Typography key={i} variant="body1" sx={{ py: 0.5 }}>
                <strong>{m.name}</strong> — {m.dosage}
              </Typography>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Emergency Contacts */}
      {profile.emergencyContacts?.length > 0 && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <ContactEmergencyIcon />
              <Typography variant="h6" fontWeight={600}>Emergency Contacts</Typography>
            </Box>
            {profile.emergencyContacts.map((c, i) => (
              <Box key={i} sx={{ py: 1, borderBottom: i < profile.emergencyContacts.length - 1 ? 1 : 0, borderColor: 'divider' }}>
                <Typography variant="body1" fontWeight={600}>
                  {c.name} <Typography component="span" color="text.secondary">({c.relationship})</Typography>
                </Typography>
                <Link href={`tel:${c.phone}`} variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PhoneIcon fontSize="small" /> {c.phone}
                </Link>
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Hospital & Insurance */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <LocalHospitalIcon />
            <Typography variant="h6" fontWeight={600}>Medical & Insurance</Typography>
          </Box>
          <Stack spacing={1}>
            {profile.physicianName && <Typography><strong>Physician:</strong> {profile.physicianName}{profile.physicianPhone && (
              <> — <Link href={`tel:${profile.physicianPhone}`}>{profile.physicianPhone}</Link></>
            )}</Typography>}
            {profile.hospitalPreference && <Typography><strong>Hospital:</strong> {profile.hospitalPreference}</Typography>}
            {profile.hospitalAddress && <Typography color="text.secondary">{profile.hospitalAddress}</Typography>}
            {profile.insuranceProvider && (
              <>
                <Divider />
                <Typography><strong>Insurance:</strong> {profile.insuranceProvider}</Typography>
                {profile.insurancePolicyNumber && <Typography>Policy: {profile.insurancePolicyNumber}</Typography>}
                {profile.insuranceGroupNumber && <Typography>Group: {profile.insuranceGroupNumber}</Typography>}
              </>
            )}
          </Stack>
        </CardContent>
      </Card>

      <EmergencyProfileEditDialog open={editOpen} onClose={() => setEditOpen(false)} profile={profile} />
    </Box>
  );
}
