import Image from 'next/image';
import { Head } from 'nextra/components';
import { getPageMap } from 'nextra/page-map';
import { Footer, Layout, Navbar } from 'nextra-theme-docs';
import type { ReactNode } from 'react';
import { FaXTwitter } from 'react-icons/fa6';
import { ThemeToggle } from './ThemeToggle';
import './globals.css';
import 'nextra-theme-docs/style.css';

export const metadata = {
  title: {
    default: 'Rig Docs',
    template: '%s | Rig Docs',
  },
  description:
    'Official documentation for Rig, a local-first desktop app for organizing agent SKILL files and tracking usage.',
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
};

const navbarLogo = (
  <span className='flex items-center gap-2 text-black dark:text-white'>
    <Image
      src='/icon.png'
      alt=''
      width={32}
      height={32}
      className='size-7 object-contain'
      priority
    />
    <b>Rig</b>
  </span>
);

const navbar = (
  <Navbar logo={navbarLogo} projectLink='https://github.com/builder-mafia/rig'>
    <a
      href='https://github.com/builder-mafia/rig/releases/latest'
      target='_blank'
      rel='noopener noreferrer'
      className='rig-pressable hidden min-h-9 items-center justify-center rounded-lg bg-neutral-900 px-3.5 text-xs font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5267f8] dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 sm:inline-flex'
    >
      Download
    </a>
    <ThemeToggle />
  </Navbar>
);

const footer = (
  <Footer>
    <div className='flex w-full flex-col items-center justify-between gap-5 text-sm md:flex-row'>
      <span>Rig is a local-first workspace for agent SKILL.md files.</span>
      <div className='flex items-center gap-5'>
        <a
          href='/docs'
          className='transition-colors hover:text-black dark:hover:text-white'
        >
          Docs
        </a>
        <a
          href='https://github.com/builder-mafia/rig/releases'
          target='_blank'
          rel='noopener noreferrer'
          className='transition-colors hover:text-black dark:hover:text-white'
        >
          Releases
        </a>
        <a
          href='https://github.com/builder-mafia/rig'
          target='_blank'
          rel='noopener noreferrer'
          className='transition-colors hover:text-black dark:hover:text-white'
        >
          GitHub
        </a>
        <a
          href='https://x.com/byeonggakyu'
          target='_blank'
          rel='noopener noreferrer'
          aria-label='X (Twitter)'
          className='text-current opacity-60 transition-opacity hover:opacity-100'
        >
          <FaXTwitter size={18} />
        </a>
      </div>
    </div>
  </Footer>
);

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pageMap = await getPageMap();

  return (
    <html lang='en' dir='ltr' suppressHydrationWarning>
      <Head>
        <link rel='icon' href='/icon.png' type='image/png' />
      </Head>
      <body>
        <Layout
          navbar={navbar}
          pageMap={pageMap}
          docsRepositoryBase='https://github.com/builder-mafia/rig/tree/main/apps/docs'
          footer={footer}
          darkMode={false}
          nextThemes={{ defaultTheme: 'light' }}
          search={false}
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}
