'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLifeOS } from '@/context/LifeOSContext';
import {
  DEFAULT_STUDY_SUBJECTS,
  StudyNote,
  StudyNoteAttachment,
  StudyNoteVideoLink,
} from '@/lib/types';
import {
  formatFileSize,
  parseVideoLinkUrl,
} from '@/lib/study-service';
import {
  uploadStudyAttachment,
  deleteStudyAttachmentFile,
} from '@/lib/study-storage-service';
import { MarkdownPreview } from './MarkdownPreview';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';
import {
  FileText,
  Plus,
  Search,
  Pin,
  Star,
  Trash2,
  Save,
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Quote,
  Link2,
  Eye,
  Split,
  Edit3,
  Image as ImageIcon,
  File as FileIcon,
  Video,
  Youtube,
  ExternalLink,
  X,
  Upload,
  Tag,
  Loader2,
  FolderOpen,
} from 'lucide-react';

type EditorMode = 'split' | 'write' | 'preview';
type SortField = 'updatedAt' | 'createdAt';

const MARKDOWN_TOOLBAR_ACTIONS: readonly {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  prefix: string;
  suffix: string;
  placeholder: string;
}[] = [
  { label: 'Heading 1', icon: Heading1, prefix: '# ', suffix: '', placeholder: 'Heading' },
  { label: 'Heading 2', icon: Heading2, prefix: '## ', suffix: '', placeholder: 'Subheading' },
  { label: 'Heading 3', icon: Heading3, prefix: '### ', suffix: '', placeholder: 'Section' },
  { label: 'Bold', icon: Bold, prefix: '**', suffix: '**', placeholder: 'bold text' },
  { label: 'Italic', icon: Italic, prefix: '*', suffix: '*', placeholder: 'italic text' },
  { label: 'Bullet List', icon: List, prefix: '- ', suffix: '', placeholder: 'list item' },
  { label: 'Numbered List', icon: ListOrdered, prefix: '1. ', suffix: '', placeholder: 'numbered item' },
  { label: 'Checklist', icon: CheckSquare, prefix: '- [ ] ', suffix: '', placeholder: 'task item' },
  { label: 'Quote', icon: Quote, prefix: '> ', suffix: '', placeholder: 'important quote' },
  { label: 'Code', icon: Code, prefix: '`', suffix: '`', placeholder: 'code' },
  { label: 'Link', icon: Link2, prefix: '[', suffix: '](https://)', placeholder: 'link text' },
];

interface NoteDraftState {
  id: string; // existing id or pending new id
  isNew: boolean;
  title: string;
  subject: string;
  contentMarkdown: string;
  tags: string[];
  isPinned: boolean;
  isFavorite: boolean;
  attachments: StudyNoteAttachment[];
  videoLinks: StudyNoteVideoLink[];
  savedSignature: string;
}

const DRAFT_STORAGE_PREFIX = 'lifeos_study_note_draft_';

function makeSignature(d: Omit<NoteDraftState, 'savedSignature' | 'id' | 'isNew'>): string {
  return JSON.stringify({
    title: d.title,
    subject: d.subject,
    contentMarkdown: d.contentMarkdown,
    tags: d.tags,
    isPinned: d.isPinned,
    isFavorite: d.isFavorite,
    attachments: d.attachments.map((a) => a.id),
    videoLinks: d.videoLinks.map((v) => v.id),
  });
}

function buildDraftFromNote(note: StudyNote): NoteDraftState {
  const base = {
    title: note.title,
    subject: note.subject,
    contentMarkdown: note.contentMarkdown,
    tags: [...(note.tags || [])],
    isPinned: Boolean(note.isPinned),
    isFavorite: Boolean(note.isFavorite),
    attachments: [...(note.attachments || [])],
    videoLinks: [...(note.videoLinks || [])],
  };
  return {
    id: note.id,
    isNew: false,
    ...base,
    savedSignature: makeSignature(base),
  };
}

