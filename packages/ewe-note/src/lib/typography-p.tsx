export default function P({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={`leading-7 [&:not(:first-child)]:mt-2 ${className}`}
      {...props}
    >
      {children}
    </p>
  );
}
