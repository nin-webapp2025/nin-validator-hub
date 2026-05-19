import type { LucideIcon } from "lucide-react";
import {
  ArrowRightLeft,
  BookOpen,
  CreditCard,
  Database,
  Key,
  Printer,
  Search,
  ShieldCheck,
  Sparkles,
  Smartphone,
  User,
  Wallet,
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
        label: "NIN Validation",
        path: "/dashboard/user/nin-validation",
        icon: Search,
        description: "Submit and track NIN checks",
      },
      {
        label: "NIN Search",
        path: "/dashboard/user/nin-search",
        icon: ArrowRightLeft,
        description: "Search by NIN, phone, or demographics",
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
        description: "Run approval and clearance checks",
      },
      {
        label: "Personalization",
        path: "/dashboard/user/personalization",
        icon: Sparkles,
        description: "Submit personalization workflows",
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
        description: "Buy airtime when provider integration is ready",
      },
      {
        label: "Mobile Data",
        path: "/dashboard/user/data",
        icon: Database,
        description: "Manage data bundle purchases",
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

export const USER_QUICK_ACTIONS = [
  "/dashboard/user/nin-validation",
  "/dashboard/user/nin-search",
  "/dashboard/user/bvn",
  "/dashboard/user/wallet",
  "/dashboard/user/api-keys",
];
