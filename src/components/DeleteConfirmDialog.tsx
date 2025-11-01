import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domainName: string;
  onConfirm: () => void;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  domainName,
  onConfirm,
}: DeleteConfirmDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const isConfirmed = confirmText === 'DELETE';

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setConfirmText('');
    }
    onOpenChange(newOpen);
  };

  const handleConfirm = () => {
    if (isConfirmed) {
      onConfirm();
      setConfirmText('');
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Domain</AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              You are about to permanently delete <strong>{domainName}</strong>.
              This action cannot be undone.
            </p>
            <div className="space-y-2">
              <Label htmlFor="confirm-delete">
                Type <strong>DELETE</strong> to confirm:
              </Label>
              <Input
                id="confirm-delete"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="font-mono"
                autoComplete="off"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isConfirmed}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete Domain
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
