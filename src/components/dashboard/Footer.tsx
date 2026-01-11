import { Github, Twitter, Linkedin, Mail, Shield, Zap, Lock, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 border-t border-slate-200/80 dark:border-slate-800 mt-auto overflow-hidden">
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/20 via-transparent to-transparent dark:from-blue-950/20 pointer-events-none" />
      
      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 sm:gap-12 mb-8 sm:mb-12">
          {/* Brand Section - Takes more space */}
          <div className="lg:col-span-5">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <img 
                src="/logo.svg" 
                alt="SparkID" 
                className="h-10 sm:h-14 w-auto dark:brightness-110"
              />
              <Badge variant="outline" className="text-xs font-semibold px-2 sm:px-3 py-0.5 sm:py-1 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
                Enterprise
              </Badge>
            </div>
            <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 max-w-md leading-relaxed mb-4 sm:mb-6 font-medium">
              Nigeria's most trusted platform for secure identity verification and validation services.
            </p>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md leading-relaxed mb-4 sm:mb-6">
              Powered by enterprise-grade technology, we provide lightning-fast NIN validation, 
              clearance services, and personalization with bank-level security standards.
            </p>
            
            {/* Trust Badges */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6 max-w-md">
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-slate-600 dark:text-slate-400">
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center">
                  <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="font-medium text-xs">Bank-Level Security</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-slate-600 dark:text-slate-400">
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-green-50 dark:bg-green-950/50 flex items-center justify-center">
                  <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="font-medium text-xs">Instant Results</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-slate-600 dark:text-slate-400">
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center">
                  <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="font-medium text-xs">GDPR Compliant</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-slate-600 dark:text-slate-400">
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-orange-50 dark:bg-orange-950/50 flex items-center justify-center">
                  <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <span className="font-medium text-xs">99.9% Uptime</span>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-2 sm:gap-3">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Visit our GitHub"
                className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:border-blue-200 dark:hover:border-blue-800 border border-transparent flex items-center justify-center transition-all duration-200 hover:scale-105"
              >
                <Github className="h-4 w-4 sm:h-5 sm:w-5 text-slate-700 dark:text-slate-300" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow us on Twitter"
                className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:border-blue-200 dark:hover:border-blue-800 border border-transparent flex items-center justify-center transition-all duration-200 hover:scale-105"
              >
                <Twitter className="h-4 w-4 sm:h-5 sm:w-5 text-slate-700 dark:text-slate-300" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Connect on LinkedIn"
                className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:border-blue-200 dark:hover:border-blue-800 border border-transparent flex items-center justify-center transition-all duration-200 hover:scale-105"
              >
                <Linkedin className="h-4 w-4 sm:h-5 sm:w-5 text-slate-700 dark:text-slate-300" />
              </a>
              <a
                href="mailto:support@sparkid.ng"
                aria-label="Email support"
                className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:border-blue-200 dark:hover:border-blue-800 border border-transparent flex items-center justify-center transition-all duration-200 hover:scale-105"
              >
                <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-slate-700 dark:text-slate-300" />
              </a>
            </div>
          </div>

          {/* Services */}
          <div className="lg:col-span-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-5 uppercase tracking-wider">Services</h4>
            <ul className="space-y-3.5">
              <li>
                <Link to="#" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium flex items-center gap-2 group">
                  <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-blue-600 dark:group-hover:bg-blue-400 transition-colors" />
                  NIN Validation
                </Link>
              </li>
              <li>
                <Link to="#" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium flex items-center gap-2 group">
                  <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-blue-600 dark:group-hover:bg-blue-400 transition-colors" />
                  Clearance Services
                </Link>
              </li>
              <li>
                <Link to="#" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium flex items-center gap-2 group">
                  <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-blue-600 dark:group-hover:bg-blue-400 transition-colors" />
                  Personalization
                </Link>
              </li>
              <li>
                <Link to="#" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium flex items-center gap-2 group">
                  <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-blue-600 dark:group-hover:bg-blue-400 transition-colors" />
                  NIN Search
                </Link>
              </li>
              <li>
                <Link to="#" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium flex items-center gap-2 group">
                  <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-blue-600 dark:group-hover:bg-blue-400 transition-colors" />
                  Bulk Processing
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="lg:col-span-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-5 uppercase tracking-wider">Company</h4>
            <ul className="space-y-3.5">
              <li>
                <Link to="#" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium flex items-center gap-2 group">
                  <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-blue-600 dark:group-hover:bg-blue-400 transition-colors" />
                  About Us
                </Link>
              </li>
              <li>
                <Link to="#" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium flex items-center gap-2 group">
                  <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-blue-600 dark:group-hover:bg-blue-400 transition-colors" />
                  Careers
                </Link>
              </li>
              <li>
                <Link to="#" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium flex items-center gap-2 group">
                  <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-blue-600 dark:group-hover:bg-blue-400 transition-colors" />
                  Blog & News
                </Link>
              </li>
              <li>
                <Link to="#" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium flex items-center gap-2 group">
                  <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-blue-600 dark:group-hover:bg-blue-400 transition-colors" />
                  Partners
                </Link>
              </li>
              <li>
                <Link to="#" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium flex items-center gap-2 group">
                  <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-blue-600 dark:group-hover:bg-blue-400 transition-colors" />
                  Contact Sales
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources & Legal */}
          <div className="lg:col-span-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-5 uppercase tracking-wider">Resources</h4>
            <ul className="space-y-3.5 mb-6">
              <li>
                <Link to="#" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium flex items-center gap-2 group">
                  <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-blue-600 dark:group-hover:bg-blue-400 transition-colors" />
                  API Reference
                </Link>
              </li>
              <li>
                <Link to="#" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium flex items-center gap-2 group">
                  <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-blue-600 dark:group-hover:bg-blue-400 transition-colors" />
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="#" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium flex items-center gap-2 group">
                  <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-blue-600 dark:group-hover:bg-blue-400 transition-colors" />
                  System Status
                </Link>
              </li>
            </ul>
            
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 uppercase tracking-wider">Legal</h4>
            <ul className="space-y-3.5">
              <li>
                <Link to="#" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium flex items-center gap-2 group">
                  <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-blue-600 dark:group-hover:bg-blue-400 transition-colors" />
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="#" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium flex items-center gap-2 group">
                  <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-blue-600 dark:group-hover:bg-blue-400 transition-colors" />
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="#" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium flex items-center gap-2 group">
                  <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-blue-600 dark:group-hover:bg-blue-400 transition-colors" />
                  Data Protection
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-10 border-t border-slate-200/80 dark:border-slate-800">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                © {currentYear} <span className="font-bold text-slate-900 dark:text-slate-100">SparkID</span>. All rights reserved.
              </p>
              <Badge variant="outline" className="text-xs px-2 py-0.5 bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300">
                Operational
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-500 text-center lg:text-right">
              Built with ❤️ in Nigeria • Serving enterprises globally
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
