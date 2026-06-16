'use client';

import { useState } from 'react';
import { Loader2, Pencil, Pin, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn, formatDate } from '@/lib/utils';
import type { Listing } from '@/types/listing';

export interface NotesPanelProps {
  listing: Listing;
  /** Called with the server's updated listing after any add/edit/delete. */
  onChange: (listing: Listing) => void;
  className?: string;
}

export function NotesPanel({ listing, onChange, className }: NotesPanelProps) {
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [busy, setBusy] = useState(false);

  const base = `/api/listings/${listing.id}/comments`;

  async function run(req: Promise<Response>, okMsg: string): Promise<boolean> {
    setBusy(true);
    try {
      const res = await req;
      if (!res.ok) throw new Error('request failed');
      const updated = (await res.json()) as Listing;
      onChange(updated);
      toast.success(okMsg);
      return true;
    } catch {
      toast.error('Something went wrong. Please try again.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function addNote() {
    const body = draft.trim();
    if (!body) return;
    const ok = await run(
      fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      }),
      'Note added',
    );
    if (ok) setDraft('');
  }

  async function saveEdit(id: string) {
    const body = editText.trim();
    if (!body) return;
    const ok = await run(
      fetch(`${base}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      }),
      'Note updated',
    );
    if (ok) setEditingId(null);
  }

  async function deleteNote(id: string) {
    await run(fetch(`${base}/${id}`, { method: 'DELETE' }), 'Note deleted');
  }

  async function togglePin(id: string, pinned: boolean) {
    await run(
      fetch(`${base}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned }),
      }),
      pinned ? 'Note pinned' : 'Note unpinned',
    );
  }

  // Pinned first, then newest first.
  const comments = [...listing.comments].sort(
    (a, b) =>
      Number(b.pinned) - Number(a.pinned) ||
      b.createdAt.localeCompare(a.createdAt),
  );

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Composer */}
      <div className="flex flex-col gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a note…"
          disabled={busy}
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={addNote} disabled={busy || !draft.trim()}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add note
          </Button>
        </div>
      </div>

      {/* Thread */}
      <div className="flex flex-col gap-2">
        {comments.length === 0 ? (
          <p className="py-3 text-center text-sm text-brand-muted">
            No notes yet.
          </p>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              className={cn(
                'rounded-lg border p-3',
                c.pinned
                  ? 'border-brand-gold/50 bg-[#fff8e6]/60'
                  : 'border-brand-border bg-white',
              )}
            >
              {editingId === c.id ? (
                <div className="flex flex-col gap-2">
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    disabled={busy}
                  />
                  <div className="flex justify-end gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                      disabled={busy}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => saveEdit(c.id)}
                      disabled={busy || !editText.trim()}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="whitespace-pre-wrap text-sm text-brand-text">
                    {c.body}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-xs text-brand-muted">
                      {c.pinned && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#fff8e6] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-gold">
                          <Pin className="h-2.5 w-2.5 fill-current" />
                          Pinned
                        </span>
                      )}
                      <span>
                        {formatDate(c.createdAt)}
                        {c.updatedAt !== c.createdAt ? ' · edited' : ''}
                      </span>
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => togglePin(c.id, !c.pinned)}
                        disabled={busy}
                        aria-label={c.pinned ? 'Unpin note' : 'Pin note'}
                        className={cn(
                          'rounded p-1 transition-colors',
                          c.pinned
                            ? 'text-brand-gold hover:bg-[#fff8e6]'
                            : 'text-brand-muted hover:bg-brand-light hover:text-brand-navy',
                        )}
                      >
                        <Pin
                          className={cn('h-3.5 w-3.5', c.pinned && 'fill-current')}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(c.id);
                          setEditText(c.body);
                        }}
                        aria-label="Edit note"
                        className="rounded p-1 text-brand-muted transition-colors hover:bg-brand-light hover:text-brand-navy"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteNote(c.id)}
                        disabled={busy}
                        aria-label="Delete note"
                        className="rounded p-1 text-brand-muted transition-colors hover:bg-brand-light hover:text-status-sold"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
