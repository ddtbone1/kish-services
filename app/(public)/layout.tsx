export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Shared public navbar will go here */}
      {children}
      {/* Shared public footer will go here */}
    </>
  );
}
