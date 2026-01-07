import { useState, useRef } from "react";
import { Upload, File, X, AlertCircle } from "lucide-react";

export interface FileUploadProps {
  onFileSelect?: (file: File) => void;
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  className?: string;
  isLoading?: boolean;
}

export function FileUpload({
  onFileSelect,
  accept = "image/*,.pdf,.doc,.docx",
  maxSize = 5 * 1024 * 1024, // 5MB
  multiple = false,
  className = "",
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError("");

    const droppedFiles = Array.from(e.dataTransfer.files);

    if (droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");

    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      processFiles(selectedFiles);
    }
  };

  const processFiles = (newFiles: File[]) => {
    for (const file of newFiles) {
      // Check file size
      if (file.size > maxSize) {
        setError(
          `O arquivo ${file.name} excede o tamanho máximo de ${
            maxSize / 1024 / 1024
          }MB`
        );
        return;
      }

      // If single file, replace existing
      if (!multiple) {
        setFiles([file]);
        onFileSelect?.(file);
        return;
      }

      // Add to list if multiple
      setFiles((prev) => [...prev, file]);
      onFileSelect?.(file);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev];
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className={className}>
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-8
          text-center cursor-pointer transition-all
          ${
            isDragging
              ? "border-violet-500 bg-violet-50"
              : "border-slate-300 hover:border-violet-400 hover:bg-slate-50"
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center gap-3">
          <div
            className={`
              w-12 h-12 rounded-xl flex items-center justify-center transition-colors
              ${isDragging ? "bg-violet-100" : "bg-slate-100"}
            `}
          >
            <Upload
              className={`w-6 h-6 ${
                isDragging ? "text-violet-600" : "text-slate-500"
              }`}
            />
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700 mb-1">
              Clique ou arraste o arquivo aqui
            </p>
            <p className="text-xs text-slate-500">
              {multiple ? "Múltiplos arquivos" : "1 arquivo"} • Máximo{" "}
              {maxSize / 1024 / 1024}MB
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <File className="w-5 h-5 text-slate-500" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-slate-500">
                  {formatFileSize(file.size)}
                </p>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
