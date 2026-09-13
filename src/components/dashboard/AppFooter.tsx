import { Link } from "react-router-dom";

export function AppFooter() {
  return (
    <footer className="border-t border-slate-200/80 dark:border-slate-800 mt-auto bg-white/80 dark:bg-slate-950/80 backdrop-blur">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col gap-3 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            &copy; {new Date().getFullYear()} Sparklabid. Secure identity operations.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs sm:justify-end sm:text-sm text-slate-500 dark:text-slate-400">
            <Link to="/privacy" className="hover:text-primary transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-primary transition-colors">
              Terms
            </Link>
            <Link to="/docs/api" className="hover:text-primary transition-colors">
              API Docs
            </Link>
            <a href="mailto:support@sparkid.ng" className="hover:text-primary transition-colors">
              Support
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
