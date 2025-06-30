import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Save, Trash2, Download, Upload } from "lucide-react";
import { Backlog } from "../hooks/use-backlogs";
import React from "react";


interface BacklogManagerProps {
  backlogs: Backlog[];
  onSave: (name: string) => void;
  onDelete: (id: string) => void;
  onLoad: (id: string) => void;
  onExport: (id: string) => void;
  currentData: any[];
}

export function BacklogManager({
  backlogs,
  onSave,
  onDelete,
  onLoad,
  onExport,
  currentData,
}: BacklogManagerProps) {
  const [backlogName, setBacklogName] = useState("");

  const getBacklogStats = () => {
    return backlogs.map((backlog) => ({
      name: backlog.title,
      count: backlog.content.length,
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-4">
        <div className="flex-1">
          <Label htmlFor="backlogName">Save Current Data as Backlog</Label>
          <Input
            id="backlogName"
            placeholder="Enter backlog name"
            value={backlogName}
            onChange={(e) => setBacklogName(e.target.value)}
            disabled={currentData.length === 0}
          />
        </div>
        <Button
          onClick={() => {
            onSave(backlogName);
            setBacklogName("");
          }}
          disabled={currentData.length === 0 || !backlogName.trim()}
        >
          <Save className="h-4 w-4 mr-2" />
          Save Backlog
        </Button>
      </div>

      {backlogs.length > 0 && (
        <>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getBacklogStats()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" name="Tickets" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Ticket Count</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backlogs.map((backlog) => (
                  <TableRow key={backlog.id}>
                    <TableCell className="font-medium">{backlog.title}</TableCell>
                    <TableCell>
                      {format(backlog.createdAt, "dd/MM/yyyy HH:mm", { locale: fr })}
                    </TableCell>
                    <TableCell>{backlog.content.length}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onLoad(backlog.id)}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Load
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onExport(backlog.id)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onDelete(backlog.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}