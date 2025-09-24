import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Phone, 
  CheckCircle, 
  TrendingUp, 
  Clock, 
  Filter, 
  Search,
  Calendar
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  
  const { toast } = useToast();

  useEffect(() => {
    loadCallLogs();
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  };

  const loadCallLogs = async () => {
    try {
      setLoading(true);
      
      // Get call logs with agent information
      const { data, error } = await supabase
        .from('call_logs')
        .select(`
          *,
          agents!inner(name, user_id)
        `)
        .order('call_timestamp_unix', { ascending: false });

      if (error) throw error;
      setCallLogs(data || []);
    } catch (error) {
      console.error('Error loading call logs:', error);
      toast({
        title: "Fehler",
        description: "Call-Logs konnten nicht geladen werden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatUnixTimestamp = (unixTimestamp: number) => {
    return new Date(unixTimestamp * 1000).toLocaleString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredCallLogs = selectedAgent === "all" 
    ? callLogs 
    : callLogs.filter(log => {
        const agent = agents.find(a => a.elevenlabs_agent_id === log.elevenlabs_agent_id);
        return agent?.id === selectedAgent;
      });

  const totalCalls = filteredCallLogs.length;
  const totalDuration = filteredCallLogs.reduce((sum, log) => sum + log.duration, 0);
  const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Übersicht über alle Ihre Telefonagenten-Aktivitäten</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamt Anrufe</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCalls}</div>
            <p className="text-xs text-muted-foreground">
              Alle aufgezeichneten Anrufe
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamtdauer</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(totalDuration)}</div>
            <p className="text-xs text-muted-foreground">
              Minuten:Sekunden
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ø Dauer</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(avgDuration)}</div>
            <p className="text-xs text-muted-foreground">
              Durchschnittliche Anrufdauer
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger>
                  <SelectValue placeholder="Agent auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Agenten</SelectItem>
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

      {/* Call Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Anruf-Logs
          </CardTitle>
          <CardDescription>
            Alle Anrufe Ihrer Agenten im Detail
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Lade Anrufdaten...</p>
            </div>
          ) : filteredCallLogs.length === 0 ? (
            <div className="text-center py-16">
              <Phone className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Noch keine Anrufdaten vorhanden</h3>
              <p className="text-muted-foreground mb-6">
                Sobald Sie Ihren ersten Agent erstellt und Anrufe getätigt haben, werden hier Ihre Statistiken und Call-Daten angezeigt.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Anrufer</TableHead>
                    <TableHead>Dauer</TableHead>
                    <TableHead>Zeitpunkt</TableHead>
                    <TableHead>Transkript</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCallLogs.map((log) => {
                    const agent = agents.find(a => a.elevenlabs_agent_id === log.elevenlabs_agent_id);
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">
                          {agent?.name || 'Unbekannt'}
                        </TableCell>
                        <TableCell>{log.caller_number}</TableCell>
                        <TableCell>{formatDuration(log.duration)}</TableCell>
                        <TableCell>{formatUnixTimestamp(log.call_timestamp_unix)}</TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate" title={log.transcript || 'Kein Transkript'}>
                            {log.transcript || 'Kein Transkript verfügbar'}
                          </div>
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