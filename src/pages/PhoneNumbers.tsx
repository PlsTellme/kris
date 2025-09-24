import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Phone, PhoneCall, Plus, Settings } from "lucide-react";

export default function PhoneNumbers() {
  const [outboundNumber, setOutboundNumber] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");

  // Mock phone numbers data
  const phoneNumbers = [
    {
      id: 1,
      number: "+49 30 12345678",
      status: "aktiv",
      assignedAgent: null,
    },
    {
      id: 2,
      number: "+49 30 87654321",
      status: "inaktiv",
      assignedAgent: null,
    },
    {
      id: 3,
      number: "+49 30 11223344",
      status: "aktiv",
      assignedAgent: null,
    },
  ];

  // Mock agents for dropdown (will be populated from database later)
  const availableAgents = [
    { id: 1, name: "Kein Agent verfügbar - Premium erforderlich" },
  ];

  const handleOutboundCall = () => {
    if (!outboundNumber || !selectedAgent) return;
    
    console.log("Starting outbound call:", { number: outboundNumber, agent: selectedAgent });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Telefonnummern</h1>
        <p className="text-muted-foreground">Verwalten Sie Ihre Telefonnummern und Agenten-Zuordnungen</p>
      </div>

      {/* Available Phone Numbers */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Verfügbare Telefonnummern
          </CardTitle>
          <CardDescription>
            Weisen Sie Ihren Agenten Telefonnummern zu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {phoneNumbers.map((phoneNumber) => (
              <div key={phoneNumber.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Phone className="h-6 w-6 text-primary" />
                  <div>
                    <h3 className="font-medium">{phoneNumber.number}</h3>
                    <p className="text-sm text-muted-foreground">
                      {phoneNumber.assignedAgent ? `Zugewiesen: ${phoneNumber.assignedAgent}` : "Nicht zugewiesen"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={phoneNumber.status === 'aktiv' ? 'default' : 'secondary'}>
                    {phoneNumber.status}
                  </Badge>
                  <Select defaultValue="">
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Agent zuweisen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Kein Agent</SelectItem>
                      {availableAgents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id.toString()} disabled>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Outbound Call */}
      <Card className="shadow-card">
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
                  {availableAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id.toString()} disabled>
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
            
            <p className="text-sm text-muted-foreground">
              Erstellen Sie zuerst einen Premium-Agent, um Anrufe zu tätigen
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Add New Number */}
      <Card className="shadow-card">
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
              Auf Premium upgraden
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}