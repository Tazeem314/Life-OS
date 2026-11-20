import { storage, storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from './firebase';
import { StudyAttachmentKind, StudyNoteAttachment } from './study-types';

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024; // 20 MB
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB

const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const ALLOWED_DOCUMENT_MIME = new Set([
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);
const ALLOWED_DOCUMENT_EXT = new Set(['.pdf', '.txt', '.md', '.doc', '.docx', '.ppt', '.pptx']);
const ALLOWED_VIDEO_MIME = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

function getFileExtension(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx >= 0 ? name.slice(idx).toLowerCase() : '';
}

export function validateStudyAttachmentFile(
  file: File,
  expectedKind: StudyAttachmentKind
): string | null {
  if (!file) return 'No file selected.';
  const ext = getFileExtension(file.name);

  if (expectedKind === 'image') {
    if (!ALLOWED_IMAGE_MIME.has(file.type) && !['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      return `Unsupported image type "${file.name}". Allowed: JPG, JPEG, PNG, WebP.`;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return `"${file.name}" exceeds the 10 MB image limit.`;
    }
    return null;
  }

  if (expectedKind === 'document') {
    const isSupportedDoc =
      ALLOWED_DOCUMENT_MIME.has(file.type) || ALLOWED_DOCUMENT_EXT.has(ext);
    if (!isSupportedDoc) {
      return `Unsupported document "${file.name}". Allowed: PDF, TXT, MD, DOC, DOCX, PPT, PPTX.`;
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      return `"${file.name}" exceeds the 20 MB document limit.`;
    }
    return null;
  }

  if (expectedKind === 'video') {
    const isSupportedVideo =
      ALLOWED_VIDEO_MIME.has(file.type) || ['.mp4', '.webm', '.mov'].includes(ext);
    if (!isSupportedVideo) {
      return `Unsupported video "${file.name}". Allowed: MP4, WebM, MOV (or use a Video URL link).`;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      return `"${file.name}" exceeds the 50 MB direct upload limit. Consider using a video URL link instead.`;
    }
    return null;
  }

  return 'Invalid attachment category.';
}

export async function uploadStudyAttachment(
  userId: string,
  noteId: string,
  file: File,
  kind: StudyAttachmentKind,
  onProgress?: (pct: number) => void
): Promise<StudyNoteAttachment> {
  if (!userId) {
    throw new Error('Please sign in with Google before uploading files to cloud storage.');
  }

  const validationError = validateStudyAttachmentFile(file, kind);
  if (validationError) {
    throw new Error(validationError);
  }

  const attachmentId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `users/${userId}/studyNotes/${noteId}/${attachmentId}_${safeName}`;
  const fileRef = storageRef(storage, storagePath);

  const downloadUrl = await new Promise<string>((resolve, reject) => {
    const task = uploadBytesResumable(fileRef, file, {
      contentType: file.type || 'application/octet-stream',
    });

    task.on(
      'state_changed',
      (snapshot) => {
        if (onProgress && snapshot.totalBytes > 0) {
          onProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
        }
      },
      (error) => {
        const msg =
          error?.code === 'storage/unauthorized'
            ? 'Storage permission denied. Deploy storage.rules or verify your signed-in account.'
            : error?.message || 'Failed to upload attachment to Firebase Storage.';
        reject(new Error(msg));
      },
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve(url);
        } catch (err: any) {
          reject(new Error(err?.message || 'Could not obtain uploaded file URL.'));
        }
      }
    );
  });

  return {
    id: attachmentId,
    kind,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
    storagePath,
    downloadUrl,
    uploadedAt: new Date().toISOString(),
  };
}

export async function deleteStudyAttachmentFile(storagePath?: string): Promise<void> {
  if (!storagePath) return;
  try {
    const fileRef = storageRef(storage, storagePath);
    await deleteObject(fileRef);
  } catch (error: any) {
    const code = error?.code || '';
    if (code === 'storage/object-not-found') {
      return;
    }
    console.warn('Could not delete study attachment from storage:', error);
  }
}
