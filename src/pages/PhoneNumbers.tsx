import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Phone, PhoneCall, Plus, Settings, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function PhoneNumbers() {
  const [outboundNumber, setOutboundNumber] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPhoneNumbers();
    loadAgents();
  }, []);

  const loadPhoneNumbers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: phoneData, error } = await supabase
        .from('phone_numbers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading phone numbers:', error);
        return;
      }

      setPhoneNumbers(phoneData || []);
    } catch (error) {
      console.error('Error loading phone numbers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAgents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: agentsData, error } = await supabase
        .from('agents')
        .select('id, name')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading agents:', error);
        return;
      }

      setAgents(agentsData || []);
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  };

  const handleOutboundCall = () => {
    console.log("Starting outbound call to:", outboundNumber, "with agent:", selectedAgent);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Telefonnummern</h1>
        <p className="text-muted-foreground">Verwalten Sie Ihre Telefonnummern und Agenten-Zuordnungen</p>
      </div>

      {/* Verfügbare Telefonnummern */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Verfügbare Telefonnummern
          </CardTitle>
          <CardDescription>
            Ihre verfügbaren Telefonnummern und deren Status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Laden...</p>
            </div>
          ) : phoneNumbers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Keine Telefonnummern verfügbar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {phoneNumbers.map((phone) => (
                <div
                  key={phone.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{phone.phone_number}</div>
                      <div className="text-sm text-muted-foreground">ID: {phone.phonenumber_id}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <Badge variant="default">
                        Aktiv
                      </Badge>
                      <div className="text-sm text-muted-foreground mt-1">
                        Keine Zuweisung
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Outbound Call starten */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PhoneCall className="h-5 w-5" />
            Outbound Call starten
          </CardTitle>
          <CardDescription>
            Wählen Sie einen Agent und eine Nummer für einen ausgehenden Anruf
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="agent-select">Agent auswählen</Label>
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger>
                  <SelectValue placeholder="Wählen Sie einen Agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone-number">Telefonnummer</Label>
              <Input
                id="phone-number"
                placeholder="+49 30 12345678"
                value={outboundNumber}
                onChange={(e) => setOutboundNumber(e.target.value)}
              />
            </div>
            
            <Button 
              onClick={handleOutboundCall}
              disabled={!outboundNumber || !selectedAgent}
              className="w-full"
            >
              <PhoneCall className="h-4 w-4 mr-2" />
              Anruf starten
            </Button>
            
            {agents.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Erstellen Sie zuerst einen Agent, um Anrufe zu tätigen
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Neue Nummer hinzufügen */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Neue Nummer hinzufügen
          </CardTitle>
          <CardDescription>
            Neue Telefonnummer zu Ihrem Account hinzufügen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Phone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Premium Feature</h3>
            <p className="text-muted-foreground mb-4">
              Das Hinzufügen neuer Telefonnummern ist nur in der Premium-Version verfügbar
            </p>
            <Button variant="outline">
              <Sparkles className="mr-2 h-4 w-4" />
              Auf Premium upgraden
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}