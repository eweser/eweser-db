export interface BlockquoteProps
  extends React.HTMLAttributes<HTMLQuoteElement> {
  children: React.ReactNode;
}

export default function Blockquote({ children, className }: BlockquoteProps) {
  return (
    <blockquote className={`mt-6 border-l-2 pl-6 italic ${className}`}>
      {children}
    </blockquote>
  );
}
