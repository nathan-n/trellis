import { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import type { VaultDocument } from '../../types';
import { getPreviewKind } from '../../utils/documentPreview';

interface Props {
  document: VaultDocument;
  size?: number;
}

// Generic fallback icon based on MIME type. Used when the file isn't an
// image, OR when the image fails to load (e.g., HEIC on non-Safari).
function FallbackIcon({ type }: { type: string }) {
  if (type.startsWith('image/')) return <ImageIcon />;
  if (type === 'application/pdf') return <PictureAsPdfIcon />;
  return <DescriptionIcon />;
}

/**
 * Visual tile for a document in the list view.
 *
 * For image documents that the browser can render (PNG, JPEG, GIF, WebP,
 * BMP, SVG), shows an actual thumbnail loaded from the existing Firebase
 * Storage downloadURL. For PDFs, text, and everything else, shows a
 * generic MIME-appropriate icon. Failed image loads (e.g., HEIC on
 * non-Safari browsers) fall back to the icon automatically.
 *
 * Implementation note: we load the full-resolution image and size it
 * down with object-fit: cover. That's bandwidth-cheap enough at family-
 * circle scale (dozens of docs) when combined with loading="lazy" — only
 * images near the viewport fetch. Proper server-side thumbnails would
 * need a Cloud Function trigger on upload; worth revisiting if document
 * volume scales significantly.
 */
export default function DocumentThumbnail({ document, size = 44 }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const kind = getPreviewKind(document.fileType);

  // Reset the failed state if the document itself changes (e.g., re-upload).
  useEffect(() => { setImgFailed(false); }, [document.id, document.downloadURL]);

  const showImage = kind === 'image' && !imgFailed && Boolean(document.downloadURL);

  return (
    <Box
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 1,
        overflow: 'hidden',
        bgcolor: 'grey.100',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'text.secondary',
      }}
    >
      {showImage ? (
        <img
          src={document.downloadURL}
          alt=""
          loading="lazy"
          onError={() => setImgFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <FallbackIcon type={document.fileType} />
      )}
    </Box>
  );
}
