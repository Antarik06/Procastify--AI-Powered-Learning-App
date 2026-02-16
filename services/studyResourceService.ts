import { db } from "../firebaseConfig";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import {
  StudyResource,
  ResourceMetadata,
  ResourceFilters,
  PaginatedResources,
} from "../types";

/**
 * Service for managing study resources in Firestore
 */
export const StudyResourceService = {
  /**
   * Creates a new study resource in Firestore
   */
  createResource: async (
    userId: string,
    metadata: ResourceMetadata,
    fileUrl: string,
    fileName: string,
    fileSize: number,
    fileType: "pdf" | "image",
    resourceId?: string
  ): Promise<StudyResource> => {
    const id = resourceId || `resource_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Build resource object, excluding undefined fields
    const resource: any = {
      id,
      userId,
      ownerId: userId,
      title: metadata.title,
      examType: metadata.examType,
      level: metadata.level,
      subject: metadata.subject,
      year: metadata.year,
      board: metadata.board,
      paperType: metadata.paperType,
      fileUrl,
      fileName,
      fileSize,
      fileType,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Only add description if it's not undefined
    if (metadata.description !== undefined && metadata.description !== null && metadata.description.trim() !== '') {
      resource.description = metadata.description;
    }

    const ref = doc(db, "studyResources", id);
    await setDoc(ref, resource);

    // Return with numeric timestamps for local use
    return {
      ...resource,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  },

  /**
   * Retrieves a single study resource by ID
   */
  getResource: async (resourceId: string): Promise<StudyResource | null> => {
    try {
      const ref = doc(db, "studyResources", resourceId);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        return null;
      }

      const data = snap.data();
      return {
        ...data,
        createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : data.createdAt,
        updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : data.updatedAt,
      } as StudyResource;
    } catch (error) {
      console.error("Error fetching study resource:", error);
      throw error;
    }
  },

  /**
   * Retrieves paginated study resources with optional filters
   */
  getResources: async (
    filters: ResourceFilters = {},
    page: number = 1,
    pageSize: number = 50
  ): Promise<PaginatedResources> => {
    try {
      let q = query(
        collection(db, "studyResources"),
        orderBy("createdAt", "desc")
      );

      // Apply filters
      if (filters.examType && filters.examType.length > 0) {
        q = query(q, where("examType", "in", filters.examType));
      }
      if (filters.level && filters.level.length > 0) {
        q = query(q, where("level", "in", filters.level));
      }
      if (filters.paperType && filters.paperType.length > 0) {
        q = query(q, where("paperType", "in", filters.paperType));
      }
      if (filters.year && filters.year.length > 0) {
        q = query(q, where("year", "in", filters.year));
      }

      // Get total count (for pagination metadata)
      const allSnap = await getDocs(q);
      const totalCount = allSnap.size;

      // Apply pagination
      const startIndex = (page - 1) * pageSize;
      q = query(q, limit(pageSize));

      if (startIndex > 0 && allSnap.docs[startIndex - 1]) {
        q = query(q, startAfter(allSnap.docs[startIndex - 1]));
      }

      const snap = await getDocs(q);
      const resources = snap.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : data.createdAt,
          updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : data.updatedAt,
        } as StudyResource;
      });

      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        resources,
        totalCount,
        currentPage: page,
        pageSize,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };
    } catch (error) {
      console.error("Error fetching study resources:", error);
      throw error;
    }
  },

  /**
   * Retrieves all resources uploaded by a specific user
   */
  getUserResources: async (userId: string): Promise<StudyResource[]> => {
    try {
      const q = query(
        collection(db, "studyResources"),
        where("ownerId", "==", userId),
        orderBy("createdAt", "desc")
      );

      const snap = await getDocs(q);
      return snap.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : data.createdAt,
          updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : data.updatedAt,
        } as StudyResource;
      });
    } catch (error) {
      console.error("Error fetching user resources:", error);
      throw error;
    }
  },

  /**
   * Updates resource metadata (owner only)
   */
  updateResourceMetadata: async (
    resourceId: string,
    userId: string,
    metadata: Partial<ResourceMetadata>
  ): Promise<void> => {
    try {
      // Verify ownership
      const resource = await StudyResourceService.getResource(resourceId);
      if (!resource) {
        throw new Error("Resource not found");
      }
      if (resource.ownerId !== userId) {
        throw new Error("Unauthorized: You can only edit your own resources");
      }

      const ref = doc(db, "studyResources", resourceId);
      await setDoc(
        ref,
        {
          ...metadata,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Error updating resource metadata:", error);
      throw error;
    }
  },

  /**
   * Deletes a study resource (owner only)
   */
  deleteResource: async (resourceId: string, userId: string): Promise<void> => {
    try {
      // Verify ownership
      const resource = await StudyResourceService.getResource(resourceId);
      if (!resource) {
        throw new Error("Resource not found");
      }
      if (resource.ownerId !== userId) {
        throw new Error("Unauthorized: You can only delete your own resources");
      }

      const ref = doc(db, "studyResources", resourceId);
      await deleteDoc(ref);
    } catch (error) {
      console.error("Error deleting resource:", error);
      throw error;
    }
  },

  /**
   * Searches resources with text query and filters
   */
  searchResources: async (
    searchQuery: string,
    filters: ResourceFilters = {},
    page: number = 1,
    pageSize: number = 50
  ): Promise<PaginatedResources> => {
    try {
      // Get all resources with filters
      const paginatedResult = await StudyResourceService.getResources(
        filters,
        1,
        1000 // Get more for client-side search
      );

      // Apply client-side text search
      let filteredResources = paginatedResult.resources;
      
      if (searchQuery && searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase().trim();
        filteredResources = filteredResources.filter((resource) => {
          return (
            resource.title.toLowerCase().includes(query) ||
            resource.subject.toLowerCase().includes(query) ||
            resource.board.toLowerCase().includes(query) ||
            resource.examType.toLowerCase().includes(query) ||
            resource.paperType.toLowerCase().includes(query) ||
            (resource.description && resource.description.toLowerCase().includes(query))
          );
        });
      }

      // Apply subject filter (client-side for array support)
      if (filters.subject && filters.subject.length > 0) {
        filteredResources = filteredResources.filter((resource) =>
          filters.subject!.some((s) => resource.subject.toLowerCase().includes(s.toLowerCase()))
        );
      }

      // Apply board filter (client-side for array support)
      if (filters.board && filters.board.length > 0) {
        filteredResources = filteredResources.filter((resource) =>
          filters.board!.some((b) => resource.board.toLowerCase().includes(b.toLowerCase()))
        );
      }

      // Sort by createdAt descending (newest first)
      filteredResources.sort((a, b) => {
        const timeA = typeof a.createdAt === 'number' ? a.createdAt : a.createdAt?.toMillis?.() || 0;
        const timeB = typeof b.createdAt === 'number' ? b.createdAt : b.createdAt?.toMillis?.() || 0;
        return timeB - timeA; // Descending order (newest first)
      });

      // Paginate results
      const totalCount = filteredResources.length;
      const totalPages = Math.ceil(totalCount / pageSize);
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedResources = filteredResources.slice(startIndex, endIndex);

      return {
        resources: paginatedResources,
        totalCount,
        currentPage: page,
        pageSize,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };
    } catch (error) {
      console.error("Error searching resources:", error);
      throw error;
    }
  },
};
