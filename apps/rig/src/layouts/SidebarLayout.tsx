import { cn } from '@allin/ui';

export const SidebarLayout = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <aside
      className={cn(
        'flex min-h-0 w-[22rem] shrink-0 flex-col border-r bg-sidebar/70 max-lg:w-80 max-md:w-full',
        className,
      )}
    >
      {children}
    </aside>
  );
};
