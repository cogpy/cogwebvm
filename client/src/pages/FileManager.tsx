import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Upload, File, Trash2, Download, FileText, Image, FileVideo, FileAudio } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

export default function FileManager() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const utils = trpc.useUtils();
  const { data: files, isLoading } = trpc.files.list.useQuery();
  const uploadMutation = trpc.files.upload.useMutation({
    onSuccess: () => {
      toast.success("File uploaded successfully");
      utils.files.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });
  const deleteMutation = trpc.files.delete.useMutation({
    onSuccess: () => {
      toast.success("File deleted");
      utils.files.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        const base64Content = content.split(",")[1]; // Remove data:image/png;base64, prefix

        await uploadMutation.mutateAsync({
          filename: file.name,
          content: base64Content!,
          mimeType: file.type,
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  };

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return <File className="w-6 h-6" />;
    if (mimeType.startsWith("image/")) return <Image className="w-6 h-6" />;
    if (mimeType.startsWith("video/")) return <FileVideo className="w-6 h-6" />;
    if (mimeType.startsWith("audio/")) return <FileAudio className="w-6 h-6" />;
    return <FileText className="w-6 h-6" />;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-mono">FILE STORAGE</h1>
          <p className="text-muted-foreground mt-2">
            Upload and manage your files with S3-backed storage
          </p>
        </div>

        {/* Upload Area */}
        <Card
          className={`p-8 border-2 border-dashed transition-colors ${
            dragActive ? "border-primary bg-primary/10" : "border-border"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center gap-4">
            <Upload className="w-12 h-12 text-muted-foreground" />
            <div className="text-center">
              <p className="text-lg font-semibold">Drop files here or click to upload</p>
              <p className="text-sm text-muted-foreground mt-1">
                Supports all file types
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Select File"}
            </Button>
          </div>
        </Card>

        {/* Files List */}
        <div>
          <h2 className="text-xl font-bold mb-4">Your Files</h2>
          {isLoading ? (
            <p className="text-muted-foreground">Loading files...</p>
          ) : files && files.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {files.map((file) => (
                <Card key={file.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-primary">{getFileIcon(file.mimeType)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{file.filename}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(file.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(file.url, "_blank")}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm("Delete this file?")) {
                            deleteMutation.mutate({ fileId: file.id });
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No files uploaded yet</p>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
