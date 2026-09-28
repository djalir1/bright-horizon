import { useEffect, useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ConfirmOpts = {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

let listener: ((opts: ConfirmOpts, resolve: (v: boolean) => void) => void) | null = null;

export function confirmDialog(opts: ConfirmOpts): Promise<boolean> {
  return new Promise((resolve) => {
    if (!listener) { resolve(window.confirm(opts.description || opts.title || 'Are you sure?')); return; }
    listener(opts, resolve);
  });
}

export function ConfirmDialogHost() {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOpts>({});
  const [resolver, setResolver] = useState<((v: boolean) => void) | null>(null);

  useEffect(() => {
    listener = (o, resolve) => {
      setOpts(o);
      setResolver(() => resolve);
      setOpen(true);
    };
    return () => { listener = null; };
  }, []);

  const handle = (v: boolean) => {
    setOpen(false);
    resolver?.(v);
    setResolver(null);
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) handle(false); }}>
      <AlertDialogContent className="bg-card border-gold/20">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-gold">
            {opts.title || 'Are you sure?'}
          </AlertDialogTitle>
          {opts.description && (
            <AlertDialogDescription className="text-foreground/70">
              {opts.description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => handle(false)}>
            {opts.cancelText || 'Cancel'}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => handle(true)}
            className={opts.destructive
              ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
              : 'bg-gold text-background hover:bg-gold-light'}
          >
            {opts.confirmText || 'Confirm'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}