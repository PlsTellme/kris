import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { 
  Phone, 
  CheckCircle, 
  TrendingUp, 
  Clock, 
  Filter, 
  Search,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronRight,
  FileText,
  User,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatInTimeZone } from "date-fns-tz";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [expandedTranscripts, setExpandedTranscripts] = useState<Set<string>>(new Set());
  
  // Filter states
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [phoneFilter, setPhoneFilter] = useState("");
  
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
      
      // Get call logs - RLS will automatically filter by user's agents
      const { data, error } = await supabase
        .from('call_logs')
        .select('*')
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
    try {
      // Convert unix timestamp to Date and format for Europe/Paris timezone
      const date = new Date(unixTimestamp * 1000);
      return formatInTimeZone(date, 'Europe/Paris', 'dd.MM.yyyy HH:mm:ss');
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Ungültiges Datum';
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTranscript = (logId: string) => {
    const newExpanded = new Set(expandedTranscripts);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedTranscripts(newExpanded);
  };

  const getAgentName = (elevenlabsAgentId: string) => {
    const agent = agents.find(a => a.elevenlabs_agent_id === elevenlabsAgentId);
    return agent?.name || 'Unbekannter Agent';
  };

  const clearFilters = () => {
    setSelectedAgent("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setPhoneFilter("");
  };

  const filteredCallLogs = callLogs.filter(log => {
    // Agent filter
    if (selectedAgent !== "all") {
      const agent = agents.find(a => a.elevenlabs_agent_id === log.elevenlabs_agent_id);
      if (agent?.id !== selectedAgent) return false;
    }
    
    // Date range filter
    if (dateFrom || dateTo) {
      const logDate = new Date(log.call_timestamp_unix * 1000);
      if (dateFrom && logDate < dateFrom) return false;
      if (dateTo && logDate > new Date(dateTo.getTime() + 24 * 60 * 60 * 1000 - 1)) return false;
    }
    
    // Phone number filter
    if (phoneFilter && !log.caller_number.includes(phoneFilter)) return false;
    
    return true;
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

      {/* Enhanced Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter & Suche
            </CardTitle>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Filter zurücksetzen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Agent Filter */}
            <div className="space-y-2">
              <Label>Agent</Label>
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

            {/* Date From */}
            <div className="space-y-2">
              <Label>Von Datum</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "dd.MM.yyyy") : "Datum wählen"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Date To */}
            <div className="space-y-2">
              <Label>Bis Datum</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "dd.MM.yyyy") : "Datum wählen"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Phone Filter */}
            <div className="space-y-2">
              <Label>Telefonnummer</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nummer suchen..."
                  value={phoneFilter}
                  onChange={(e) => setPhoneFilter(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
          
          {/* Active Filters Display */}
          {(selectedAgent !== "all" || dateFrom || dateTo || phoneFilter) && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Aktive Filter:</span>
              {selectedAgent !== "all" && (
                <Badge variant="secondary">
                  Agent: {agents.find(a => a.id === selectedAgent)?.name}
                </Badge>
              )}
              {dateFrom && (
                <Badge variant="secondary">
                  Von: {format(dateFrom, "dd.MM.yyyy")}
                </Badge>
              )}
              {dateTo && (
                <Badge variant="secondary">
                  Bis: {format(dateTo, "dd.MM.yyyy")}
                </Badge>
              )}
              {phoneFilter && (
                <Badge variant="secondary">
                  Nummer: {phoneFilter}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Call Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Anruf-Logs
            <Badge variant="outline" className="ml-2">
              {filteredCallLogs.length} {filteredCallLogs.length === 1 ? 'Anruf' : 'Anrufe'}
            </Badge>
          </CardTitle>
          <CardDescription>
            Alle Anrufe Ihrer Agenten im Detail
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Lade Anrufdaten...</p>
            </div>
          ) : filteredCallLogs.length === 0 ? (
            <div className="text-center py-16">
              <Phone className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                {callLogs.length === 0 ? 'Noch keine Anrufdaten vorhanden' : 'Keine Anrufe gefunden'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {callLogs.length === 0 
                  ? 'Sobald Sie Ihren ersten Agent erstellt und Anrufe getätigt haben, werden hier Ihre Statistiken und Call-Daten angezeigt.'
                  : 'Versuchen Sie andere Filtereinstellungen oder setzen Sie die Filter zurück.'
                }
              </p>
              {callLogs.length > 0 && (
                <Button variant="outline" onClick={clearFilters}>
                  Filter zurücksetzen
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {filteredCallLogs.map((log) => (
                <Card key={log.id} className="border-l-4 border-l-primary/30 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    {/* Main Call Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
                      {/* Agent */}
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Agent</p>
                          <p className="font-medium text-lg">{getAgentName(log.elevenlabs_agent_id)}</p>
                        </div>
                      </div>
                      
                      {/* Date/Time */}
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <CalendarIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Anrufdatum</p>
                          <p className="font-medium text-lg">{formatUnixTimestamp(log.call_timestamp_unix)}</p>
                        </div>
                      </div>
                      
                      {/* Duration */}
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-50 rounded-lg">
                          <Clock className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Dauer</p>
                          <p className="font-medium text-lg">{formatDuration(log.duration)}</p>
                        </div>
                      </div>
                      
                      {/* Caller */}
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-50 rounded-lg">
                          <Phone className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Anrufer</p>
                          <p className="font-medium text-lg">{log.caller_number}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Transcript Section */}
                    <div className="border-t pt-4">
                      {log.transcript ? (
                        <div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleTranscript(log.id)}
                            className="flex items-center gap-2 hover:bg-muted/50"
                          >
                            <FileText className="h-4 w-4" />
                            <span className="font-medium">Transkript anzeigen</span>
                            {expandedTranscripts.has(log.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                          
                          {expandedTranscripts.has(log.id) && (
                            <div className="mt-4 p-4 bg-gradient-to-r from-muted/30 to-muted/10 rounded-lg border">
                              <div className="flex items-center gap-2 mb-3">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                                  Gesprächstranskript
                                </h4>
                              </div>
                              <div className="prose prose-sm max-w-none">
                                <p className="text-sm leading-relaxed whitespace-pre-wrap bg-background/50 p-3 rounded border">
                                  {log.transcript}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <FileText className="h-4 w-4" />
                          <Badge variant="secondary" className="text-xs">
                            Kein Transkript verfügbar
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}