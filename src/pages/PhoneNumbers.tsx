import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Phone, PhoneCall, Settings, Bot } from "lucide-react";

export default function PhoneNumbers() {
  const [outboundNumber, setOutboundNumber] = useState("");

  const mockAgents = [
    {
      id: 1,
      name: "Immobilien-Assistent Max",
      phoneNumber: "+49 30 12345678",
      status: "aktiv",
    },
  ];

  const handleOutboundCall = () => {
    if (!outboundNumber) return;
    
    // Here would be the actual outbound call logic
    console.log("Starting outbound call to:", outboundNumber);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Telefonnummern</h1>
        <p className="text-muted-foreground">Verwalten Sie Telefonnummern für Ihre Agenten</p>
      </div>

      {/* Agent Phone Numbers */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Agent Telefonnummern
          </CardTitle>
          <CardDescription>
            Zugewiesene Telefonnummern für Ihre KI-Agenten
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mockAgents.length === 0 ? (
            <div className="text-center py-8">
              <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Keine Agenten mit zugewiesenen Telefonnummern gefunden
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {mockAgents.map((agent) => (
                <div key={agent.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Bot className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="font-medium">{agent.name}</h3>
                      <p className="text-sm text-muted-foreground">{agent.phoneNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={agent.status === 'aktiv' ? 'default' : 'secondary'}>
                      {agent.status}
                    </Badge>
                    <Button size="sm" variant="outline">
                      <Settings className="h-4 w-4" />
                    </Button>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <PhoneCall className="h-4 w-4 mr-2" />
                          Anrufen
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Outbound Call starten</DialogTitle>
                          <DialogDescription>
                            Starten Sie einen ausgehenden Anruf mit {agent.name}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="phone-number">Telefonnummer</Label>
                            <Input
                              id="phone-number"
                              placeholder="+49 30 12345678"
                              value={outboundNumber}
                              onChange={(e) => setOutboundNumber(e.target.value)}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              onClick={handleOutboundCall} 
                              className="flex-1"
                              disabled={!outboundNumber}
                            >
                              <PhoneCall className="h-4 w-4 mr-2" />
                              Anruf starten
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Outbound Call */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PhoneCall className="h-5 w-5" />
            Schneller Outbound Call
          </CardTitle>
          <CardDescription>
            Starten Sie direkt einen ausgehenden Anruf
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 max-w-md">
            <div className="flex-1">
              <Input
                placeholder="Telefonnummer eingeben..."
                value={outboundNumber}
                onChange={(e) => setOutboundNumber(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleOutboundCall}
              disabled={!outboundNumber || mockAgents.length === 0}
            >
              <PhoneCall className="h-4 w-4 mr-2" />
              Anrufen
            </Button>
          </div>
          {mockAgents.length === 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              Erstellen Sie zuerst einen Agenten, um Anrufe zu tätigen
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}