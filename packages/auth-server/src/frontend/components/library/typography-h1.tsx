export default function H1({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={`scroll-m-20 text-3xl font-bold tracking-tight lg:text-4xl ${className}`}
      {...props}
    >
      {children}
    </h1>
  );
}
