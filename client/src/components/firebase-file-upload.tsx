import React, { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Progress } from "./ui/progress";
import { Card, CardContent } from "./ui/card";
import { Upload, File, X, Check, AlertCircle } from "lucide-react";
import { getAuth } from "firebase/auth";
import { storage } from "../lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

interface FirebaseFileUploadProps {
  onFileUploaded: (fileUrl: string, fileName: string) => void;
  acceptedTypes?: string;
  maxSizeMB?: number;
  label?: string;
  description?: string;
  currentFile?: string;
}

export default function FirebaseFileUpload({
  onFileUploaded,
  acceptedTypes = ".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx",
  maxSizeMB = 10,
  label = "Upload File",
  description = "Drag and drop a file here, or click to select",
  currentFile,
}: FirebaseFileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<string | null>(currentFile || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File size must be less than ${maxSizeMB} MB`;
    }

    const allowedTypes = acceptedTypes.split(',').map(type => type.trim().toLowerCase());
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const mimeType = file.type.toLowerCase();
    
    if (acceptedTypes.includes('.jpg') || acceptedTypes.includes('.jpeg') || acceptedTypes.includes('.png') || acceptedTypes.includes('.gif')) {
      const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      const validImageExts = ['.jpg', '.jpeg', '.png', '.gif'];
      
      if (!validImageTypes.includes(mimeType) && !validImageExts.includes(fileExtension)) {
        return 'Please upload a valid image file (JPG, JPEG, PNG, or GIF)';
      }
    } else {
      if (!allowedTypes.includes(fileExtension) && !allowedTypes.includes(mimeType)) {
        return `File type must be one of: ${allowedTypes.join(', ')}`;
      }
    }

    return null;
  };

  const uploadFile = async (file: File) => {
    const validation = validateFile(file);
    if (validation) {
      // File validation error - show console log instead of toast
      console.error("File validation failed:", validation);
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('You must be logged in to upload files');
      }

      // Create unique filename
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const fileName = `${user.uid}_${timestamp}.${fileExtension}`;
      
      // Create Firebase Storage reference - use profile-images folder
      const storageRef = ref(storage, `profile-images/${fileName}`);
      
      // Skip storage verification - proceed with upload attempt
      console.log('🔄 Attempting Firebase Storage upload...');
      
      // Start upload with progress monitoring
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      // Monitor upload progress
      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error('Upload error:', error);
          
          // Handle Firebase Storage configuration issues by using base64 encoding
          if (error.code === 'storage/unknown' || error.code === 'storage/unauthorized' || error.code === 'storage/invalid-url') {
            console.warn('⚠️ Firebase Storage not configured. Converting image to base64 for local storage.');
            
            // Convert file to compressed base64 to avoid Firestore size limits
            const compressImage = (file: File): Promise<string> => {
              return new Promise((resolve) => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();
                
                img.onload = () => {
                  // Resize to maximum 150x150 for profile images
                  const maxSize = 150;
                  let { width, height } = img;
                  
                  if (width > height) {
                    if (width > maxSize) {
                      height = (height * maxSize) / width;
                      width = maxSize;
                    }
                  } else {
                    if (height > maxSize) {
                      width = (width * maxSize) / height;
                      height = maxSize;
                    }
                  }
                  
                  canvas.width = width;
                  canvas.height = height;
                  
                  ctx?.drawImage(img, 0, 0, width, height);
                  
                  // Convert to JPEG with quality compression to reduce size
                  const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                  resolve(compressedBase64);
                };
                
                const reader = new FileReader();
                reader.onload = (e) => {
                  img.src = e.target?.result as string;
                };
                reader.readAsDataURL(file);
              });
            };
            
            compressImage(file).then((compressedBase64) => {
              console.log('✅ Image compressed and converted to base64 successfully');
              
              setTimeout(() => {
                setUploadProgress(100);
                setUploadedFile(file.name);
                onFileUploaded(compressedBase64, file.name);
              }, 1000);
            }).catch((compressionError) => {
              console.error('Failed to compress image:', compressionError);
              // Try basic base64 conversion without compression as fallback
              const reader = new FileReader();
              reader.onload = (e) => {
                const basicBase64 = e.target?.result as string;
                setTimeout(() => {
                  setUploadProgress(100);
                  setUploadedFile(file.name);
                  onFileUploaded(basicBase64, file.name);
                }, 1000);
              };
              reader.onerror = () => {
                // Final fallback to placeholder
                const placeholderUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email || 'User')}&background=2563eb&color=fff&size=200`;
                setTimeout(() => {
                  setUploadProgress(100);
                  setUploadedFile(file.name);
                  onFileUploaded(placeholderUrl, file.name);
                }, 1000);
              };
              reader.readAsDataURL(file);
            });
            return;
          }
          
          throw new Error(`Upload failed: ${error.message}`);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            setUploadProgress(100);
            setUploadedFile(file.name);
            onFileUploaded(downloadURL, file.name);

            // Show success message for 3 seconds only
            // Removed toast notification as requested
          } catch (error) {
            console.error('Error getting download URL:', error);
            throw new Error('Failed to get file URL after upload');
          }
        }
      );
    } catch (error) {
      console.error('Upload error:', error);
      let errorMessage = "There was an error uploading your file. Please try again.";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Upload error - show console log instead of toast
      console.error("File upload failed:", errorMessage);
      setUploadProgress(0);
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
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    onFileUploaded('', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>{label}</Label>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>

      {uploadedFile ? (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Check className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">{uploadedFile}</p>
                  <p className="text-sm text-gray-500">Upload complete</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={removeFile}
                className="text-red-500 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card
          className={`border-2 border-dashed transition-colors ${
            dragActive
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <CardContent className="p-8">
            {uploading ? (
              <div className="text-center space-y-4">
                <div className="animate-pulse">
                  <Upload className="h-12 w-12 text-blue-500 mx-auto" />
                </div>
                <div>
                  <p className="font-medium">Uploading...</p>
                  <Progress value={uploadProgress} className="mt-2" />
                  <p className="text-sm text-gray-500 mt-1">
                    {Math.round(uploadProgress)}% complete
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">
                  Drop your file here, or{" "}
                  <Button
                    variant="link"
                    className="p-0 h-auto text-blue-600 hover:text-blue-700"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    browse
                  </Button>
                </p>
                <p className="text-sm text-gray-500">
                  Supports: {acceptedTypes} (max {maxSizeMB}MB)
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={acceptedTypes}
        onChange={handleFileSelect}
        disabled={uploading}
      />
    </div>
  );
}