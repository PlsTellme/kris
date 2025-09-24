import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Plus, Edit, Trash2, Play } from "lucide-react";

export default function ManageAgents() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agenten verwalten</h1>
          <p className="text-muted-foreground">Verwalten Sie alle Ihre KI-Telefonagenten</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Neuer Agent
        </Button>
      </div>

      <div className="text-center py-12">
        <Bot className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Noch keine Agenten erstellt</h3>
        <p className="text-muted-foreground mb-6">
          Erstellen Sie Ihren ersten KI-Telefonagenten, um loszulegen
        </p>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Ersten Agent erstellen
        </Button>
      </div>

      {/* Template for when agents exist - commented out for now */}
      {/* 
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bot className="h-5 w-5 text-primary" />
                Immobilien-Assistent Max
              </CardTitle>
              <Badge variant="secondary">Aktiv</Badge>
            </div>
            <CardDescription>Sarah (Weiblich, Deutsch)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <strong>Erste Nachricht:</strong> Hallo, mein Name ist Max und ich rufe von der Immobilienagentur...
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1">
                  <Edit className="h-4 w-4 mr-1" />
                  Bearbeiten
                </Button>
                <Button size="sm" variant="outline" className="flex-1">
                  <Play className="h-4 w-4 mr-1" />
                  Testen
                </Button>
                <Button size="sm" variant="outline">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      */}
    </div>
  );
}