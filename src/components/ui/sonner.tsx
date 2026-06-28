import { useTheme } from "next-themes";
import { Toaster as Sonner, toast as sonnerToast } from "sonner";

import { reportClientToastError } from "@/lib/clientErrorReports";

const toText = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return undefined;
};

const toast = Object.assign(
  ((...args: Parameters<typeof sonnerToast>) => sonnerToast(...args)) as typeof sonnerToast,
  sonnerToast
);

toast.error = ((message: Parameters<typeof sonnerToast.error>[0], data?: Parameters<typeof sonnerToast.error>[1]) => {
  const title = toText(message) ?? toText(data?.description) ?? "Client error";
  const description = toText(data?.description);
  void reportClientToastError({
    title,
    description,
    metadata: {
      toastVariant: "error",
      source: "sonner.error",
    },
  });

  return sonnerToast.error(message, data);
}) as typeof sonnerToast.error;

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border group-[.toaster]:border-primary/30 group-[.toaster]:shadow-lg group-[.toaster]:shadow-primary/10",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success: "group-[.toaster]:border-primary/30",
          error: "group-[.toaster]:border-destructive/30",
          warning: "group-[.toaster]:border-status-warning/30",
          info: "group-[.toaster]:border-primary/30",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
