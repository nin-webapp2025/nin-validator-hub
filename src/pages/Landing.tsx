import { useNavigate } from "react-router-dom";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  CheckCircle, 
  Zap, 
  Lock, 
  Users, 
  TrendingUp,
  ShieldCheck,
  CreditCard,
  FileSearch,
  ArrowRight,
  Sparkles,
  BarChart3,
  Moon,
  Sun,
  Github,
  Twitter,
  Linkedin,
  Mail,
  BookOpen,
  Menu
} from "lucide-react";
import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";

export default function Landing() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const features = [
    {
      icon: ShieldCheck,
      title: "NIN Validation",
      description: "Instantly validate National Identification Numbers and retrieve verified identity data including name, date of birth, phone number, and photo.",
    },
    {
      icon: CreditCard,
      title: "BVN Verification",
      description: "Verify Bank Verification Numbers instantly and retrieve identity details for banking and financial workflows.",
    },
    {
      icon: FileSearch,
      title: "NIN Personalization",
      description: "Generate personalized NIN slips and track each request from submission to completion.",
    },
    {
      icon: Lock,
      title: "Batch Processing",
      description: "Upload CSV files to validate up to 100 NINs at once. Track progress in real-time and export results instantly for bulk verification needs.",
    },
    {
      icon: Zap,
      title: "Instant Results",
      description: "Get verification results in seconds with our lightning-fast platform. Real-time processing with 99.9% uptime and instant responses.",
    },
    {
      icon: BarChart3,
      title: "Usage Analytics",
      description: "Monitor usage, track validation activity, and review detailed account history in one place.",
    },
  ];

  const stats = [
    { value: "99.9%", label: "Uptime", icon: TrendingUp },
    { value: "50K+", label: "Validations", icon: CheckCircle },
    { value: "<500ms", label: "Response Time", icon: Zap },
    { value: "24/7", label: "Support", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-slate-50 dark:from-slate-950 dark:via-amber-950/10 dark:to-slate-950">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <img 
              src="/logo.svg" 
              alt="SparklabID Identity Verification"
              className="h-10 w-auto dark:brightness-110 cursor-pointer"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            />
            
            <div className="hidden md:flex items-center gap-8">
              <a 
                href="#features" 
                className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
              >
                Features
              </a>
              <a 
                href="#services" 
                className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
              >
                Services
              </a>
              <a 
                href="#about" 
                className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
              >
                About
              </a>
              <Link 
                to="/docs/api" 
                className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
              >
                API Docs
              </Link>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-9 w-9 rounded-lg"
              >
                {theme === "light" ? (
                  <Moon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                ) : (
                  <Sun className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                )}
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => navigate("/auth")}
                className="hidden sm:inline-flex text-slate-600 dark:text-slate-400"
              >
                Login
              </Button>
              <Button 
                onClick={() => navigate("/auth")}
                className="hidden sm:inline-flex bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              {/* Mobile bottom sheet menu */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden h-9 w-9 rounded-lg">
                    <Menu className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-2xl pb-8">
                  <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-slate-300 dark:bg-slate-600 mb-6 mt-2" />
                  <nav className="flex flex-col gap-2 mb-6">
                    <SheetClose asChild>
                      <a href="#features" className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Features
                      </a>
                    </SheetClose>
                    <SheetClose asChild>
                      <a href="#services" className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <Shield className="h-5 w-5 text-primary" />
                        Services
                      </a>
                    </SheetClose>
                    <SheetClose asChild>
                      <a href="#about" className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <Users className="h-5 w-5 text-primary" />
                        About
                      </a>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link to="/docs/api" className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <BookOpen className="h-5 w-5 text-primary" />
                        API Docs
                      </Link>
                    </SheetClose>
                  </nav>
                  <div className="flex flex-col gap-3 px-4">
                    <Button 
                      variant="outline" 
                      onClick={() => navigate("/auth")}
                      className="w-full py-3 text-base rounded-xl"
                    >
                      Login
                    </Button>
                    <Button 
                      onClick={() => navigate("/auth")}
                      className="w-full py-3 text-base rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 sm:pt-12 sm:pb-20 lg:pt-16 lg:pb-32">
        <div className="text-center max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-3 duration-700">
          <Badge className="mb-6 px-4 py-1.5 bg-primary/10 text-primary border-primary/20">
            <Sparkles className="h-3 w-3 mr-1.5" />
            Trusted Identity Verification
          </Badge>
          
          <h1 className="text-3xl sm:text-5xl lg:text-7xl font-bold text-slate-900 dark:text-slate-100 mb-4 sm:mb-6 tracking-tight">
            Verify NIN & BVN
            <span className="block mt-1 sm:mt-2 bg-gradient-to-r from-amber-600 to-amber-400 bg-clip-text text-transparent">
              in Real-Time
            </span>
          </h1>
          
          <p className="text-base sm:text-xl text-slate-600 dark:text-slate-400 mb-6 sm:mb-10 max-w-2xl mx-auto leading-relaxed">
            Instantly verify National Identification Numbers (NIN) and Bank Verification Numbers (BVN). 
            Check clearance status, validate identity data, and personalize verification slips. Fast, secure, and reliable.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-white px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              Start Validating Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-6 text-lg rounded-xl border-2"
            >
              <BookOpen className="mr-2 h-5 w-5" />
              Learn More
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mt-10 sm:mt-20">
            {stats.map((stat) => (
              <div key={stat.label} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <CardContent className="p-3 sm:p-6 text-center">
                    <stat.icon className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 sm:mb-3 text-primary" />
                    <p className="text-xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                      {stat.value}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {stat.label}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 scroll-mt-16">
        <div className="text-center mb-16">
          <Badge className="mb-4 px-4 py-1.5 bg-primary/10 text-primary border-primary/20">
            Features
          </Badge>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Complete Identity Verification Suite
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Powerful tools and features designed for businesses of all sizes
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div key={feature.title} className="transition-transform duration-200 hover:-translate-y-2">
              <Card className="h-full border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-lg dark:hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="rounded-xl bg-primary/10 p-3 w-fit mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section id="services" className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 scroll-mt-16">
        <div>
          <Card className="bg-gradient-to-br from-slate-900 via-amber-800 to-amber-500 border-0 shadow-2xl">
            <CardContent className="p-6 sm:p-12 lg:p-16 text-center">
              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6">
                Ready to get started?
              </h2>
              <p className="text-base sm:text-xl text-amber-50/90 mb-6 sm:mb-10 max-w-2xl mx-auto">
                Join thousands of businesses using SparklabID for secure identity verification
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  onClick={() => navigate("/auth")}
                  className="bg-white text-primary hover:bg-amber-50 px-8 py-6 text-lg rounded-xl shadow-lg"
                >
                  Create Free Account
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/auth")}
                  className="border-2 border-white text-white hover:bg-white/10 px-8 py-6 text-lg rounded-xl"
                >
                  <Shield className="mr-2 h-5 w-5" />
                  Explore Features
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer id="about" className="border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 mt-20 scroll-mt-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand Section */}
            <div className="col-span-1 md:col-span-2">
              <img 
                src="/logo.svg" 
                alt="SparklabID"
                className="h-12 w-auto mb-4 dark:brightness-110"
              />
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md leading-relaxed mb-4">
                SparklabID provides secure and reliable identity verification services for Nigerian
                National Identification Numbers (NIN) and Bank Verification Numbers (BVN) with enterprise-grade technology.
              </p>
              <div className="flex items-center gap-3">
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Visit our GitHub"
                  className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
                >
                  <Github className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Follow us on Twitter"
                  className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
                >
                  <Twitter className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Connect on LinkedIn"
                  className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
                >
                  <Linkedin className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                </a>
                <a
                  href="mailto:support@sparkid.ng"
                  aria-label="Email support"
                  className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
                >
                  <Mail className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                </a>
              </div>
            </div>

            {/* Services */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Services</h4>
              <ul className="space-y-3">
                <li>
                  <a href="#features" className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">
                    NIN Validation
                  </a>
                </li>
                <li>
                  <a href="#features" className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">
                    BVN Verification
                  </a>
                </li>
                <li>
                  <a href="#features" className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">
                    Clearance Services
                  </a>
                </li>
                <li>
                  <a href="#features" className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">
                    Identity Search
                  </a>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Company</h4>
              <ul className="space-y-3">
                <li>
                  <a href="#about" className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">
                    About Us
                  </a>
                </li>
                <li>
                  <Link to="/auth" className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">
                    Get Started
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-slate-200/80 dark:border-slate-800">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                © {new Date().getFullYear()} SparklabID. All rights reserved.
              </p>
              <div className="flex items-center gap-6">
                <Link to="/docs/api" className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">
                  API Documentation
                </Link>
                <a href="#services" className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">
                  Help Center
                </a>
                <a href="#about" className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">
                  Support
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
