import { clsx } from 'clsx';
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
} from 'react';
import { LoaderCircle } from 'lucide-react';

export function cx(...classes: Array<string | false | null | undefined>) {
  return clsx(classes);
}

export function Button({
  className,
  tone = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
}) {
  return (
    <button
      className={cx(
        'inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        tone === 'primary' &&
          'bg-primary text-primary-foreground hover:opacity-90',
        tone === 'secondary' &&
          'bg-secondary text-secondary-foreground hover:opacity-90',
        tone === 'ghost' && 'hover:bg-accent hover:text-accent-foreground',
        tone === 'outline' &&
          'border bg-background hover:bg-accent hover:text-accent-foreground',
        tone === 'danger' &&
          'bg-destructive text-destructive-foreground hover:opacity-90',
        className
      )}
      {...props}
    />
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(
        'flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        props.className
      )}
      {...props}
    />
  );
}

export function Label(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cx('text-sm font-medium text-foreground', props.className)}
      {...props}
    />
  );
}

export function Card(props: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        'rounded-xl border bg-card text-card-foreground shadow-sm',
        props.className
      )}
      {...props}
    />
  );
}

export function Badge({
  className,
  tone = 'secondary',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: 'secondary' | 'outline' }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold',
        tone === 'secondary' &&
          'border-transparent bg-secondary text-secondary-foreground',
        tone === 'outline' && 'border-border text-foreground',
        className
      )}
      {...props}
    />
  );
}

export function InlineSpinner({ className }: { className?: string }) {
  return <LoaderCircle className={cx('h-4 w-4 animate-spin', className)} />;
}

export function LoadingPanel({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="mx-auto max-w-lg py-12 text-center">
      <div className="mb-4 flex justify-center">
        <InlineSpinner className="h-12 w-12 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
