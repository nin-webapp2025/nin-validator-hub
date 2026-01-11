import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
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
  BookOpen
} from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const features = [
    {
      icon: ShieldCheck,
      title: "NIN Validation",
      description: "Instantly validate National Identification Numbers and retrieve verified identity data including name, date of birth, phone number, and photo.",
      color: "bg-blue-500",
      lightBg: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      icon: CreditCard,
      title: "Clearance Verification",
      description: "Check NIN clearance status for employment, visa processing, and background verification. Get instant clearance reports with tracking IDs.",
      color: "bg-emerald-500",
      lightBg: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      icon: FileSearch,
      title: "NIN Personalization",
      description: "Generate personalized NIN slips with custom data. Perfect for creating identification documents with tracking and status monitoring.",
      color: "bg-purple-500",
      lightBg: "bg-purple-50 dark:bg-purple-950/30",
    },
    {
      icon: Lock,
      title: "Batch Processing",
      description: "Upload CSV files to validate up to 100 NINs at once. Track progress in real-time and export results instantly for bulk verification needs.",
      color: "bg-amber-500",
      lightBg: "bg-amber-50 dark:bg-amber-950/30",
    },
    {
      icon: Zap,
      title: "Instant Results",
      description: "Get verification results in seconds with our lightning-fast platform. Real-time processing with 99.9% uptime and instant responses.",
      color: "bg-rose-500",
      lightBg: "bg-rose-50 dark:bg-rose-950/30",
    },
    {
      icon: BarChart3,
      title: "Usage Analytics",
      description: "Monitor your usage, track validation success rates, and view detailed history with charts. Stay on top of your verification operations.",
      color: "bg-indigo-500",
      lightBg: "bg-indigo-50 dark:bg-indigo-950/30",
    },
  ];

  const stats = [
    { value: "99.9%", label: "Uptime", icon: TrendingUp },
    { value: "50K+", label: "Validations", icon: CheckCircle },
    { value: "<500ms", label: "Response Time", icon: Zap },
    { value: "24/7", label: "Support", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-950">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <img 
              src="/logo.svg" 
              alt="SparkLab Technology Limited" 
              className="h-10 w-auto dark:brightness-110 cursor-pointer"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            />
            
            <div className="hidden md:flex items-center gap-8">
              <a 
                href="#features" 
                className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Features
              </a>
              <a 
                href="#services" 
                className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Services
              </a>
              <a 
                href="#about" 
                className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                About
              </a>
            </div>

            <div className="flex items-center gap-3">
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
                className="text-slate-600 dark:text-slate-400"
              >
                Login
              </Button>
              <Button 
                onClick={() => navigate("/auth")}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-20 lg:pt-16 lg:pb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-4xl mx-auto"
        >
          <Badge className="mb-6 px-4 py-1.5 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
            <Sparkles className="h-3 w-3 mr-1.5" />
            Trusted Identity Verification
          </Badge>
          
          <h1 className="text-5xl lg:text-7xl font-bold text-slate-900 dark:text-slate-100 mb-6 tracking-tight">
            Validate Nigerian NINs
            <span className="block mt-2 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              in Real-Time
            </span>
          </h1>
          
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Instantly verify National Identification Numbers (NIN), check clearance status, 
            and personalize NIN slips. Fast, secure, and easy-to-use web portal.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all"
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-20">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <CardContent className="p-6 text-center">
                    <stat.icon className="h-8 w-8 mx-auto mb-3 text-blue-600" />
                    <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                      {stat.value}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {stat.label}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 scroll-mt-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <Badge className="mb-4 px-4 py-1.5 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
            Features
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Complete NIN Verification Suite
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Powerful tools and features designed for businesses of all sizes
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -8, transition: { duration: 0.2 } }}
            >
              <Card className="h-full border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-lg dark:hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className={`${feature.lightBg} rounded-xl p-3 w-fit mb-4`}>
                    <feature.icon className={`h-6 w-6 ${feature.color.replace('bg-', 'text-')}`} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section id="services" className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 scroll-mt-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-0 shadow-2xl">
            <CardContent className="p-12 lg:p-16 text-center">
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
                Ready to get started?
              </h2>
              <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
                Join thousands of businesses using SparkLab for secure identity verification
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button 
                  size="lg"
                  onClick={() => navigate("/auth")}
                  className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-6 text-lg rounded-xl shadow-lg"
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
        </motion.div>
      </section>

      {/* Footer */}
      <footer id="about" className="border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 mt-20 scroll-mt-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand Section */}
            <div className="col-span-1 md:col-span-2">
              <img 
                src="/logo.svg" 
                alt="SparkLab Technology Limited" 
                className="h-12 w-auto mb-4 dark:brightness-110"
              />
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md leading-relaxed mb-4">
                Providing secure and reliable identity verification services for Nigerian 
                National Identification Numbers and Bank Verification Numbers with enterprise-grade technology.
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
                  href="mailto:support@sparklab.com"
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
                  <a href="#features" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    NIN Validation
                  </a>
                </li>
                <li>
                  <a href="#features" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    BVN Verification
                  </a>
                </li>
                <li>
                  <a href="#features" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    Clearance Services
                  </a>
                </li>
                <li>
                  <a href="#features" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
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
                  <a href="#about" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    About Us
                  </a>
                </li>
                <li>
                  <Link to="/auth" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    Get Started
                  </Link>
                </li>
                <li>
                  <a href="#features" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#features" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-slate-200/80 dark:border-slate-800">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                © {new Date().getFullYear()} SparkLab Technology Limited. All rights reserved.
              </p>
              <div className="flex items-center gap-6">
                <a href="#features" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Documentation
                </a>
                <a href="#services" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Help Center
                </a>
                <a href="#about" className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
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
