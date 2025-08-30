import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  File, 
  FileText, 
  FileSpreadsheet, 
  FileImage, 
  X, 
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

interface FileUpload {
  id?: number;
  file: File;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  preview?: string;
}

interface FileUploadSectionProps {
  onFilesChange?: (files: FileUpload[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // in MB
  acceptedTypes?: string[];
}

export function FileUploadSection({ 
  onFilesChange,
  maxFiles = 10,
  maxFileSize = 50,
  acceptedTypes = [
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png'
  ]
}: FileUploadSectionProps) {
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return <FileText className="h-6 w-6 text-red-500" />;
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <FileSpreadsheet className="h-6 w-6 text-green-500" />;
    if (mimeType.includes('word')) return <FileText className="h-6 w-6 text-blue-500" />;
    if (mimeType.includes('image')) return <FileImage className="h-6 w-6 text-purple-500" />;
    return <File className="h-6 w-6 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File size must be less than ${maxFileSize}MB`;
    }

    // Check file type
    if (!acceptedTypes.includes(file.type)) {
      return 'File type not supported';
    }

    // Check total number of files
    if (files.length >= maxFiles) {
      return `Maximum ${maxFiles} files allowed`;
    }

    return null;
  };

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    setUploadError(null);
    const newFiles: FileUpload[] = [];

    Array.from(selectedFiles).forEach((file: File) => {
      const error = validateFile(file);
      if (error) {
        setUploadError(error);
        return;
      }

      const fileUpload: FileUpload = {
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'pending'
      };

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          fileUpload.preview = e.target?.result as string;
          setFiles(prev => [...prev]);
        };
        reader.readAsDataURL(file);
      }

      newFiles.push(fileUpload);
    });

    setFiles(prev => [...prev, ...newFiles]);
    onFilesChange?.([...files, ...newFiles]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onFilesChange?.(updatedFiles);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  // Simulate upload process for demo
  const uploadFile = async (fileUpload: FileUpload, index: number) => {
    setFiles(prev => {
      const updated = [...prev];
      updated[index].status = 'uploading';
      return updated;
    });

    // Simulate upload delay for demonstration
    setTimeout(() => {
      setFiles(prev => {
        const updated = [...prev];
        updated[index].status = 'success';
        updated[index].id = Date.now() + index; // Generate unique ID
        return updated;
      });
    }, 2000);
  };

  const uploadAllFiles = () => {
    files.forEach((file, index) => {
      if (file.status === 'pending') {
        uploadFile(file, index);
      }
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'uploading':
        return <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Card className="card-animate">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="h-5 w-5 text-blue-600" />
          <span>Supporting Documents</span>
        </CardTitle>
        <CardDescription>
          Upload Excel spreadsheets, PDFs, or other supporting documents for your budget request
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Upload Files
          </h3>
          <p className="text-gray-600 mb-4">
            Drag and drop files here, or click to browse
          </p>
          
          <Button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="mb-4"
          >
            <Upload className="h-4 w-4 mr-2" />
            Browse Files
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept={acceptedTypes.join(',')}
            onChange={(e) => handleFileSelect(e.target.files)}
          />
          
          <div className="text-xs text-gray-500 space-y-1">
            <p>Supported formats: PDF, Excel, Word, Images</p>
            <p>Maximum file size: {maxFileSize}MB</p>
            <p>Maximum files: {maxFiles}</p>
          </div>
        </div>

        {/* Error Alert */}
        {uploadError && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {uploadError}
            </AlertDescription>
          </Alert>
        )}

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Uploaded Files ({files.length}/{maxFiles})</Label>
              {files.some(f => f.status === 'pending') && (
                <Button 
                  type="button"
                  onClick={uploadAllFiles}
                  size="sm"
                  className="btn-gov-primary"
                >
                  Upload All
                </Button>
              )}
            </div>
            
            <div className="grid gap-3">
              {files.map((fileUpload: FileUpload, index: number) => (
                <Card key={index} className="p-4 border border-gray-200">
                  <div className="flex items-center space-x-3">
                    {getFileIcon(fileUpload.type)}
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {fileUpload.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(fileUpload.size)}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={fileUpload.status === 'success' ? 'default' : 'secondary'}
                        className={
                          fileUpload.status === 'success' ? 'bg-green-100 text-green-800' :
                          fileUpload.status === 'error' ? 'bg-red-100 text-red-800' :
                          fileUpload.status === 'uploading' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }
                      >
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(fileUpload.status)}
                          <span className="capitalize">{fileUpload.status}</span>
                        </div>
                      </Badge>
                      
                      {fileUpload.status === 'pending' && (
                        <Button
                          type="button"
                          onClick={() => uploadFile(fileUpload, index)}
                          size="sm"
                          variant="outline"
                        >
                          Upload
                        </Button>
                      )}
                      
                      <Button
                        type="button"
                        onClick={() => removeFile(index)}
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {fileUpload.preview && (
                    <div className="mt-3">
                      <img 
                        src={fileUpload.preview} 
                        alt="Preview" 
                        className="h-20 w-20 object-cover rounded border"
                      />
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}
        
        {files.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No files uploaded yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}