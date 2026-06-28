import * as React from "react";
import { toast as sonnerToast } from "@/components/ui/sonner";

type ToastVariant = "default" | "destructive";

type ToastInput = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: ToastVariant;
};

const toText = (value?: React.ReactNode): string | undefined => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return undefined;
};

type ToastHandle = {
  id: string | number;
  dismiss: () => void;
  update: (next: ToastInput) => ToastHandle;
};

function emitToast(input: ToastInput): ToastHandle {
  const title = toText(input.title) ?? "";
  const description = toText(input.description);
  const variant = input.variant ?? "default";

  const id =
    variant === "destructive"
      ? sonnerToast.error(title || description || "Error", {
          description: title && description ? description : undefined,
        })
      : sonnerToast(title || description || "Saved", {
          description: title && description ? description : undefined,
        });

  return {
    id,
    dismiss: () => sonnerToast.dismiss(id),
    update: (next: ToastInput) => {
      sonnerToast.dismiss(id);
      return emitToast(next);
    },
  };
}

function toast(input: ToastInput): ToastHandle {
  return emitToast(input);
}

function useToast() {
  return {
    toast,
    dismiss: (toastId?: string | number) => sonnerToast.dismiss(toastId),
    toasts: [],
  };
}

export { useToast, toast };
