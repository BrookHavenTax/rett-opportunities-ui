'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { NotesPanel } from '@/components/organisms/NotesPanel';
import type { Listing } from '@/types/listing';

export interface NotesDialogProps {
  listing: Listing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (listing: Listing) => void;
}

export function NotesDialog({
  listing,
  open,
  onOpenChange,
  onChange,
}: NotesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto scrollbar-thin">
        {listing && (
          <>
            <DialogHeader>
              <DialogTitle>Notes</DialogTitle>
              <DialogDescription>
                {listing.ownerName} · {listing.city}, {listing.state}
              </DialogDescription>
            </DialogHeader>
            <NotesPanel listing={listing} onChange={onChange} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
