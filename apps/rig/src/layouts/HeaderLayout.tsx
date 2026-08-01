export const HeaderLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <header className='z-20 flex h-14 shrink-0 items-center border-b bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/72'>
      {children}
    </header>
  );
};
