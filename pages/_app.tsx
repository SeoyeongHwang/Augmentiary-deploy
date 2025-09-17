import "@/styles/globals.css";
import type { AppProps } from "next/app";
// import { IBM_Plex_Sans_KR } from 'next/font/google'
import { Bitter } from 'next/font/google'

// const ibmPlexSansKR = IBM_Plex_Sans_KR({
//   subsets: ['latin'],
//   weight: ['400', '500', '700'],
// })

const bitter = Bitter({
  subsets: ['latin'],
  weight: ['300', '600'],
})

export default function App({ Component, pageProps }: AppProps) {
  return (
    <main className={`${bitter.className} font-serif`}>
      <Component {...pageProps} />
    </main>
  );
}
