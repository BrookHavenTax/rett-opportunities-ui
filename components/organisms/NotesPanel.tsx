'use client';

import { useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
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

  // Newest first.
  const comments = [...listing.comments].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {listing.notes && (
        <div className="rounded-md border border-brand-border bg-brand-light px-3 py-2 text-sm text-brand-muted">
          <span className="font-semibold text-brand-navy">Import note:</span>{' '}
          {listing.notes}
        </div>
      )}

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
              className="rounded-lg border border-brand-border bg-white p-3"
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
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-brand-muted">
                      {formatDate(c.createdAt)}
                      {c.updatedAt !== c.createdAt ? ' · edited' : ''}
                    </span>
                    <div className="flex items-center gap-1">
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
