import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  const { toast } = useToast();

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
    
    // Skip header line if it exists
    const startIndex = lines[0]?.toLowerCase().includes('name') || lines[0]?.toLowerCase().includes('nummer') ? 1 : 0;
    
    for (let i = startIndex; i < lines.length; i++) {
      const columns = lines[i].split(',').map(col => col.trim().replace(/"/g, ''));
      if (columns.length >= 2) {
        newContacts.push({
          id: crypto.randomUUID(),
          vorname: columns[0] || "",
          nachname: columns[1] || "",
          firma: columns[2] || "",
          nummer: columns[3] || columns[1], // Fallback to second column if no fourth
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
    if (!callName.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Call-Namen ein",
        variant: "destructive",
      });
      return;
    }

    if (contacts.length === 0) {
      toast({
        title: "Fehler", 
        description: "Bitte fügen Sie mindestens einen Kontakt hinzu",
        variant: "destructive",
      });
      return;
    }

    if (!agentId.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie eine Agent-ID ein",
        variant: "destructive",
      });
      return;
    }

    if (!agentPhoneNumberId.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie eine Agent Phone Number ID ein",
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
                  <Label htmlFor="agentId">ElevenLabs Agent-ID</Label>
                  <Input
                    id="agentId"
                    value={agentId}
                    onChange={(e) => setAgentId(e.target.value)}
                    placeholder="agent_01..."
                  />
                </div>
                <div>
                  <Label htmlFor="agentPhoneNumberId">Agent Phone Number ID</Label>
                  <Input
                    id="agentPhoneNumberId"
                    value={agentPhoneNumberId}
                    onChange={(e) => setAgentPhoneNumberId(e.target.value)}
                    placeholder="phnum_01..."
                  />
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
              disabled={loading || contacts.length === 0 || !callName.trim() || !agentId.trim() || !agentPhoneNumberId.trim()}
            >
              {loading ? "Wird gestartet..." : `Batch-Call starten (${contacts.length} Kontakte)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}