import { cn } from '@allin/ui';

export const ContentLayout = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <section
      className={cn('flex min-w-0 flex-1 flex-col bg-background', className)}
    >
      {children}
    </section>
  );
};
