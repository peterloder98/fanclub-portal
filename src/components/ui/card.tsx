import { cn } from "@/lib/cn";
import type { ComponentProps } from "react";

export function Card(props: ComponentProps<"div">) {
  const { className, ...rest } = props;
  return (
    <div
      className={cn(
        "rounded-2xl border bg-white shadow-sm shadow-slate-900/5",
        className,
      )}
      {...rest}
    />
  );
}

export function CardHeader(props: ComponentProps<"div">) {
  const { className, ...rest } = props;
  return <div className={cn("px-5 pt-5", className)} {...rest} />;
}

export function CardTitle(props: ComponentProps<"h3">) {
  const { className, ...rest } = props;
  return (
    <h3
      className={cn("text-sm font-semibold text-slate-900", className)}
      {...rest}
    />
  );
}

export function CardDescription(props: ComponentProps<"p">) {
  const { className, ...rest } = props;
  return (
    <p className={cn("mt-1 text-sm text-slate-600", className)} {...rest} />
  );
}

export function CardContent(props: ComponentProps<"div">) {
  const { className, ...rest } = props;
  return <div className={cn("px-5 pb-5", className)} {...rest} />;
}

