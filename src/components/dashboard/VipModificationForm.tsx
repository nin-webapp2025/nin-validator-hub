import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Crown, Send, Loader2 } from "lucide-react";
import type { ModificationType } from "@/types/modification";

const formSchema = z.object({
  nin: z.string().regex(/^\d{11}$/, "NIN must be exactly 11 digits"),
  modification_type: z.enum(["change_name", "change_phone", "change_address", "change_dob"] as const),
  current_value: z.string().optional(),
  requested_value: z.string().min(1, "Please provide the new value"),
  reason: z.string().min(20, "Please provide a detailed reason (minimum 20 characters)"),
});

type FormValues = z.infer<typeof formSchema>;

const MODIFICATION_LABELS: Record<ModificationType, string> = {
  change_name: "Change of Name",
  change_phone: "Change of Phone Number",
  change_address: "Change of Address",
  change_dob: "Change of Date of Birth",
};

/**
 * VIP Modification Request Form
 * Allows VIP users to submit NIN modification requests
 * Requests go to admin for review and assignment to staff
 */
export function VipModificationForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nin: "",
      modification_type: "change_name",
      current_value: "",
      requested_value: "",
      reason: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to submit a modification request",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("nin_modification_requests")
        .insert({
          user_id: user.id,
          nin: values.nin,
          modification_type: values.modification_type,
          current_value: values.current_value || null,
          requested_value: values.requested_value,
          reason: values.reason,
          status: "pending",
          priority: "medium",
        });

      if (error) throw error;

      toast({
        title: "✅ Request Submitted Successfully",
        description: "Your modification request has been submitted and is pending admin review.",
        className: "bg-gradient-to-r from-amber-500 to-yellow-600 text-black border-amber-600",
      });

      form.reset();
    } catch (error) {
      console.error("Error submitting modification request:", error);
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Failed to submit request",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-purple-900/30 backdrop-blur-lg border-amber-500/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-400" />
          <CardTitle className="bg-gradient-to-r from-amber-300 to-yellow-200 bg-clip-text text-transparent">
            NIN Modification Request
          </CardTitle>
        </div>
        <CardDescription className="text-purple-200">
          Submit a request to modify your NIN details. Your request will be reviewed by an admin and assigned to staff for processing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="nin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-amber-100">National Identification Number (NIN)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="12345678901"
                      {...field}
                      className="bg-purple-950/50 border-amber-500/30 text-white placeholder:text-purple-300"
                    />
                  </FormControl>
                  <FormDescription className="text-purple-300">
                    Enter your 11-digit NIN
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="modification_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-amber-100">Modification Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-purple-950/50 border-amber-500/30 text-white">
                        <SelectValue placeholder="Select modification type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(MODIFICATION_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-purple-300">
                    Select the type of modification you're requesting
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="current_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-amber-100">Current Value (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., John Doe"
                      {...field}
                      className="bg-purple-950/50 border-amber-500/30 text-white placeholder:text-purple-300"
                    />
                  </FormControl>
                  <FormDescription className="text-purple-300">
                    The current value on your NIN record (if known)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requested_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-amber-100">New/Requested Value</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Jane Doe"
                      {...field}
                      className="bg-purple-950/50 border-amber-500/30 text-white placeholder:text-purple-300"
                    />
                  </FormControl>
                  <FormDescription className="text-purple-300">
                    The new value you're requesting
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-amber-100">Reason for Modification</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide a detailed explanation for why this modification is necessary..."
                      {...field}
                      rows={4}
                      className="bg-purple-950/50 border-amber-500/30 text-white placeholder:text-purple-300"
                    />
                  </FormControl>
                  <FormDescription className="text-purple-300">
                    Minimum 20 characters - be specific and detailed
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting Request...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit Modification Request
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
