import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Phone, 
  CheckCircle, 
  TrendingUp, 
  Clock, 
  Filter, 
  Search,
  Calendar
} from "lucide-react";

export default function Dashboard() {
  // Mock data for the dashboard
  const stats = [
    {
      title: "Gesamte Anrufe",
      value: "6",
      icon: Phone,
      color: "text-blue-600",
    },
    {
      title: "Erreicht",
      value: "5",
      icon: CheckCircle,
      color: "text-green-600",
    },
    {
      title: "Termin gebucht",
      value: "17%",
      icon: TrendingUp,
      color: "text-primary",
    },
    {
      title: "Ø Dauer",
      value: "0:31",
      icon: Clock,
      color: "text-orange-600",
    },
  ];

  const callData = [
    {
      name: "Max Mustermann",
      phone: "+436776241640S",
      script: "Bestandskunden Serviceanruf",
      vertreter: "Herr Schuster",
      mailbox: "Nein",
      interesse: "Nein",
      termin: "Nein",
      zeitpunkt: "23.09.2025 16:54",
    },
    {
      name: "Max Mustermann",
      phone: "+491764364637",
      script: "Bestandskunden Serviceanruf",
      vertreter: "Jannek Drexl",
      mailbox: "Nein",
      interesse: "Nein",
      termin: "Nein",
      zeitpunkt: "23.09.2025 16:04",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Anruf-Dashboard</h1>
        <p className="text-muted-foreground">Übersicht über alle Ihre Telefonagenten-Aktivitäten</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter & Search */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter & Suche
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nach Name, Telefon, Versicherung suchen..."
                  className="pl-10"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input type="date" placeholder="tt.mm.jjjj" />
              </div>
              <div className="text-muted-foreground text-sm flex items-center justify-center">
                bis
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input type="date" placeholder="tt.mm.jjjj" />
              </div>
            </div>
            <Select defaultValue="alle-agenten">
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle-agenten">Alle Agenten</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Call Overview */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Anruf-Übersicht</CardTitle>
          <CardDescription>
            Detaillierte Übersicht aller Anrufe (6 von 6)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Telefon</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Skript</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Vertreter</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Mailbox</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Interesse</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Termin</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Zeitpunkt Batch</th>
                  </tr>
                </thead>
                <tbody>
                  {callData.map((call, index) => (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-3 text-sm font-medium">{call.name}</td>
                      <td className="px-4 py-3 text-sm">{call.phone}</td>
                      <td className="px-4 py-3 text-sm">{call.script}</td>
                      <td className="px-4 py-3 text-sm">{call.vertreter}</td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant="secondary">{call.mailbox}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant="secondary">{call.interesse}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant="secondary">{call.termin}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {call.zeitpunkt}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}