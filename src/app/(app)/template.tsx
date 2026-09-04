// Remonta a cada navegação → entrada suave das telas
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-rise">{children}</div>;
}
