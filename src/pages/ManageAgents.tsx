import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Bot, Plus, Edit, Trash2, TestTube } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { AgentTestDialog } from "@/components/AgentTestDialog";

export default function ManageAgents() {
  const [agents, setAgents] = useState<any[]>([]);
  const [voices, setVoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAgent, setEditingAgent] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    voice_id: '',
    first_message: '',
    prompt: '',
    email: ''
  });
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  
  // Test dialog states
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testingAgent, setTestingAgent] = useState<any>(null);

  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadAgents();
    loadVoices();
  }, []);

  const loadAgents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: agentsData, error } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading agents:', error);
        return;
      }

      setAgents(agentsData || []);
    } catch (error) {
      console.error('Error loading agents:', error);
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

  const handleEditAgent = (agent: any) => {
    setEditingAgent(agent);
    setEditFormData({
      name: agent.name,
      voice_id: agent.voice_type,
      first_message: agent.first_message || '',
      prompt: agent.prompt || '',
      email: agent.email || ''
    });
  };

  const handleTestAgent = (agent: any) => {
    setTestingAgent(agent);
    setTestDialogOpen(true);
  };

  const handleDeleteAgent = async (agent: any) => {
    setDeleting(agent.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Nicht authentifiziert');
      }

      const { data, error } = await supabase.functions.invoke('delete-agent', {
        body: {
          agent_id: agent.id,
          elevenlabs_agent_id: agent.elevenlabs_agent_id,
          user_id: user.id
        }
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
        description: "Agent wurde erfolgreich gelöscht!"
      });

      loadAgents(); // Reload agents list
      
    } catch (error: any) {
      console.error('Error deleting agent:', error);
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Löschen des Agenten",
        variant: "destructive"
      });
    } finally {
      setDeleting(null);
    }
  };

  const handleUpdateAgent = async () => {
    if (!editFormData.name || !editFormData.voice_id || !editFormData.prompt) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle erforderlichen Felder aus.",
        variant: "destructive"
      });
      return;
    }

    setUpdating(true);
    try {
      // Get the current user id only to include in the body (no header needed)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
      }

      const { data, error } = await supabase.functions.invoke('update-agent', {
        body: {
          agent_id: editingAgent.id,
          elevenlabs_agent_id: editingAgent.elevenlabs_agent_id,
          user_id: user.id,
          ...editFormData
        }
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
        description: "Agent wurde erfolgreich aktualisiert!"
      });

      setEditingAgent(null);
      loadAgents(); // Reload agents
      
    } catch (error: any) {
      console.error('Error updating agent:', error);
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Aktualisieren des Agenten",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const getVoiceName = (voice_id: string) => {
    const voice = voices.find(v => v.voice_id === voice_id);
    return voice ? `${voice.name} (${voice.gender === 'male' ? 'Männlich' : 'Weiblich'})` : voice_id;
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Agenten verwalten</h1>
            <p className="text-muted-foreground">Verwalten Sie alle Ihre KI-Telefonagenten</p>
          </div>
        </div>
        <div className="text-center py-12">
          <Bot className="w-16 h-16 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agenten verwalten</h1>
          <p className="text-muted-foreground">Verwalten Sie alle Ihre KI-Telefonagenten</p>
        </div>
        <Button className="gap-2" onClick={() => navigate('/create-agent')}>
          <Plus className="h-4 w-4" />
          Neuer Agent
        </Button>
      </div>

      {agents.length === 0 ? (
        <div className="text-center py-12">
          <Bot className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Noch keine Agenten erstellt</h3>
          <p className="text-muted-foreground mb-6">
            Erstellen Sie Ihren ersten KI-Telefonagenten, um loszulegen
          </p>
          <Button onClick={() => navigate('/create-agent')}>
            <Plus className="mr-2 h-4 w-4" />
            Ersten Agent erstellen
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Card key={agent.id} className="shadow-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Bot className="h-5 w-5 text-primary" />
                    {agent.name}
                  </CardTitle>
                  <Badge variant="secondary">Aktiv</Badge>
                </div>
                <CardDescription>{getVoiceName(agent.voice_type)}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {agent.first_message && (
                    <div className="text-sm text-muted-foreground">
                      <strong>Erste Nachricht:</strong> {agent.first_message.substring(0, 60)}...
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => handleEditAgent(agent)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Bearbeiten
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Agent bearbeiten</DialogTitle>
                          <DialogDescription>
                            Bearbeiten Sie die Eigenschaften Ihres Agenten
                          </DialogDescription>
                        </DialogHeader>
                        {editingAgent && (
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="edit-name">Agent Name *</Label>
                              <Input
                                id="edit-name"
                                value={editFormData.name}
                                onChange={(e) => setEditFormData(prev => ({...prev, name: e.target.value}))}
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-voice">Stimme auswählen *</Label>
                              <Select 
                                value={editFormData.voice_id} 
                                onValueChange={(value) => setEditFormData(prev => ({...prev, voice_id: value}))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
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
                            <div>
                              <Label htmlFor="edit-first-message">Erste Nachricht (optional)</Label>
                              <Textarea
                                id="edit-first-message"
                                value={editFormData.first_message}
                                onChange={(e) => setEditFormData(prev => ({...prev, first_message: e.target.value}))}
                                className="min-h-[100px]"
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-email">E-Mail für Transkripte (optional)</Label>
                              <Input
                                id="edit-email"
                                type="email"
                                value={editFormData.email}
                                onChange={(e) => setEditFormData(prev => ({...prev, email: e.target.value}))}
                                placeholder="mail@example.com"
                              />
                            </div>
                            <div>
                              <Label htmlFor="edit-prompt">Agent Prompt *</Label>
                              <Textarea
                                id="edit-prompt"
                                value={editFormData.prompt}
                                onChange={(e) => setEditFormData(prev => ({...prev, prompt: e.target.value}))}
                                className="min-h-[150px]"
                              />
                              <p className="text-sm text-muted-foreground mt-1">
                                Nutzen Sie {'{{email}}'} als Platzhalter für die E-Mail-Adresse
                              </p>
                            </div>
                            <div className="flex gap-3 pt-4">
                              <Button 
                                variant="outline" 
                                className="flex-1"
                                onClick={() => setEditingAgent(null)}
                                disabled={updating}
                              >
                                Abbrechen
                              </Button>
                              <Button 
                                className="flex-1"
                                onClick={handleUpdateAgent}
                                disabled={updating}
                              >
                                {updating ? 'Speichere...' : 'Speichern'}
                              </Button>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                    
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleTestAgent(agent)}
                    >
                      <TestTube className="h-4 w-4 mr-1" />
                      Testen
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          className="flex-1"
                          disabled={deleting === agent.id}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          {deleting === agent.id ? 'Löschen...' : 'Löschen'}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Agent löschen</AlertDialogTitle>
                          <AlertDialogDescription>
                            Sind Sie sicher, dass Sie den Agent "{agent.name}" löschen möchten? 
                            Diese Aktion kann nicht rückgängig gemacht werden.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteAgent(agent)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Löschen
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AgentTestDialog 
        isOpen={testDialogOpen}
        onClose={() => setTestDialogOpen(false)}
        agent={testingAgent}
      />
    </div>
  );
}