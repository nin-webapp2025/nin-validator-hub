import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

interface UseAutosaveOptions {
  key: string;
  onSave?: (data: any) => void;
  delay?: number;
}

export function useAutosave<T>(
  data: T,
  { key, onSave, delay = 2000 }: UseAutosaveOptions
) {
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const initialLoad = useRef(true);

  // Load saved data on mount
  useEffect(() => {
    const savedData = localStorage.getItem(`autosave_${key}`);
    if (savedData && onSave) {
      try {
        const parsed = JSON.parse(savedData);
        onSave(parsed);
      } catch (error) {
        console.error("Failed to load autosaved data:", error);
      }
    }
    initialLoad.current = false;
  }, [key, onSave]);

  // Autosave data on change
  useEffect(() => {
    if (initialLoad.current) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(`autosave_${key}`, JSON.stringify(data));
      } catch (error) {
        console.error("Failed to autosave:", error);
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, key, delay, toast]);

  const clearAutosave = () => {
    localStorage.removeItem(`autosave_${key}`);
  };

  return { clearAutosave };
}
