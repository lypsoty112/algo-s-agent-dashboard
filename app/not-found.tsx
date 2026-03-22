import Image from "next/image";
import Link from "next/link";
import logo from "@/images/algo-s-logo.png";
import { SystemStatsPanel } from "@/components/system-stats";

export default function NotFound() {
  return (
    <div className="min-h-screen flex">
      {/* Left — 404 panel */}
      <div className="flex flex-col justify-center items-center w-full lg:w-[42%] bg-background px-8 py-12">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <Image src={logo} alt="algo-s logo" width={44} height={44} className="rounded-xl" />
            <div>
              <div className="text-lg font-semibold tracking-tight leading-none text-zinc-900">
                algo-s
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">Investor Dashboard</div>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <p className="text-sm font-mono text-zinc-400 mb-2">404</p>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 leading-tight">
              Page not found
            </h1>
            <p className="text-zinc-500 text-sm mt-2">
              The page you&apos;re looking for doesn&apos;t exist or has been moved.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Right — system stats panel */}
      <SystemStatsPanel />
    </div>
  );
}
