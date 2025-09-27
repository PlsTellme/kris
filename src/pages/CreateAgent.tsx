import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bot, Crown, AlertTriangle, FileText, Building, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

export default function CreateAgent() {
  const [subscriptionType, setSubscriptionType] = useState<string>('free');
  const [loading, setLoading] = useState(true);
  const [voices, setVoices] = useState<Array<{id: string, name: string, voice_id: string, gender: string}>>([]);
  const [formData, setFormData] = useState({
    name: '',
    voice_id: '',
    first_message: '',
    prompt: '',
    email: ''
  });
  const [creating, setCreating] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkSubscription();
    loadVoices();
  }, []);

  const checkSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_type, is_premium, minutes_used, minutes_limit')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profile) {
          setSubscriptionType(profile.subscription_type || 'free');
        }
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVoices = async () => {
    try {
      const { data: voicesData, error } = await supabase
        .from('voices')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error loading voices:', error);
        return;
      }

      setVoices(voicesData || []);
    } catch (error) {
      console.error('Error loading voices:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreateAgent = async () => {
    if (!formData.name || !formData.voice_id || !formData.prompt) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle erforderlichen Felder aus.",
        variant: "destructive"
      });
      return;
    }

    setCreating(true);
    try {
      // Get the current user id only to include in the body (no header needed)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
      }

      const { data, error } = await supabase.functions.invoke('create-agent', {
        body: { ...formData, user_id: user.id }
      });

      if (error) {
        console.error('Function error:', error);
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Unbekannter Fehler');
      }

      toast({
        title: "Erfolg",
        description: "Agent wurde erfolgreich erstellt!"
      });

      // Navigate to manage agents
      navigate('/manage-agents');
      
    } catch (error: any) {
      console.error('Error creating agent:', error);
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Erstellen des Agenten",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

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

  const promptTemplates = {
    makler: `Du bist ein professioneller Immobilienmakler mit langjähriger Erfahrung. 

**Deine Aufgaben:**
- Interessenten zu Immobilien beraten und qualifizieren
- Besichtigungstermine koordinieren
- Finanzierungsoptionen erklären
- Kundenanfragen professionell bearbeiten

**Dein Verhalten:**
- Freundlich, kompetent und vertrauenswürdig
- Stelle gezielte Fragen zu Budget, Wohnwünschen und Zeitrahmen
- Erkläre Immobilienprozesse verständlich
- Sammle Kontaktdaten für Follow-up

Bei wichtigen Anfragen: Sende Zusammenfassung an {{email}}`,

    hausverwalter: `Du bist ein erfahrener Hausverwalter für Wohn- und Gewerbeimmobilien.

**Deine Aufgaben:**
- Mieteranfragen und Beschwerden bearbeiten
- Reparatur- und Wartungsangelegenheiten koordinieren
- Mietvertragsfragen beantworten
- Notfälle priorisieren und weiterleiten

**Dein Verhalten:**
- Professionell, lösungsorientiert und geduldig
- Dokumentiere alle Anfragen gewissenhaft
- Unterscheide zwischen Routine- und Notfällen
- Informiere über Hausordnung und Mieterpflichten

Wichtige Vorfälle werden an {{email}} gemeldet.`,

    immobilienhotline: `Du bist die erste Anlaufstelle der Immobilien-Hotline.

**Deine Aufgaben:**
- Eingehende Anrufe professionell entgegennehmen
- Interessenten zu passenden Abteilungen weiterleiten
- Grundlegende Immobilieninformationen bereitstellen
- Terminvereinbarungen koordinieren

**Dein Verhalten:**
- Herzlich, hilfsbereit und serviceorientiert
- Stelle fest: Verkauf, Vermietung, oder Verwaltung?
- Sammle Kontaktdaten und Präferenzen
- Erkläre nächste Schritte klar

Alle Anfragen werden zur Nachverfolgung an {{email}} weitergeleitet.`
  };

  const handleTemplateSelect = (template: keyof typeof promptTemplates) => {
    setFormData(prev => ({
      ...prev,
      prompt: promptTemplates[template]
    }));
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Agent erstellen</h1>
        <p className="text-muted-foreground">Erstellen Sie Ihren personalisierten KI-Telefonagenten</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="shadow-card">
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
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="voice-type">Stimme auswählen *</Label>
            <Select value={formData.voice_id} onValueChange={(value) => handleInputChange('voice_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Stimme auswählen" />
              </SelectTrigger>
              <SelectContent>
                {voices.map((voice) => (
                  <SelectItem key={voice.id} value={voice.voice_id}>
                    {voice.name} ({voice.gender === 'male' ? 'Männlich' : 'Weiblich'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="first-message">Erste Nachricht (optional)</Label>
            <Textarea
              id="first-message"
              placeholder="Hallo, mein Name ist Max und ich rufe von der Immobilienagentur..."
              className="min-h-[100px]"
              value={formData.first_message}
              onChange={(e) => handleInputChange('first_message', e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Diese Nachricht wird zu Beginn jedes Anrufs abgespielt
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-Mail für Transkripte (optional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="mail@example.com"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Transkripte und Zusammenfassungen werden an diese Adresse gesendet
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="agent-prompt">Agent Prompt *</Label>
            <Textarea
              id="agent-prompt"
              placeholder="Du bist ein professioneller Immobilienmakler. Deine Aufgabe ist es..."
              className="min-h-[150px]"
              value={formData.prompt}
              onChange={(e) => handleInputChange('prompt', e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Definieren Sie hier das Verhalten und die Persönlichkeit Ihres Agenten. Nutzen Sie {'{{email}}'} als Platzhalter.
            </p>
          </div>

          <div className="pt-4">
            <Button 
              className="w-full"
              onClick={handleCreateAgent}
              disabled={creating}
            >
              {creating ? 'Erstelle Agent...' : 'Agent erstellen'}
            </Button>
          </div>
        </CardContent>
        </Card>
        </div>

        <div className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Prompt-Vorlagen
              </CardTitle>
              <CardDescription>
                Wählen Sie eine vorgefertigte Vorlage als Startpunkt
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleTemplateSelect('makler')}
              >
                <Building className="mr-2 h-4 w-4" />
                Immobilienmakler
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleTemplateSelect('hausverwalter')}
              >
                <Home className="mr-2 h-4 w-4" />
                Hausverwalter
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleTemplateSelect('immobilienhotline')}
              >
                <Bot className="mr-2 h-4 w-4" />
                Immobilienhotline
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Prompting-Guide</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-4">
              <div>
                <h4 className="font-medium mb-2">Struktur-Tipps:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Klare Rollendefinition</li>
                  <li>• Spezifische Aufgaben auflisten</li>
                  <li>• Gewünschtes Verhalten beschreiben</li>
                  <li>• Beispiele für Antworten geben</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Variablen:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• <code>{'{{email}}'}</code> - Ziel-E-Mail</li>
                  <li>• Weitere folgen...</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}