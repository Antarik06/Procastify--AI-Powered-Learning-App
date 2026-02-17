import { storage } from "../firebaseConfig";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  UploadTaskSnapshot,
} from "firebase/storage";
import { UploadResult, ValidationResult } from "../types";
import { validateFileType, validateFileSize } from "../utils/studyResourceValidation";

/**
 * Service for handling file uploads to Firebase Storage
 */
export const StudyResourceUploadService = {
  /**
   * Uploads a file to Firebase Storage with progress tracking
   */
  uploadFile: async (
    file: File,
    userId: string,
    resourceId: string,
    onProgress?: (progress: number) => void
  ): Promise<UploadResult> => {
    try {
      // Validate file before upload
      const validation = StudyResourceUploadService.validateFile(file);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(", "));
      }

      // Create storage reference
      const storagePath = `studyResources/${userId}/${resourceId}/${file.name}`;
      const storageRef = ref(storage, storagePath);

      // Create upload task
      const uploadTask = uploadBytesResumable(storageRef, file);

      // Return promise that resolves when upload completes
      return new Promise((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot: UploadTaskSnapshot) => {
            // Calculate and report progress
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress) {
              onProgress(Math.round(progress));
            }
          },
          (error) => {
            // Handle upload errors
            console.error("Upload error:", error);
            reject(new Error(`Upload failed: ${error.message}`));
          },
          async () => {
            // Upload completed successfully
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve({
                fileUrl: downloadURL,
                fileName: file.name,
                fileSize: file.size,
                mimeType: file.type,
              });
            } catch (error: any) {
              reject(new Error(`Failed to get download URL: ${error.message}`));
            }
          }
        );
      });
    } catch (error: any) {
      console.error("Error uploading file:", error);
      throw error;
    }
  },

  /**
   * Deletes a file from Firebase Storage
   */
  deleteFile: async (fileUrl: string): Promise<void> => {
    try {
      // Extract storage path from URL
      const storageRef = ref(storage, fileUrl);
      await deleteObject(storageRef);
    } catch (error: any) {
      // Ignore not-found errors (file already deleted)
      if (error.code === "storage/object-not-found") {
        console.warn("File not found, already deleted:", fileUrl);
        return;
      }
      console.error("Error deleting file:", error);
      throw error;
    }
  },

  /**
   * Gets download URL for a resource file
   */
  getFileUrl: async (userId: string, resourceId: string, fileName: string): Promise<string> => {
    try {
      const storagePath = `studyResources/${userId}/${resourceId}/${fileName}`;
      const storageRef = ref(storage, storagePath);
      return await getDownloadURL(storageRef);
    } catch (error: any) {
      console.error("Error getting file URL:", error);
      throw error;
    }
  },

  /**
   * Validates a file before upload
   */
  validateFile: (file: File, maxSizeMB: number = 50): ValidationResult => {
    const errors: string[] = [];

    // Validate file type
    const typeError = validateFileType(file);
    if (typeError) {
      errors.push(typeError.message);
    }

    // Validate file size
    const sizeError = validateFileSize(file, maxSizeMB);
    if (sizeError) {
      errors.push(sizeError.message);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  /**
   * Determines file type from File object
   */
  getFileType: (file: File): "pdf" | "image" => {
    if (file.type === "application/pdf") {
      return "pdf";
    }
    if (file.type.startsWith("image/")) {
      return "image";
    }
    throw new Error("Unsupported file type");
  },
};
