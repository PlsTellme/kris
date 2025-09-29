import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Phone, Clock, Users, FileText } from "lucide-react";
import { BatchCallStarter } from "@/components/BatchCallStarter";

interface BatchCall {
  id: string;
  batchid: string;
  callname: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface BatchAnswer {
  id: string;
  vorname: string;
  nachname: string;
  firma: string;
  nummer: string;
  batchid: string;
  zeitpunkt: number;
  anrufdauer: number;
  transcript: string;
  callname: string;
  answers: any;
  call_status: string;
}

export default function BatchCalls() {
  const [batchCalls, setBatchCalls] = useState<BatchCall[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [batchAnswers, setBatchAnswers] = useState<BatchAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [answersLoading, setAnswersLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchBatchCalls();
  }, []);

  const fetchBatchCalls = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-batch-calls');
      
      if (error) throw error;
      
      if (data.success) {
        setBatchCalls(data.batchcalls || []);
      }
    } catch (error: any) {
      console.error('Error fetching batch calls:', error);
      toast({
        title: "Fehler",
        description: "Batch-Calls konnten nicht geladen werden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBatchAnswers = async (batchid: string) => {
    setAnswersLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-batch-answers', {
        body: { batchid }
      });
      
      if (error) throw error;
      
      if (data.success) {
        setBatchAnswers(data.data || []);
        setSelectedBatch(batchid);
      }
    } catch (error: any) {
      console.error('Error fetching batch answers:', error);
      toast({
        title: "Fehler",
        description: "Batch-Antworten konnten nicht geladen werden",
        variant: "destructive",
      });
    } finally {
      setAnswersLoading(false);
    }
  };

  const startNewBatchCall = () => {
    // This is now handled by the BatchCallStarter component
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default">Abgeschlossen</Badge>;
      case 'in_progress':
        return <Badge variant="secondary">Läuft</Badge>;
      case 'failed':
        return <Badge variant="destructive">Fehlgeschlagen</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCallStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default">Erfolgreich</Badge>;
      case 'no_answer':
        return <Badge variant="secondary">Keine Antwort</Badge>;
      case 'failed':
        return <Badge variant="destructive">Fehlgeschlagen</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('de-DE');
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('de-DE');
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Lade Batch-Calls...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Batch-Calls</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Batch-Anrufe und überprüfen Sie die Ergebnisse
          </p>
        </div>
        <BatchCallStarter onBatchStarted={fetchBatchCalls} />
      </div>

      <div className="grid gap-6">
        {/* Batch Calls List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Batch-Call Übersicht
            </CardTitle>
            <CardDescription>
              Ihre letzten 20 Batch-Calls
            </CardDescription>
          </CardHeader>
          <CardContent>
            {batchCalls.length === 0 ? (
              <div className="text-center py-8">
                <Phone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Noch keine Batch-Calls vorhanden</p>
                <BatchCallStarter onBatchStarted={fetchBatchCalls} />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Call Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Erstellt am</TableHead>
                    <TableHead>Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchCalls.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell className="font-medium">
                        {batch.callname || `Batch ${batch.batchid.slice(0, 8)}`}
                      </TableCell>
                      <TableCell>{getStatusBadge(batch.status)}</TableCell>
                      <TableCell>{formatDate(batch.created_at)}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchBatchAnswers(batch.batchid)}
                          disabled={answersLoading}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Ergebnisse
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Batch Answers Details */}
        {selectedBatch && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Batch Ergebnisse
              </CardTitle>
              <CardDescription>
                Detaillierte Ergebnisse für Batch {selectedBatch.slice(0, 8)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {answersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2">Lade Ergebnisse...</span>
                </div>
              ) : batchAnswers.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Noch keine Ergebnisse verfügbar</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Firma</TableHead>
                      <TableHead>Nummer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Dauer</TableHead>
                      <TableHead>Zeitpunkt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batchAnswers.map((answer) => (
                      <TableRow key={answer.id}>
                        <TableCell>
                          {[answer.vorname, answer.nachname].filter(Boolean).join(' ') || '-'}
                        </TableCell>
                        <TableCell>{answer.firma || '-'}</TableCell>
                        <TableCell className="font-mono">{answer.nummer}</TableCell>
                        <TableCell>{getCallStatusBadge(answer.call_status)}</TableCell>
                        <TableCell>{formatDuration(answer.anrufdauer)}</TableCell>
                        <TableCell>{formatTimestamp(answer.zeitpunkt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}