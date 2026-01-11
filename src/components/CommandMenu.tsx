import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { 
  Search, 
  FileSearch, 
  ShieldCheck, 
  UserCheck, 
  Clock,
  LogOut,
  Activity,
  CreditCard
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

interface CommandMenuProps {
  onTabChange?: (tab: string) => void;
}

export function CommandMenu({ onTabChange }: CommandMenuProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { signOut } = useAuth();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          <CommandItem
            onSelect={() => runCommand(() => onTabChange?.("validate"))}
          >
            <Search className="mr-2 h-4 w-4" />
            <span>Validate NIN</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => onTabChange?.("bvn"))}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            <span>BVN Verification</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => onTabChange?.("clearance"))}
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            <span>IPE Clearance</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => onTabChange?.("nin-search"))}
          >
            <FileSearch className="mr-2 h-4 w-4" />
            <span>NIN Verification</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => onTabChange?.("personalization"))}
          >
            <UserCheck className="mr-2 h-4 w-4" />
            <span>Personalization</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => onTabChange?.("analytics"))}
          >
            <Activity className="mr-2 h-4 w-4" />
            <span>Analytics</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => runCommand(() => signOut())}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign Out</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
