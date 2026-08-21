import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Nanum_Myeongjo } from 'next/font/google'

const nanumMyeongjo = Nanum_Myeongjo({
  subsets: ['latin'],
  weight: ['400', '700', '800'],
  variable: '--font-nanum-myeongjo',
})

export default function App({ Component, pageProps }: AppProps) {
  return (
    <main className={nanumMyeongjo.variable}>
      <Component {...pageProps} />
    </main>
  );
}
