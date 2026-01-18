import { cn } from "@/lib/utils";

type LoadingScreenProps = {
  className?: string;
  message?: string;
};

export function LoadingScreen({ className, message = "Loading..." }: LoadingScreenProps) {
  return (
    <div className={cn("flex flex-1 flex-col items-center justify-center gap-4 py-12", className)}>
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted-foreground/30 border-t-muted-foreground" />
      <span className="text-sm text-muted-foreground">{message}</span>
    </div>
  );
}
