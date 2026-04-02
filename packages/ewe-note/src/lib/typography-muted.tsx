import { cn } from '../utils';

export default function Muted({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)}>
      {' '}
      {children}
    </p>
  );
}
