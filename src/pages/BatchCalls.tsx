import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Phone, Users } from "lucide-react";
import { BatchCallStarter } from "@/components/BatchCallStarter";

interface BatchCall {
  batchid: string;
  callname: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function BatchCalls() {
  const navigate = useNavigate();
  const [batchCalls, setBatchCalls] = useState<BatchCall[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchBatchCalls();
  }, []);

  const fetchBatchCalls = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-batch-calls');
      
      console.log('Batch calls response:', data, 'Error:', error);
      
      if (error) throw error;
      
      if (data?.success) {
        console.log('Setting batch calls:', data.items);
        setBatchCalls(data.items || []);
      } else {
        console.warn('No success flag in response:', data);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('de-DE');
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Batch-Call Übersicht
          </CardTitle>
          <CardDescription>
            Ihre letzten Batch-Calls
          </CardDescription>
        </CardHeader>
        <CardContent>
          {batchCalls.length === 0 ? (
            <div className="text-center py-8">
              <Phone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Noch keine Batch-Calls vorhanden</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Call Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Erstellt am</TableHead>
                  <TableHead>Aktualisiert am</TableHead>
                  <TableHead>Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batchCalls.map((batch) => (
                  <TableRow key={batch.batchid}>
                    <TableCell className="font-medium">
                      {batch.callname || `Batch ${batch.batchid.slice(0, 8)}`}
                    </TableCell>
                    <TableCell>{getStatusBadge(batch.status)}</TableCell>
                    <TableCell>{formatDate(batch.created_at)}</TableCell>
                    <TableCell>{formatDate(batch.updated_at)}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/batch-calls/${batch.batchid}`)}
                      >
                        Details ansehen
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}