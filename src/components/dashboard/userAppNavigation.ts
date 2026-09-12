import type { LucideIcon } from "lucide-react";
import {
  ArrowRightLeft,
  BookOpen,
  ClipboardList,
  CreditCard,
  Database,
  Key,
  Printer,
  Search,
  ShieldCheck,
  Sparkles,
  Smartphone,
  Tv,
  User,
  Wallet,
  Zap,
} from "lucide-react";

export interface UserNavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  description: string;
}

export interface UserNavGroup {
  id: string;
  label: string;
  items: UserNavItem[];
}

export const USER_NAV_GROUPS: UserNavGroup[] = [
  {
    id: "core",
    label: "Core Services",
    items: [
      {
        label: "Overview",
        path: "/dashboard/user",
        icon: Wallet,
        description: "Wallet, activity, and shortcuts",
      },
      {
        label: "Modification",
        path: "/dashboard/user/modification",
        icon: ClipboardList,
        description: "Fix or update details on an existing NIN record",
      },
      {
        label: "NIN Validation",
        path: "/dashboard/user/nin-validation",
        icon: Search,
        description: "Confirm a NIN is enrolled and valid",
      },
      {
        label: "NIN Verification",
        path: "/dashboard/user/nin-search",
        icon: ArrowRightLeft,
        description: "Look up identity details by NIN, phone, or demographics",
      },
      {
        label: "BVN Verification",
        path: "/dashboard/user/bvn",
        icon: CreditCard,
        description: "Verify BVN details and view history",
      },
      {
        label: "Clearance",
        path: "/dashboard/user/clearance",
        icon: ShieldCheck,
        description: "Resolve NIN enrollment exceptions and verify clearance",
      },
      {
        label: "Personalization",
        path: "/dashboard/user/personalization",
        icon: Sparkles,
        description: "Request NIN card personalization after enrollment",
      },
      {
        label: "Print NIN",
        path: "/dashboard/user/print-nin",
        icon: Printer,
        description: "Generate and print NIN slips",
      },
    ],
  },
  {
    id: "payments",
    label: "Payments",
    items: [
      {
        label: "Airtime",
        path: "/dashboard/user/airtime",
        icon: Smartphone,
        description: "Buy airtime and track delivery",
      },
      {
        label: "Mobile Data",
        path: "/dashboard/user/data",
        icon: Database,
        description: "Buy mobile data and track delivery",
      },
      {
        label: "TV Subscription",
        path: "/dashboard/user/tv",
        icon: Tv,
        description: "Verify smartcards and pay TV plans",
      },
      {
        label: "Electricity",
        path: "/dashboard/user/electricity",
        icon: Zap,
        description: "Verify meters and pay electricity bills",
      },
      {
        label: "Wallet",
        path: "/dashboard/user/wallet",
        icon: Wallet,
        description: "Top up, track balance, and review charges",
      },
    ],
  },
  {
    id: "account",
    label: "Account",
    items: [
      {
        label: "API Keys",
        path: "/dashboard/user/api-keys",
        icon: Key,
        description: "Generate and manage integration keys",
      },
      {
        label: "Profile",
        path: "/dashboard/user/profile",
        icon: User,
        description: "Account identity and activity summary",
      },
    ],
  },
];

export const USER_SECONDARY_LINK = {
  label: "API Docs",
  path: "/docs/api",
  icon: BookOpen,
  description: "Read the developer documentation",
};
