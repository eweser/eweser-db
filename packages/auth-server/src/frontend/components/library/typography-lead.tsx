export default function Lead({ children }: { children: React.ReactNode }) {
  return <p className={`text-xl text-muted-foreground`}>{children}</p>;
}
