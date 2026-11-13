import { ArrowLeft } from "lucide-react";
import Link from "next/link";

type PageHeaderProps = {
  title: string;
  description?: React.ReactNode;
  /** Buttons on the right, e.g. "New order". */
  actions?: React.ReactNode;
  /** A "← Back to …" link above the title, for pages one level deep. */
  back?: { href: string; label: string };
};

/** The same title area on every page, so the app feels like one product. */
export function PageHeader({ title, description, actions, back }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-3">
      {back && (
        <Link
          href={back.href}
          className="-ml-1 inline-flex min-h-11 w-fit items-center gap-1.5 rounded-lg px-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">{title}</h1>
          {description && (
            <p className="mt-1.5 max-w-2xl text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
      </div>
    </div>
  );
}
