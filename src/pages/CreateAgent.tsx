import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bot, Crown, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function CreateAgent() {
  const [subscriptionType, setSubscriptionType] = useState<string>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_premium')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profile) {
          setSubscriptionType(profile.is_premium ? 'premium' : 'free');
        }
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const voiceOptions = [
    { value: "sarah", label: "Sarah (Weiblich, Deutsch)" },
    { value: "max", label: "Max (Männlich, Deutsch)" },
    { value: "emma", label: "Emma (Weiblich, Österreichisch)" },
    { value: "jonas", label: "Jonas (Männlich, Schweizerdeutsch)" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Bot className="w-8 h-8 animate-pulse mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Wird geladen...</p>
        </div>
      </div>
    );
  }

  if (subscriptionType === 'free') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Agent erstellen</h1>
          <p className="text-muted-foreground">Erstellen Sie Ihren KI-Telefonagenten</p>
        </div>

        <Card className="shadow-card">
          <CardHeader className="text-center">
            <Crown className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <CardTitle>Premium Feature</CardTitle>
            <CardDescription>
              Das Erstellen von Agenten ist nur in der Premium-Version verfügbar
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Alert className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Upgraden Sie auf Premium, um unbegrenzt Agenten zu erstellen und alle Features zu nutzen.
              </AlertDescription>
            </Alert>
            <Button size="lg" className="bg-gradient-primary">
              Auf Premium upgraden
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Agent erstellen</h1>
        <p className="text-muted-foreground">Erstellen Sie Ihren personalisierten KI-Telefonagenten</p>
      </div>

      <Card className="shadow-card max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Neuen Agent konfigurieren
          </CardTitle>
          <CardDescription>
            Definieren Sie die Eigenschaften und das Verhalten Ihres Telefonagenten
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="agent-name">Agent Name *</Label>
            <Input
              id="agent-name"
              placeholder="z.B. Immobilien-Assistent Max"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="voice-type">Stimme auswählen *</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Wählen Sie eine Stimme" />
              </SelectTrigger>
              <SelectContent>
                {voiceOptions.map((voice) => (
                  <SelectItem key={voice.value} value={voice.value}>
                    {voice.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="first-message">Erste Nachricht *</Label>
            <Textarea
              id="first-message"
              placeholder="Hallo, mein Name ist Max und ich rufe von der Immobilienagentur XY an. Hätten Sie einen Moment Zeit für ein kurzes Gespräch über..."
              className="min-h-[100px]"
              required
            />
            <p className="text-sm text-muted-foreground">
              Diese Nachricht wird zu Beginn jedes Anrufs abgespielt
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="agent-prompt">Agent Prompt *</Label>
            <Textarea
              id="agent-prompt"
              placeholder="Du bist ein professioneller Immobilienmakler-Assistent. Deine Aufgabe ist es, höflich und kompetent potenzielle Interessenten anzusprechen und Termine zu vereinbaren. Verhalte dich stets professionell und freundlich..."
              className="min-h-[150px]"
              required
            />
            <p className="text-sm text-muted-foreground">
              Definieren Sie hier das Verhalten und die Persönlichkeit Ihres Agenten
            </p>
          </div>

          <div className="flex gap-4 pt-4">
            <Button variant="outline" className="flex-1">
              <Bot className="mr-2 h-4 w-4" />
              Vorschau testen
            </Button>
            <Button className="flex-1">
              Agent erstellen
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}