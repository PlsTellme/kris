import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Clock, FileText, RefreshCw, Download, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  lead_id: string;
}

interface BatchInfo {
  status: string;
  total_calls: number;
}

export default function BatchCallDetails() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const [batchAnswers, setBatchAnswers] = useState<BatchAnswer[]>([]);
  const [batchInfo, setBatchInfo] = useState<BatchInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    if (batchId) {
      syncAndFetchResults(batchId);
    }

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [batchId]);

  // Start polling only after we have batch info
  useEffect(() => {
    if (batchId && batchInfo && batchInfo.status !== 'completed') {
      startPolling(batchId);
    }
    
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [batchInfo?.status]);

  const syncAndFetchResults = async (batchid: string) => {
    setLoading(true);
    
    try {
      // Step 1: Sync with ElevenLabs (fallback mechanism)
      const { data: syncData, error: syncError } = await supabase.functions.invoke('fetch-batch-results', {
        body: { batchid }
      });

      if (syncError) {
        console.warn('Sync failed, proceeding with database data:', syncError);
      } else {
        console.log('Sync completed:', syncData);
      }

      // Step 2: Fetch current results from database
      const { data: answersData, error: answersError } = await supabase.functions.invoke('get-batch-answers', {
        body: { batchid }
      });
      
      if (answersError) throw answersError;
      
      if (answersData.success) {
        setBatchAnswers(answersData.data || []);
        
        // Set batch info from sync data or default
        setBatchInfo(syncData?.batch_info || { status: 'unknown', total_calls: answersData.data?.length || 0 });
        
        if (!answersData.data || answersData.data.length === 0) {
          toast({
            title: "Keine Ergebnisse",
            description: "Die Anrufe sind möglicherweise noch nicht abgeschlossen. Auto-Aktualisierung läuft...",
          });
        }
      }
    } catch (error: any) {
      console.error('Error fetching batch results:', error);
      toast({
        title: "Fehler",
        description: "Batch-Antworten konnten nicht geladen werden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (batchid: string) => {
    // Only poll if batch is not completed
    if (batchInfo?.status === 'completed') {
      return;
    }

    // Clear existing polling
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    // Start new polling every 5 seconds
    const interval = setInterval(async () => {
      console.log('Auto-refreshing batch results...');
      await syncAndFetchResults(batchid);
      
      // Check if batch is now completed and stop polling
      if (batchInfo?.status === 'completed') {
        clearInterval(interval);
        setPollingInterval(null);
      }
    }, 5000);

    setPollingInterval(interval);
  };

  const handleManualRefresh = async () => {
    if (!batchId) return;
    
    toast({
      title: "Synchronisierung",
      description: "Daten werden aktualisiert...",
    });
    
    await syncAndFetchResults(batchId);
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
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('de-DE');
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
                disabled={loading || batchAnswers.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                CSV Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
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
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                Noch keine Ergebnisse verfügbar. 
                {pollingInterval ? " Auto-Aktualisierung läuft..." : ""}
              </p>
              <Button 
                onClick={handleManualRefresh} 
                variant="outline"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Jetzt synchronisieren
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left">Lead</TableHead>
                    <TableHead className="text-left">Firma</TableHead>
                    <TableHead className="text-left">Nummer</TableHead>
                    <TableHead className="text-left">Call Name</TableHead>
                    <TableHead className="text-left">Zeitpunkt</TableHead>
                    <TableHead className="text-left">Dauer</TableHead>
                    <TableHead className="text-left">Transcript</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchAnswers.map((answer) => {
                    const isExpanded = expandedRows.has(answer.id);
                    return (
                      <TableRow 
                        key={answer.id} 
                        className={`border-b ${getRowClassName(answer.call_status)}`}
                      >
                        <TableCell className="text-left">
                          {[answer.vorname, answer.nachname].filter(Boolean).join(' ') || '–'}
                        </TableCell>
                        <TableCell className="text-left">{answer.firma || '–'}</TableCell>
                        <TableCell className="text-left font-mono text-sm">{answer.nummer || '–'}</TableCell>
                        <TableCell className="text-left">{answer.callname || '–'}</TableCell>
                        <TableCell className="text-left text-sm">{formatTimestamp(answer.zeitpunkt)}</TableCell>
                        <TableCell className="text-left font-mono text-sm">{formatDuration(answer.anrufdauer)}</TableCell>
                        <TableCell className="text-left">
                          <Collapsible open={isExpanded} onOpenChange={() => toggleRowExpansion(answer.id)}>
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
              
              {pollingInterval && batchInfo?.status !== 'completed' && (
                <div className="text-center py-2">
                  <p className="text-sm text-muted-foreground">
                    Auto-Aktualisierung läuft... Nächste Aktualisierung in 5 Sekunden
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}