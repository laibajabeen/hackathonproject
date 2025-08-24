// components/EmailComposer.tsx
import { useState } from "react";
import { Mail, Send, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface EmailComposerProps {
  sessionId: string;
}

const API_BASE_URL = "http://127.0.0.1:8000";

export default function EmailComposer({ sessionId }: EmailComposerProps) {
  const [emailRequest, setEmailRequest] = useState("");
  const [generatedEmail, setGeneratedEmail] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateEmail = async () => {
    if (!emailRequest.trim()) {
      toast({
        title: "Input Required",
        description: "Please describe what email you want to draft.",
        variant: "destructive",
      });
      return;
    }

    if (!sessionId.trim()) {
      toast({
        title: "Session Required",
        description: "Please set a session ID first.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch(`${API_BASE_URL}/realestate-agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Draft email: ${emailRequest}`,
          session_id: sessionId,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate email");

      const data = await response.json();
      setGeneratedEmail(data.result);

      toast({
        title: "Email Generated!",
        description: "Your email draft is ready.",
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Unable to generate email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedEmail);
    toast({
      title: "Copied!",
      description: "Email copied to clipboard.",
    });
  };

  return (
    <div className="bg-card p-6 rounded-lg shadow-card">
      <div className="flex items-center gap-3 mb-4">
        <Mail className="h-6 w-6 text-primary" />
        <h3 className="text-xl font-semibold">Email Composer</h3>
      </div>

      <div className="space-y-4">
        {/* Input for email request */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            What email would you like to draft?
          </label>
          <Input
            value={emailRequest}
            onChange={(e) => setEmailRequest(e.target.value)}
            placeholder="e.g., Email to landlord about viewing a flat in Camden"
            disabled={isGenerating}
          />
        </div>

        {/* Generate button */}
        <Button
          onClick={generateEmail}
          disabled={isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Generating...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Generate Email
            </div>
          )}
        </Button>

        {/* Generated email display */}
        {generatedEmail && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-muted-foreground">
                Generated Email:
              </label>
              <Button variant="outline" size="sm" onClick={copyToClipboard}>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
            <Textarea
              value={generatedEmail}
              onChange={(e) => setGeneratedEmail(e.target.value)}
              rows={12}
              className="font-mono text-sm"
              placeholder="Your generated email will appear here..."
            />
          </div>
        )}
      </div>
    </div>
  );
}