function createEmptyDraft(): NoteDraftState {
  const pendingId = `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const base = {
    title: '',
    subject: 'Mathematics',
    contentMarkdown: '',
    tags: [] as string[],
    isPinned: false,
    isFavorite: false,
    attachments: [] as StudyNoteAttachment[],
    videoLinks: [] as StudyNoteVideoLink[],
  };
  return {
    id: pendingId,
    isNew: true,
    ...base,
    savedSignature: makeSignature(base),
  };
}

export function StudyNotesView() {
  const {
    user,
    studyNotes,
    createStudyNote,
    updateStudyNote,
    deleteStudyNote,
    showToast,
  } = useLifeOS();

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(() =>
    studyNotes.length > 0 ? studyNotes[0].id : null
  );
  const [draft, setDraft] = useState<NoteDraftState>(() => {
    if (studyNotes.length > 0) return buildDraftFromNote(studyNotes[0]);
    return createEmptyDraft();
  });

  // List filters
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [favoritesOnly, setFavoritesOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<SortField>('updatedAt');

  // Editor controls
  const [editorMode, setEditorMode] = useState<EditorMode>('split');
  const [tagInput, setTagInput] = useState('');
  const [customSubjectMode, setCustomSubjectMode] = useState(false);
  const [customSubjectInput, setCustomSubjectInput] = useState('');

  // Attachment & Video upload states
  const [uploadProgress, setUploadProgress] = useState<{ kind: string; pct: number } | null>(null);
  const [uploadError, setUploadError] = useState<string>('');
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [videoTitleInput, setVideoTitleInput] = useState('');
  const [videoLinkError, setVideoLinkError] = useState('');
  const [lightboxImage, setLightboxImage] = useState<StudyNoteAttachment | null>(null);

  // Dialog guards
  const [noteToDeleteId, setNoteToDeleteId] = useState<string | null>(null);
  const [pendingNavigationAction, setPendingNavigationAction] = useState<(() => void) | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const currentSignature = makeSignature({
    title: draft.title,
    subject: draft.subject,
    contentMarkdown: draft.contentMarkdown,
    tags: draft.tags,
    isPinned: draft.isPinned,
    isFavorite: draft.isFavorite,
    attachments: draft.attachments,
    videoLinks: draft.videoLinks,
  });
  const isDirty = currentSignature !== draft.savedSignature;

  // All available subjects (default + user custom subjects)
  const allSubjects = useMemo(() => {
    const set = new Set<string>(DEFAULT_STUDY_SUBJECTS);
    for (const n of studyNotes) {
      if (n.subject) set.add(n.subject);
    }
    if (draft.subject) set.add(draft.subject);
    return Array.from(set);
  }, [studyNotes, draft.subject]);

  // All tags across notes
  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const n of studyNotes) {
      for (const t of n.tags || []) {
        if (t) set.add(t);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [studyNotes]);

  // Filter & sort notes list
  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...studyNotes]
      .filter((n) => {
        if (subjectFilter !== 'all' && n.subject !== subjectFilter) return false;
        if (tagFilter !== 'all' && !(n.tags || []).includes(tagFilter)) return false;
        if (favoritesOnly && !n.isFavorite) return false;
        if (q) {
          const inTitle = n.title.toLowerCase().includes(q);
          const inBody = n.contentMarkdown.toLowerCase().includes(q);
          const inTags = (n.tags || []).some((t) => t.toLowerCase().includes(q));
          const inSubj = n.subject.toLowerCase().includes(q);
          if (!inTitle && !inBody && !inTags && !inSubj) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        const aTime = new Date(a[sortBy] || a.updatedAt).getTime();
        const bTime = new Date(b[sortBy] || b.updatedAt).getTime();
        return bTime - aTime;
      });
  }, [studyNotes, searchQuery, subjectFilter, tagFilter, favoritesOnly, sortBy]);

  // Autosave dirty draft to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = `${DRAFT_STORAGE_PREFIX}${draft.isNew ? 'new' : draft.id}`;
    if (isDirty) {
      try {
        window.localStorage.setItem(
          key,
          JSON.stringify({
            title: draft.title,
            subject: draft.subject,
            contentMarkdown: draft.contentMarkdown,
            tags: draft.tags,
            updatedAt: Date.now(),
          })
        );
      } catch {
        // Ignore quota errors
      }
    }
  }, [draft, isDirty]);

  const guardDirtyNavigation = (action: () => void) => {
    if (isDirty) {
      setPendingNavigationAction(() => action);
    } else {
      action();
    }
  };

  const openNote = (note: StudyNote) => {
    guardDirtyNavigation(() => {
      setSelectedNoteId(note.id);
      setCustomSubjectMode(false);
      setUploadError('');
      setVideoLinkError('');
      let nextDraft = buildDraftFromNote(note);

      // Restore unsaved local draft if present and newer than note.updatedAt
      try {
        const raw = window.localStorage.getItem(`${DRAFT_STORAGE_PREFIX}${note.id}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          const noteTime = new Date(note.updatedAt).getTime();
          if (parsed?.updatedAt && parsed.updatedAt > noteTime) {
            nextDraft = {
              ...nextDraft,
              title: parsed.title ?? nextDraft.title,
              subject: parsed.subject ?? nextDraft.subject,
              contentMarkdown: parsed.contentMarkdown ?? nextDraft.contentMarkdown,
              tags: Array.isArray(parsed.tags) ? parsed.tags : nextDraft.tags,
            };
          }
        }
      } catch {
        // Ignore corrupt draft
      }
      setDraft(nextDraft);
    });
  };

  const startNewNote = () => {
    guardDirtyNavigation(() => {
      setSelectedNoteId(null);
      setCustomSubjectMode(false);
      setUploadError('');
      setVideoLinkError('');
      setDraft(createEmptyDraft());
    });
  };

  const handleSaveNote = () => {
    const resolvedSubject =
      customSubjectMode && customSubjectInput.trim()
        ? customSubjectInput.trim()
        : draft.subject.trim() || 'Other';

    if (draft.isNew) {
      const created = createStudyNote({
        id: draft.id,
        title: draft.title.trim() || 'Untitled Study Note',
        subject: resolvedSubject,
        contentMarkdown: draft.contentMarkdown,
        tags: draft.tags,
        isPinned: draft.isPinned,
        isFavorite: draft.isFavorite,
        attachments: draft.attachments,
        videoLinks: draft.videoLinks,
      });
      try {
        window.localStorage.removeItem(`${DRAFT_STORAGE_PREFIX}new`);
      } catch {
        // noop
      }
      setSelectedNoteId(created.id);
      setDraft(buildDraftFromNote(created));
      setCustomSubjectMode(false);
      setCustomSubjectInput('');
    } else {
      const updated = updateStudyNote(draft.id, {
        title: draft.title.trim() || 'Untitled Study Note',
        subject: resolvedSubject,
        contentMarkdown: draft.contentMarkdown,
        tags: draft.tags,
        isPinned: draft.isPinned,
        isFavorite: draft.isFavorite,
        attachments: draft.attachments,
        videoLinks: draft.videoLinks,
      });
      try {
        window.localStorage.removeItem(`${DRAFT_STORAGE_PREFIX}${draft.id}`);
      } catch {
        // noop
      }
      if (updated) {
        setDraft(buildDraftFromNote(updated));
        showToast({
          type: 'success',
          title: 'Study Note Saved',
          message: `"${updated.title}" updated.`,
        });
      }
      setCustomSubjectMode(false);
      setCustomSubjectInput('');
    }
  };

  // Helper to mutate an attachment/video immediately on persisted notes (so uploads are durable)
  const syncMediaToSavedNote = (
    nextAttachments: StudyNoteAttachment[],
    nextVideoLinks: StudyNoteVideoLink[]
  ) => {
    if (!draft.isNew) {
      updateStudyNote(draft.id, {
        attachments: nextAttachments,
        videoLinks: nextVideoLinks,
      });
    }
  };

  const applyMarkdownFormat = (prefix: string, suffix = '', placeholder = 'text') => {
    const el = textareaRef.current;
    if (!el) {
      setDraft((prev) => ({
        ...prev,
        contentMarkdown: `${prev.contentMarkdown}${prev.contentMarkdown ? '\n' : ''}${prefix}${placeholder}${suffix}`,
      }));
      return;
    }

    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const val = el.value;
    const selected = val.slice(start, end) || placeholder;
    const nextText = val.slice(0, start) + prefix + selected + suffix + val.slice(end);
    setDraft((prev) => ({ ...prev, contentMarkdown: nextText }));

    window.requestAnimationFrame(() => {
      el.focus();
      const cursorStart = start + prefix.length;
      const cursorEnd = cursorStart + selected.length;
      el.setSelectionRange(cursorStart, cursorEnd);
    });
  };

  const handleAddTag = () => {
    const cleaned = tagInput.trim().replace(/^#/, '');
    if (!cleaned) return;
    if (!draft.tags.includes(cleaned)) {
      setDraft((prev) => ({ ...prev, tags: [...prev.tags, cleaned] }));
    }
    setTagInput('');
  };

  const handleUploadFiles = async (
    files: FileList | null,
    kind: 'image' | 'document' | 'video'
  ) => {
    if (!files || files.length === 0) return;
    setUploadError('');
    if (!user?.uid) {
      setUploadError('Please sign in with Google in the top bar before uploading files to Cloud Storage.');
      return;
    }

    const uploadedList: StudyNoteAttachment[] = [];
    for (const file of Array.from(files)) {
      try {
        setUploadProgress({ kind, pct: 0 });
        const att = await uploadStudyAttachment(user.uid, draft.id, file, kind, (pct) => {
          setUploadProgress({ kind, pct });
        });
        uploadedList.push(att);
      } catch (err: any) {
        setUploadError(err?.message || `Failed to upload ${file.name}.`);
      }
    }

    setUploadProgress(null);

    if (uploadedList.length > 0) {
      const nextAttachments = [...draft.attachments, ...uploadedList];
      setDraft((prev) => ({
        ...prev,
        attachments: nextAttachments,
      }));
      syncMediaToSavedNote(nextAttachments, draft.videoLinks);
      showToast({
        type: 'success',
        title: 'File Uploaded',
        message: `${uploadedList.length} ${kind}${uploadedList.length > 1 ? 's' : ''} attached.`,
      });
    }
  };

  const handleRemoveAttachment = async (att: StudyNoteAttachment) => {
    const nextAttachments = draft.attachments.filter((a) => a.id !== att.id);
    setDraft((prev) => ({ ...prev, attachments: nextAttachments }));
    syncMediaToSavedNote(nextAttachments, draft.videoLinks);
    await deleteStudyAttachmentFile(att.storagePath);
  };

  const handleAddVideoLink = () => {
    setVideoLinkError('');
    const result = parseVideoLinkUrl(videoUrlInput, videoTitleInput);
    if ('error' in result) {
      setVideoLinkError(result.error);
      return;
    }
    const nextLinks = [...draft.videoLinks, result];
    setDraft((prev) => ({ ...prev, videoLinks: nextLinks }));
    syncMediaToSavedNote(draft.attachments, nextLinks);
    setVideoUrlInput('');
    setVideoTitleInput('');
  };

  const handleRemoveVideoLink = (id: string) => {
    const nextLinks = draft.videoLinks.filter((v) => v.id !== id);
    setDraft((prev) => ({ ...prev, videoLinks: nextLinks }));
    syncMediaToSavedNote(draft.attachments, nextLinks);
  };

  const imageAttachments = draft.attachments.filter((a) => a.kind === 'image');
  const documentAttachments = draft.attachments.filter((a) => a.kind === 'document');
  const videoAttachments = draft.attachments.filter((a) => a.kind === 'video');

  return (
    <div className="space-y-5 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2.5">
            <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-sky-600 dark:text-sky-400 shrink-0" />
            <span>Study Notes</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Rich Markdown study notes by subject with images, documents, and video references
          </p>
        </div>

        <button
          type="button"
          onClick={startNewNote}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition self-stretch sm:self-auto whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Note</span>
        </button>
      </div>

      {/* Main Split Workspace: Notes Directory + Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Sidebar Directory (4 cols on desktop) */}
        <div className="lg:col-span-4 bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs p-3.5 sm:p-4 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes, tags, subjects..."
              className="w-full pl-8 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Subject, Sort, Favorites filters */}
          <div className="grid grid-cols-2 gap-2">
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              aria-label="Filter by subject"
              className="px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-200"
            >
              <option value="all">All Subjects</option>
              {allSubjects.map((subj) => (
                <option key={subj} value={subj}>
                  {subj}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortField)}
              aria-label="Sort notes by"
              className="px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-200"
            >
              <option value="updatedAt">Sort: Updated</option>
              <option value="createdAt">Sort: Created</option>
            </select>
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setFavoritesOnly((prev) => !prev)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
                favoritesOnly
                  ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              <Star className={`w-3 h-3 ${favoritesOnly ? 'fill-amber-500 text-amber-500' : ''}`} />
              <span>Favourites</span>
            </button>

            <span className="text-[11px] font-mono tabular-nums text-zinc-400">
              {filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}
            </span>
          </div>

          {/* Interactive Tag filter strip */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
              <button
                type="button"
                onClick={() => setTagFilter('all')}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap transition cursor-pointer ${
                  tagFilter === 'all'
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                }`}
              >
                All Tags
              </button>
              {allTags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTagFilter(tagFilter === t ? 'all' : t)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap transition cursor-pointer ${
                    tagFilter === t
                      ? 'bg-sky-600 text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  #{t}
                </button>
              ))}
            </div>
          )}

          {/* Notes List */}
          <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-0.5">
            {filteredNotes.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
                <FolderOpen className="w-6 h-6 mx-auto mb-1.5 opacity-60" />
                {studyNotes.length === 0 ? 'No study notes yet.' : 'No notes match current filters.'}
              </div>
            ) : (
              filteredNotes.map((note) => {
                const isSelected = !draft.isNew && draft.id === note.id;
                const mediaCount = (note.attachments?.length || 0) + (note.videoLinks?.length || 0);
                return (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => openNote(note)}
                    className={`w-full text-left p-2.5 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-300 dark:border-sky-800 shadow-2xs'
                        : 'bg-zinc-50/60 dark:bg-zinc-800/40 border-zinc-200/70 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {note.title}
                      </p>
                      <div className="flex items-center gap-1 shrink-0">
                        {note.isPinned && <Pin className="w-3 h-3 text-sky-500" />}
                        {note.isFavorite && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 truncate">
                      <span className="font-semibold text-sky-600 dark:text-sky-400">
                        {note.subject}
                      </span>
                      <span>·</span>
                      <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                      {mediaCount > 0 && (
                        <>
                          <span>·</span>
                          <span>{mediaCount} media</span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Editor & Preview Workspace (8 cols on desktop) */}
        <div className="lg:col-span-8 bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs p-4 sm:p-6 space-y-4">
          {/* Metadata Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                {draft.isNew ? 'New Study Note' : 'Editing Note'}
              </span>
              {isDirty ? (
                <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                  · Unsaved changes
                </span>
              ) : (
                !draft.isNew && (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    · Saved
                  </span>
                )
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setDraft((prev) => ({ ...prev, isPinned: !prev.isPinned }))}
                aria-pressed={draft.isPinned}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                  draft.isPinned
                    ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <Pin className="w-3.5 h-3.5" />
                <span>{draft.isPinned ? 'Pinned' : 'Pin'}</span>
              </button>

              <button
                type="button"
                onClick={() => setDraft((prev) => ({ ...prev, isFavorite: !prev.isFavorite }))}
                aria-pressed={draft.isFavorite}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                  draft.isFavorite
                    ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${draft.isFavorite ? 'fill-amber-500 text-amber-500' : ''}`} />
                <span>Favourite</span>
              </button>

              {!draft.isNew && (
                <button
                  type="button"
                  onClick={() => setNoteToDeleteId(draft.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSaveNote}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-xs transition whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Note</span>
              </button>
            </div>
          </div>

          {/* Title & Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                Note Title
              </label>
              <input
                type="text"
                value={draft.title}
                onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Electrostatics — Gauss's Law Summary"
                className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Subject
                </label>
                <button
                  type="button"
                  onClick={() => setCustomSubjectMode((prev) => !prev)}
                  className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline font-medium cursor-pointer"
                >
                  {customSubjectMode ? 'Choose preset' : '+ Custom'}
                </button>
              </div>
              {customSubjectMode ? (
                <input
                  type="text"
                  value={customSubjectInput}
                  onChange={(e) => setCustomSubjectInput(e.target.value)}
                  placeholder="Enter subject name..."
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              ) : (
                <select
                  value={draft.subject}
                  onChange={(e) => setDraft((prev) => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {allSubjects.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Tags Editor */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-zinc-400" />
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add tag + Enter"
                className="w-36 px-2.5 py-1 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-2 py-1 text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                Add
              </button>
            </div>
            {draft.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 text-xs font-medium border border-sky-200/70 dark:border-sky-800/60"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      tags: prev.tags.filter((t) => t !== tag),
                    }))
                  }
                  aria-label={`Remove tag ${tag}`}
                  className="hover:text-rose-500 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          {/* Formatting Toolbar & View Mode Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800">
            <div className="flex items-center flex-wrap gap-0.5">
              {MARKDOWN_TOOLBAR_ACTIONS.map((btn) => {
                const Icon = btn.icon;
                return (
                  <button
                    key={btn.label}
                    type="button"
                    title={btn.label}
                    aria-label={btn.label}
                    onClick={() => applyMarkdownFormat(btn.prefix, btn.suffix, btn.placeholder)}
                    className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-700 transition cursor-pointer"
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
              {[
                { id: 'write', label: 'Write', icon: Edit3 },
                { id: 'split', label: 'Split', icon: Split },
                { id: 'preview', label: 'Preview', icon: Eye },
              ].map((mode) => {
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setEditorMode(mode.id as EditorMode)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                      editorMode === mode.id
                        ? 'bg-sky-600 text-white'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span className="hidden sm:inline">{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Markdown Editor & Live Preview */}
          <div
            className={`grid gap-4 ${
              editorMode === 'split' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
            }`}
          >
            {(editorMode === 'write' || editorMode === 'split') && (
              <textarea
                ref={textareaRef}
                rows={14}
                value={draft.contentMarkdown}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, contentMarkdown: e.target.value }))
                }
                placeholder="# Formula Sheet & Key Concepts&#10;&#10;Write in Markdown with **bold**, checklists (`- [ ]`), tables, or formulas..."
                className="w-full min-h-[280px] p-3.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-sm font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-y"
              />
            )}

            {(editorMode === 'preview' || editorMode === 'split') && (
              <div className="min-h-[280px] max-h-[480px] overflow-y-auto p-4 rounded-2xl bg-zinc-50/50 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800">
                <MarkdownPreview content={draft.contentMarkdown} />
              </div>
            )}
          </div>

          {/* Media, Attachments & Video Section */}
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  Attachments &amp; Video References
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Images (10 MB max), Documents (20 MB max), Direct Videos (50 MB max), or YouTube / Web Video URLs
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    handleUploadFiles(e.target.files, 'image');
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={Boolean(uploadProgress)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition cursor-pointer disabled:opacity-50"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-sky-500" />
                  <span>Image</span>
                </button>

                <input
                  ref={docInputRef}
                  type="file"
                  accept=".pdf,.txt,.md,.doc,.docx,.ppt,.pptx"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    handleUploadFiles(e.target.files, 'document');
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => docInputRef.current?.click()}
                  disabled={Boolean(uploadProgress)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition cursor-pointer disabled:opacity-50"
                >
                  <FileIcon className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Document</span>
                </button>

                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                  className="hidden"
                  onChange={(e) => {
                    handleUploadFiles(e.target.files, 'video');
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={Boolean(uploadProgress)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Upload Video</span>
                </button>
              </div>
            </div>

            {!user && (
              <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-[11px] text-amber-800 dark:text-amber-300">
                Sign in with Google to upload images, documents, and videos to Cloud Storage. Markdown notes and video links work offline in Guest mode.
              </div>
            )}

            {uploadProgress && (
              <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-sky-700 dark:text-sky-300">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Uploading {uploadProgress.kind}...
                  </span>
                  <span className="font-mono tabular-nums">{uploadProgress.pct}%</span>
                </div>
                <div className="w-full h-1.5 bg-sky-100 dark:bg-sky-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-600 transition-all duration-150"
                    style={{ width: `${uploadProgress.pct}%` }}
                  />
                </div>
              </div>
            )}

            {uploadError && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                {uploadError}
              </div>
            )}

            {/* Add Video URL Form */}
            <div className="p-3 rounded-2xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800 space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  value={videoUrlInput}
                  onChange={(e) => {
                    setVideoUrlInput(e.target.value);
                    if (videoLinkError) setVideoLinkError('');
                  }}
                  placeholder="Paste YouTube or external video URL (https://...)"
                  className="flex-1 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <input
                  type="text"
                  value={videoTitleInput}
                  onChange={(e) => setVideoTitleInput(e.target.value)}
                  placeholder="Video title (optional)"
                  className="sm:w-44 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <button
                  type="button"
                  onClick={handleAddVideoLink}
                  className="inline-flex items-center justify-center gap-1 px-3.5 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:opacity-90 transition shrink-0 cursor-pointer"
                >
                  <Youtube className="w-3.5 h-3.5 text-rose-500" />
                  <span>Add Video URL</span>
                </button>
              </div>
              {videoLinkError && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                  {videoLinkError}
                </p>
              )}
            </div>

            {/* Rendered Images Gallery */}
            {imageAttachments.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  Images ({imageAttachments.length})
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {imageAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="group relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 aspect-video"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={att.downloadUrl}
                        alt={att.fileName}
                        onClick={() => setLightboxImage(att)}
                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(att)}
                        aria-label={`Remove ${att.fileName}`}
                        className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/70 text-white hover:bg-rose-600 transition cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] px-2 py-0.5 truncate">
                        {att.fileName} ({formatFileSize(att.sizeBytes)})
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rendered Documents List */}
            {documentAttachments.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  Documents ({documentAttachments.length})
                </h4>
                <div className="space-y-1.5">
                  {documentAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-zinc-800 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileIcon className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                          {att.fileName}
                        </span>
                        <span className="text-[11px] font-mono text-zinc-400 shrink-0">
                          {formatFileSize(att.sizeBytes)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={att.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-sky-600 dark:text-sky-400 font-semibold hover:bg-sky-50 dark:hover:bg-sky-950/40"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Open</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(att)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 cursor-pointer"
                          aria-label={`Remove ${att.fileName}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rendered Uploaded Videos + Video URLs */}
            {(videoAttachments.length > 0 || draft.videoLinks.length > 0) && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  Videos ({videoAttachments.length + draft.videoLinks.length})
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {draft.videoLinks.map((vlink) => (
                    <div
                      key={vlink.id}
                      className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate flex items-center gap-1.5">
                          <Youtube className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          {vlink.title || (vlink.platform === 'youtube' ? 'YouTube Reference' : 'External Video')}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <a
                            href={vlink.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-0.5"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Open</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => handleRemoveVideoLink(vlink.id)}
                            className="p-1 text-zinc-400 hover:text-rose-600 cursor-pointer"
                            aria-label="Remove video link"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {vlink.platform === 'youtube' && vlink.embedUrl ? (
                        <div className="aspect-video rounded-xl overflow-hidden bg-black">
                          <iframe
                            src={vlink.embedUrl}
                            title={vlink.title || 'YouTube Study Video'}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full border-0"
                          />
                        </div>
                      ) : (
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 break-all">
                          {vlink.url}
                        </p>
                      )}
                    </div>
                  ))}

                  {videoAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate flex items-center gap-1.5">
                          <Video className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          {att.fileName} ({formatFileSize(att.sizeBytes)})
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(att)}
                          className="p-1 text-zinc-400 hover:text-rose-600 cursor-pointer"
                          aria-label={`Remove ${att.fileName}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <video
                        controls
                        src={att.downloadUrl}
                        className="w-full rounded-xl max-h-60 bg-black"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="self-end p-2 rounded-full bg-zinc-900/80 text-white hover:bg-zinc-800 cursor-pointer"
              aria-label="Close image preview"
            >
              <X className="w-5 h-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxImage.downloadUrl}
              alt={lightboxImage.fileName}
              className="max-h-[80vh] w-auto rounded-2xl object-contain shadow-2xl"
            />
            <p className="text-xs text-zinc-200">
              {lightboxImage.fileName} ({formatFileSize(lightboxImage.sizeBytes)})
            </p>
          </div>
        </div>
      )}

      {/* Unsaved Changes Navigation Guard */}
      <ConfirmDialog
        isOpen={Boolean(pendingNavigationAction)}
        title="Discard Unsaved Note Changes?"
        message="You have unsaved edits in your current Study Note. Switching now will leave them unsaved."
        confirmText="Discard Changes"
        isDestructive
        onConfirm={() => {
          const fn = pendingNavigationAction;
          setPendingNavigationAction(null);
          if (fn) fn();
        }}
        onCancel={() => setPendingNavigationAction(null)}
      />

      {/* Delete Note Guard */}
      <ConfirmDialog
        isOpen={Boolean(noteToDeleteId)}
        title="Delete Study Note?"
        message="This will permanently delete this study note and any uploaded cloud attachments."
        confirmText="Delete Note"
        isDestructive
        onConfirm={async () => {
          const id = noteToDeleteId;
          setNoteToDeleteId(null);
          if (id) {
            const remaining = studyNotes.filter((n) => n.id !== id);
            await deleteStudyNote(id);
            if (remaining.length > 0) {
              setSelectedNoteId(remaining[0].id);
              setDraft(buildDraftFromNote(remaining[0]));
            } else {
              setSelectedNoteId(null);
              setDraft(createEmptyDraft());
            }
          }
        }}
        onCancel={() => setNoteToDeleteId(null)}
      />
    </div>
  );
}
