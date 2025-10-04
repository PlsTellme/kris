import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, FileText, RefreshCw, Download, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface BatchAnswer {
  lead_id: string;
  vorname: string;
  nachname: string;
  firma: string;
  nummer: string;
  zeitpunkt: number;
  anrufdauer: number;
  transcript: string;
  callname: string;
  call_status: string;
}

interface BatchInfo {
  status: string;
  callname: string;
}

export default function BatchCallDetails() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const [batchAnswers, setBatchAnswers] = useState<BatchAnswer[]>([]);
  const [batchInfo, setBatchInfo] = useState<BatchInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Map to store answers by lead_id for deduplication
  const [answersMap, setAnswersMap] = useState<Map<string, BatchAnswer>>(new Map());

  useEffect(() => {
    if (batchId) {
      fetchBatchInfo();
      fetchBatchAnswers();
    }
  }, [batchId]);

  const fetchBatchInfo = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-batch-calls', {
        body: { page: 1, pageSize: 100 }
      });
      
      if (error) throw error;
      
      if (data?.success && data.items) {
        const batch = data.items.find((b: any) => b.batchid === batchId);
        if (batch) {
          setBatchInfo({
            status: batch.status,
            callname: batch.callname
          });
        }
      }
    } catch (error: any) {
      console.error('Error fetching batch info:', error);
    }
  };

  const fetchBatchAnswers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-batch-answers', {
        body: { batchid: batchId }
      });
      
      if (error) throw error;
      
      if (data?.success && data.data) {
        mergeAnswers(data.data);
      }
    } catch (error: any) {
      console.error('Error fetching batch answers:', error);
      toast({
        title: "Fehler",
        description: "Batch-Antworten konnten nicht geladen werden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const mergeAnswers = (incoming: BatchAnswer[]) => {
    const newMap = new Map(answersMap);
    let added = 0;
    
    for (const row of incoming) {
      if (!newMap.has(row.lead_id)) {
        newMap.set(row.lead_id, row);
        added++;
      }
    }
    
    setAnswersMap(newMap);
    
    // Sort by zeitpunkt descending
    const sortedList = Array.from(newMap.values())
      .sort((a, b) => b.zeitpunkt - a.zeitpunkt);
    
    setBatchAnswers(sortedList);
    
    return added;
  };

  const handleManualSync = async () => {
    if (!batchId || syncing) return;
    
    setSyncing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('get-batch-answers', {
        body: { batchid: batchId }
      });
      
      if (error) throw error;
      
      if (data?.success && data.data) {
        const added = mergeAnswers(data.data);
        
        if (added > 0) {
          toast({
            title: "Synchronisierung erfolgreich",
            description: `${added} neue ${added === 1 ? 'Ergebnis' : 'Ergebnisse'} hinzugefügt`,
          });
        } else {
          toast({
            title: "Synchronisierung erfolgreich",
            description: "Keine neuen Ergebnisse",
          });
        }
        
        // Refresh batch info
        await fetchBatchInfo();
      }
    } catch (error: any) {
      console.error('Error syncing:', error);
      toast({
        title: "Fehler",
        description: "Synchronisierung fehlgeschlagen. Bitte erneut versuchen.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const toggleRowExpansion = (answerId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(answerId)) {
      newExpanded.delete(answerId);
    } else {
      newExpanded.add(answerId);
    }
    setExpandedRows(newExpanded);
  };

  const getRowClassName = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-500/10 hover:bg-green-500/20';
      case 'no_answer':
        return 'bg-yellow-500/10 hover:bg-yellow-500/20';
      case 'failed':
        return 'bg-red-500/10 hover:bg-red-500/20';
      default:
        return 'hover:bg-muted/50';
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds === 0) return "–";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return "–";
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const exportToCSV = () => {
    if (batchAnswers.length === 0) {
      toast({
        title: "Keine Daten",
        description: "Es gibt keine Ergebnisse zum Exportieren",
        variant: "destructive",
      });
      return;
    }

    const headers = [
      "lead_id",
      "vorname",
      "nachname",
      "firma",
      "nummer",
      "callname",
      "zeitpunkt_iso",
      "anrufdauer_sekunden",
      "call_status",
      "transcript"
    ];

    const rows = batchAnswers.map(answer => [
      answer.lead_id || "",
      answer.vorname || "",
      answer.nachname || "",
      answer.firma || "",
      answer.nummer || "",
      answer.callname || "",
      answer.zeitpunkt ? new Date(answer.zeitpunkt * 1000).toISOString() : "",
      answer.anrufdauer?.toString() || "0",
      answer.call_status || "",
      (answer.transcript || "").replace(/"/g, '""')
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `batch_${batchId?.slice(0, 8)}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export erfolgreich",
      description: `${batchAnswers.length} Ergebnisse exportiert`,
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Lade Batch-Details...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Batch Ergebnisse</h1>
          <p className="text-muted-foreground">
            Detaillierte Ergebnisse für Batch {batchId?.slice(0, 8)}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/batch-calls')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück zur Liste
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Anruf-Ergebnisse
          </CardTitle>
          <div className="flex items-center justify-between">
            <CardDescription>
              Alle Anrufe für diesen Batch
            </CardDescription>
            <div className="flex items-center gap-2">
              {batchInfo && (
                <div className="text-sm">
                  Batch-Status: {batchInfo.status === 'completed' ? (
                    <Badge variant="default">Abgeschlossen</Badge>
                  ) : (
                    <Badge variant="secondary">Läuft</Badge>
                  )}
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                disabled={syncing || batchAnswers.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                CSV Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualSync}
                disabled={syncing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                Jetzt synchronisieren
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Lade Ergebnisse...</span>
            </div>
          ) : batchAnswers.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                Noch keine Ergebnisse verfügbar
              </p>
              <Button 
                onClick={handleManualSync} 
                variant="outline"
                disabled={syncing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                Jetzt synchronisieren
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left border-r border-border/40">Lead</TableHead>
                    <TableHead className="text-left border-r border-border/40">Firma</TableHead>
                    <TableHead className="text-left border-r border-border/40">Nummer</TableHead>
                    <TableHead className="text-left border-r border-border/40">Call Name</TableHead>
                    <TableHead className="text-left border-r border-border/40">Zeitpunkt</TableHead>
                    <TableHead className="text-left border-r border-border/40">Dauer</TableHead>
                    <TableHead className="text-left">Transcript</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                  {batchAnswers.map((answer) => {
                    const isExpanded = expandedRows.has(answer.lead_id);
                    return (
                      <TableRow 
                        key={answer.lead_id} 
                        className={`border-b ${getRowClassName(answer.call_status)}`}
                      >
                        <TableCell className="text-left align-top border-r border-border/40">
                          {[answer.vorname, answer.nachname].filter(Boolean).join(' ') || '–'}
                        </TableCell>
                        <TableCell className="text-left align-top border-r border-border/40">{answer.firma || '–'}</TableCell>
                        <TableCell className="text-left align-top font-mono text-sm border-r border-border/40">{answer.nummer || '–'}</TableCell>
                        <TableCell className="text-left align-top border-r border-border/40">{answer.callname || '–'}</TableCell>
                        <TableCell className="text-left align-top text-sm border-r border-border/40">{formatTimestamp(answer.zeitpunkt)}</TableCell>
                        <TableCell className="text-left align-top font-mono text-sm border-r border-border/40">{formatDuration(answer.anrufdauer)}</TableCell>
                        <TableCell className="text-left align-top">
                          <Collapsible open={isExpanded} onOpenChange={() => toggleRowExpansion(answer.lead_id)}>
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="gap-2">
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                                Transcript anzeigen
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-2">
                              <div className="text-sm whitespace-pre-wrap break-words p-3 bg-muted/30 rounded-md">
                                {answer.transcript || '–'}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}