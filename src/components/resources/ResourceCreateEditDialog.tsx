import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Stack, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import { ResourceType } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../contexts/CircleContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { createResource, updateResource } from '../../services/resourceService';
import type { CaregiverResource } from '../../types';

const typeLabels: Record<string, string> = {
  local: 'Local',
  online: 'Online',
  hotline: 'Hotline',
  support_group: 'Support Group',
  government: 'Government',
  financial: 'Financial',
};

interface ResourceCreateEditDialogProps {
  open: boolean;
  onClose: () => void;
  editResource?: CaregiverResource | null;
}

export default function ResourceCreateEditDialog({ open, onClose, editResource }: ResourceCreateEditDialogProps) {
  const { userProfile } = useAuth();
  const { activeCircle } = useCircle();
  const { showMessage } = useSnackbar();
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [type, setType] = useState<string>(ResourceType.ONLINE);
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [contactName, setContactName] = useState('');
  const [notes, setNotes] = useState('');

  const isEdit = Boolean(editResource);

  useEffect(() => {
    if (editResource) {
      setTitle(editResource.title);
      setType(editResource.type);
      setDescription(editResource.description);
      setUrl(editResource.url ?? '');
      setPhone(editResource.phone ?? '');
      setAddress(editResource.address ?? '');
      setContactName(editResource.contactName ?? '');
      setNotes(editResource.notes ?? '');
    } else {
      setTitle(''); setType(ResourceType.ONLINE); setDescription('');
      setUrl(''); setPhone(''); setAddress('');
      setContactName(''); setNotes('');
    }
  }, [editResource, open]);

  const handleSave = async () => {
    if (!title.trim() || !description.trim() || !activeCircle || !userProfile) return;

    setSaving(true);
    try {
      const data = {
        title: title.trim(),
        description: description.trim(),
        type,
        url: url.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        contactName: contactName.trim() || null,
        notes: notes.trim() || null,
      };

      if (isEdit && editResource) {
        await updateResource(activeCircle.id, editResource.id, userProfile.uid, userProfile.displayName, data);
        showMessage('Resource updated', 'success');
      } else {
        await createResource(activeCircle.id, userProfile.uid, userProfile.displayName, data);
        showMessage('Resource added', 'success');
      }
      onClose();
    } catch (err) {
      console.error('Save resource error:', err);
      showMessage('Failed to save resource', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Resource' : 'Add Resource'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth required />
          <FormControl fullWidth required>
            <InputLabel>Type</InputLabel>
            <Select value={type} label="Type" onChange={(e) => setType(e.target.value)}>
              {Object.entries(typeLabels).map(([val, label]) => (
                <MenuItem key={val} value={val}>{label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth required multiline rows={2} />
          <TextField label="Website URL" value={url} onChange={(e) => setUrl(e.target.value)} fullWidth placeholder="https://..." />
          <TextField label="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} fullWidth />
          <TextField label="Address" value={address} onChange={(e) => setAddress(e.target.value)} fullWidth />
          <TextField label="Contact Name" value={contactName} onChange={(e) => setContactName(e.target.value)} fullWidth />
          <TextField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth multiline rows={2} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={!title.trim() || !description.trim() || saving}>
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Resource'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
