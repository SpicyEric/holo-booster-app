import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, File, Trash2, Download, Image, FileText } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface CustomerFileUploadProps {
  customerId: string;
}

type FileType = 'logo' | 'design' | 'document' | 'other';

export function CustomerFileUpload({ customerId }: CustomerFileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType>('design');
  const queryClient = useQueryClient();

  // Fetch customer files
  const { data: files, isLoading } = useQuery({
    queryKey: ['customer-files', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_files')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Delete file mutation
  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const file = files?.find(f => f.id === fileId);
      if (!file) throw new Error('File not found');

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('customer-assets')
        .remove([file.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('customer_files')
        .delete()
        .eq('id', fileId);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-files', customerId] });
      toast.success('Datei gelöscht');
    },
    onError: (error: any) => {
      toast.error('Fehler beim Löschen: ' + error.message);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Bitte wähle eine Datei aus');
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate unique file path
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${customerId}/${fileType}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('customer-assets')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Save metadata to database
      const { error: dbError } = await supabase
        .from('customer_files')
        .insert({
          customer_id: customerId,
          file_name: selectedFile.name,
          file_path: fileName,
          file_type: fileType,
          file_size: selectedFile.size,
          mime_type: selectedFile.type,
          uploaded_by_user_id: user.id,
          uploaded_by_email: user.email,
        });

      if (dbError) throw dbError;

      toast.success('Datei hochgeladen');
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ['customer-files', customerId] });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Fehler beim Hochladen: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const getFileUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from('customer-assets')
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return <File className="h-5 w-5" />;
    if (mimeType.startsWith('image/')) return <Image className="h-5 w-5" />;
    return <FileText className="h-5 w-5" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dateien & Assets</CardTitle>
        <CardDescription>
          Logo, Aufstellerdesigns und weitere Dateien für diesen Kunden
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Section */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="file-type">Datei-Typ</Label>
              <Select value={fileType} onValueChange={(value) => setFileType(value as FileType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="logo">Logo</SelectItem>
                  <SelectItem value="design">Aufstellerdesign</SelectItem>
                  <SelectItem value="document">Dokument</SelectItem>
                  <SelectItem value="other">Sonstiges</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="file-input">Datei auswählen</Label>
              <Input
                id="file-input"
                type="file"
                onChange={handleFileSelect}
                accept="image/*,application/pdf,.doc,.docx"
              />
            </div>
          </div>
          
          {selectedFile && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <File className="h-4 w-4" />
              <span>{selectedFile.name}</span>
              <span>({(selectedFile.size / 1024).toFixed(1)} KB)</span>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="w-full"
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? 'Lädt hoch...' : 'Datei hochladen'}
          </Button>
        </div>

        {/* Files List */}
        <div className="space-y-2">
          <h3 className="font-semibold">Hochgeladene Dateien</h3>
          
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Lädt...</div>
          ) : files && files.length > 0 ? (
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getFileIcon(file.mime_type)}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{file.file_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {file.file_type} • {(file.file_size || 0 / 1024).toFixed(1)} KB
                        {file.uploaded_by_email && ` • von ${file.uploaded_by_email}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                    >
                      <a
                        href={getFileUrl(file.file_path)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(file.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground p-4 text-center border rounded-lg">
              Noch keine Dateien hochgeladen
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}