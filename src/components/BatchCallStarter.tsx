import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Plus, Trash2, Phone } from "lucide-react";

interface Contact {
  id: string;
  vorname: string;
  nachname: string;
  firma: string;
  nummer: string;
  call_name: string;
}

interface Agent {
  id: string;
  name: string;
  elevenlabs_agent_id: string;
  phone_number_id: string;
}

interface BatchCallStarterProps {
  onBatchStarted: () => void;
}

export function BatchCallStarter({ onBatchStarted }: BatchCallStarterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [callName, setCallName] = useState("");
  const [agentPhoneNumberId, setAgentPhoneNumberId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [loadingAgents, setLoadingAgents] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchAgents();
    }
  }, [isOpen]);

  const fetchAgents = async () => {
    setLoadingAgents(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Fehler",
          description: "Nicht authentifiziert",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(
        "https://ubqcxxfynhnwhvtogkvx.supabase.co/functions/v1/get-batch-agents",
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Fehler beim Laden der Agents");
      }

      const result = await response.json();
      setAgents(result.agents || []);
    } catch (error) {
      console.error("Error fetching agents:", error);
      toast({
        title: "Fehler",
        description: "Agents konnten nicht geladen werden",
        variant: "destructive",
      });
    } finally {
      setLoadingAgents(false);
    }
  };

  const handleAgentSelect = (agentId: string) => {
    setSelectedAgent(agentId);
    const agent = agents.find(a => a.id === agentId);
    if (agent) {
      setAgentId(agent.elevenlabs_agent_id);
      setAgentPhoneNumberId(agent.phone_number_id);
    }
  };

  const addContact = () => {
    const newContact: Contact = {
      id: crypto.randomUUID(),
      vorname: "",
      nachname: "",
      firma: "",
      nummer: "",
      call_name: callName || "Batch Call"
    };
    setContacts([...contacts, newContact]);
  };

  const updateContact = (id: string, field: keyof Contact, value: string) => {
    setContacts(contacts.map(contact => 
      contact.id === id ? { ...contact, [field]: value } : contact
    ));
  };

  const removeContact = (id: string) => {
    setContacts(contacts.filter(contact => contact.id !== id));
  };

  const parseCSV = (csvText: string) => {
    const lines = csvText.split('\n').filter(line => line.trim());
    const newContacts: Contact[] = [];
    
    // Check if first line is a header
    const firstLine = lines[0]?.toLowerCase();
    const hasHeader = firstLine?.includes('vorname') || firstLine?.includes('name') || firstLine?.includes('phone');
    
    // Parse header to determine column mapping
    let vornameIdx = 0, nachnameIdx = 1, firmaIdx = 2, nummerIdx = 2;
    
    if (hasHeader) {
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      vornameIdx = headers.findIndex(h => h.includes('vorname')) ?? 0;
      nachnameIdx = headers.findIndex(h => h.includes('name') && !h.includes('vorname')) ?? 1;
      nummerIdx = headers.findIndex(h => h.includes('phone') || h.includes('nummer') || h.includes('telefon')) ?? 2;
      // Firma could be in any remaining column, default to -1 if not found
      firmaIdx = headers.findIndex(h => h.includes('firma') || h.includes('company')) ?? -1;
    }
    
    const startIndex = hasHeader ? 1 : 0;
    
    for (let i = startIndex; i < lines.length; i++) {
      const columns = lines[i].split(',').map(col => col.trim().replace(/"/g, ''));
      if (columns.length >= 2) {
        newContacts.push({
          id: crypto.randomUUID(),
          vorname: columns[vornameIdx] || "",
          nachname: columns[nachnameIdx] || "",
          firma: firmaIdx >= 0 ? (columns[firmaIdx] || "") : "",
          nummer: columns[nummerIdx] || "",
          call_name: callName || "Batch Call"
        });
      }
    }
    
    setContacts([...contacts, ...newContacts]);
    toast({
      title: "CSV importiert",
      description: `${newContacts.length} Kontakte hinzugefügt`,
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const startBatchCall = async () => {
    // Validierung: Call-Name (1-140 Zeichen)
    if (!callName.trim() || callName.trim().length > 140) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Call-Namen ein (1-140 Zeichen)",
        variant: "destructive",
      });
      return;
    }

    // Validierung: Agent auswählen
    if (!selectedAgent) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie einen Agent aus",
        variant: "destructive",
      });
      return;
    }

    // Validierung: Kontakte (1-200)
    if (contacts.length === 0) {
      toast({
        title: "Fehler", 
        description: "Bitte fügen Sie mindestens einen Kontakt hinzu",
        variant: "destructive",
      });
      return;
    }

    if (contacts.length > 200) {
      toast({
        title: "Fehler",
        description: "Maximal 200 Kontakte pro Batch-Call erlaubt",
        variant: "destructive",
      });
      return;
    }

    // Validierung: Telefonnummern
    const phoneRegex = /^\+?[0-9]{7,15}$/;
    const invalidContacts = contacts.filter(c => !phoneRegex.test(c.nummer.replace(/\s/g, '')));
    if (invalidContacts.length > 0) {
      toast({
        title: "Fehler",
        description: `${invalidContacts.length} Kontakt(e) haben ungültige Telefonnummern. Format: +49... (7-15 Ziffern)`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const batchCallData = {
        call_name: callName,
        agent_id: agentId,
        agent_phone_number_id: agentPhoneNumberId,
        recipients: contacts.map(contact => ({
          phone_number: contact.nummer,
          conversation_initiation_client_data: {
            dynamic_variables: {
              vorname: contact.vorname,
              nachname: contact.nachname,
              firma: contact.firma,
              nummer: contact.nummer,
              call_name: contact.call_name
            }
          }
        }))
      };

      const { data, error } = await supabase.functions.invoke('start-batch-call', {
        body: batchCallData
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Batch-Call gestartet",
          description: `Batch-Call mit ${contacts.length} Kontakten wurde erfolgreich gestartet`,
        });
        setIsOpen(false);
        setContacts([]);
        setCallName("");
        setAgentId("");
        setAgentPhoneNumberId("");
        onBatchStarted();
      } else {
        throw new Error(data.error || "Unbekannter Fehler");
      }
    } catch (error: any) {
      console.error('Error starting batch call:', error);
      toast({
        title: "Fehler",
        description: error.message || "Batch-Call konnte nicht gestartet werden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Phone className="w-4 h-4" />
          Neuer Batch-Call
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neuen Batch-Call starten</DialogTitle>
          <DialogDescription>
            Konfigurieren Sie Ihren Batch-Call und fügen Sie Kontakte hinzu
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Batch-Call Konfiguration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Konfiguration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="callName">Call-Name</Label>
                  <Input
                    id="callName"
                    value={callName}
                    onChange={(e) => setCallName(e.target.value)}
                    placeholder="z.B. Neukunden Kampagne"
                  />
                </div>
                <div>
                  <Label htmlFor="agent">Agent auswählen</Label>
                  <Select
                    value={selectedAgent}
                    onValueChange={handleAgentSelect}
                    disabled={loadingAgents}
                  >
                    <SelectTrigger id="agent">
                      <SelectValue placeholder={loadingAgents ? "Lädt..." : "Wählen Sie einen Agent"} />
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
              </div>
            </CardContent>
          </Card>

          {/* Kontakte hinzufügen */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Kontakte
                <Badge variant="secondary">{contacts.length} Kontakte</Badge>
              </CardTitle>
              <CardDescription>
                Fügen Sie Kontakte manuell hinzu oder importieren Sie eine CSV-Datei
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={addContact} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Kontakt hinzufügen
                </Button>
                <div className="relative">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Button variant="outline" size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    CSV importieren
                  </Button>
                </div>
              </div>

              {contacts.length > 0 && (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vorname</TableHead>
                        <TableHead>Nachname</TableHead>
                        <TableHead>Firma</TableHead>
                        <TableHead>Telefonnummer</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contacts.map((contact) => (
                        <TableRow key={contact.id}>
                          <TableCell>
                            <Input
                              value={contact.vorname}
                              onChange={(e) => updateContact(contact.id, 'vorname', e.target.value)}
                              placeholder="Vorname"
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={contact.nachname}
                              onChange={(e) => updateContact(contact.id, 'nachname', e.target.value)}
                              placeholder="Nachname"
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={contact.firma}
                              onChange={(e) => updateContact(contact.id, 'firma', e.target.value)}
                              placeholder="Firma"
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={contact.nummer}
                              onChange={(e) => updateContact(contact.id, 'nummer', e.target.value)}
                              placeholder="+49..."
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              onClick={() => removeContact(contact.id)}
                              variant="ghost"
                              size="sm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="text-sm text-muted-foreground">
                <p>CSV-Format: Vorname, Nachname, Firma, Telefonnummer</p>
                <p>Beispiel: Max, Mustermann, Beispiel GmbH, +49123456789</p>
              </div>
            </CardContent>
          </Card>

          {/* Aktionen */}
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => setIsOpen(false)}
              variant="outline"
              disabled={loading}
            >
              Abbrechen
            </Button>
            <Button
              onClick={startBatchCall}
              disabled={loading || contacts.length === 0 || !callName.trim() || !selectedAgent}
            >
              {loading ? "Wird gestartet..." : `Batch-Call starten (${contacts.length} Kontakte)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}