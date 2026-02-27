import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../components/ui/form";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Button } from "../components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { insertReferralRequestSchema } from "@shared/schema";
import { isUnauthorizedError } from "../lib/authUtils";
import { X } from "lucide-react";
import type { z } from "zod";

type ReferralRequestFormData = Omit<z.infer<typeof insertReferralRequestSchema>, 'seekerId'>;

interface ReferralRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  referral: any;
}

export default function ReferralRequestModal({ isOpen, onClose, referral }: ReferralRequestModalProps) {
  const queryClient = useQueryClient();

  const form = useForm<ReferralRequestFormData>({
    resolver: zodResolver(insertReferralRequestSchema.omit({ seekerId: true })),
    defaultValues: {
      jobPostingId: 0,
      referrerId: "",
      experienceLevel: "mid",
      motivation: "",
      profileUrl: "",
      notes: "",
    },
  });

  const createRequestMutation = useMutation({
    mutationFn: async (data: ReferralRequestFormData) => {
      await apiRequest("POST", "/api/referral-requests", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referral-requests/my"] });
      onClose();
      form.reset();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
    },
  });

  const onSubmit = (data: ReferralRequestFormData) => {
    if (!referral) return;
    
    const requestData = {
      ...data,
      jobPostingId: referral.id,
      referrerId: referral.referrerId,
    };
    
    createRequestMutation.mutate(requestData);
  };

  if (!referral) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Request Referral</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
              <Input 
                value={`${referral.title} at ${referral.company}`} 
                readOnly 
                className="bg-gray-50" 
              />
            </div>
            
            <FormField
              control={form.control}
              name="experienceLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Experience Level</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} required>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select experience level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="entry">Entry Level (0-2 years)</SelectItem>
                      <SelectItem value="mid">Mid Level (3-5 years)</SelectItem>
                      <SelectItem value="senior">Senior Level (6-10 years)</SelectItem>
                      <SelectItem value="lead">Lead Level (10+ years)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="motivation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Why are you interested in this role?</FormLabel>
                  <FormControl>
                    <Textarea 
                      rows={4} 
                      placeholder="Share your motivation and relevant experience..." 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="profileUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resume/LinkedIn Profile</FormLabel>
                  <FormControl>
                    <Input 
                      type="url" 
                      placeholder="https://linkedin.com/in/yourprofile" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      rows={3} 
                      placeholder="Any additional information you'd like to share..." 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex items-center space-x-4 pt-4">
              <Button 
                type="submit" 
                className="flex-1 bg-primary text-white hover:bg-blue-700"
                disabled={createRequestMutation.isPending}
              >
                {createRequestMutation.isPending ? "Submitting..." : "Submit Request"}
              </Button>
              <Button 
                type="button" 
                variant="outline"
                className="flex-1"
                onClick={onClose}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
