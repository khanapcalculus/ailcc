import { getAnalytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, deleteDoc, doc, getDoc, getDocs, getFirestore, onSnapshot, orderBy, query, setDoc, updateDoc, where } from "firebase/firestore";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";

// Development mode detection
const DEV_MODE = process.env.NODE_ENV === 'development';

// Mock data for development
const mockWhiteboards = DEV_MODE ? [
  {
    id: 'mock-whiteboard-1',
    title: 'Math Lesson - Mock',
    ownerId: 'dev-user-123',
    collaborators: [],
    pages: [
      {
        id: 'mock-page-1',
        objects: []
      }
    ],
    settings: {
      backgroundColor: '#ffffff',
      gridEnabled: true,
      gridSize: 20
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'mock-whiteboard-2',
    title: 'Physics Notes - Mock',
    ownerId: 'dev-user-123',
    collaborators: [],
    pages: [
      {
        id: 'mock-page-1',
        objects: []
      },
      {
        id: 'mock-page-2',
        objects: []
      }
    ],
    settings: {
      backgroundColor: '#ffffff',
      gridEnabled: true,
      gridSize: 20
    },
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000)  // 12 hours ago
  }
] : [];

// Store our mock whiteboards
let devWhiteboards = [...mockWhiteboards];
let mockSnapshotCallbacks = {};

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAlTzdaY3WyEwHtMy1w95gkS8A1tNa2N2M",
  authDomain: "lcc360.firebaseapp.com",
  projectId: "lcc360",
  storageBucket: "lcc360.firebasestorage.app",
  messagingSenderId: "721955318411",
  appId: "1:721955318411:web:c81a0de24b58ead721c28e",
  measurementId: "G-FMCGY7SMJH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// eslint-disable-next-line no-unused-vars
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Authentication methods
export const loginWithEmail = (email, password) => {
  if (DEV_MODE) {
    console.log('[DEV MODE] Mock login with:', email);
    return Promise.resolve({ user: { uid: 'dev-user-123', email, displayName: 'Development User' } });
  }
  return signInWithEmailAndPassword(auth, email, password);
};

export const registerWithEmail = (email, password) => {
  if (DEV_MODE) {
    console.log('[DEV MODE] Mock registration with:', email);
    return Promise.resolve({ user: { uid: 'dev-user-123', email, displayName: 'New User' } });
  }
  return createUserWithEmailAndPassword(auth, email, password);
};

export const logout = () => {
  if (DEV_MODE) {
    console.log('[DEV MODE] Mock logout');
    return Promise.resolve();
  }
  return signOut(auth);
};

// Whiteboard methods
export const createWhiteboard = async (whiteboardData) => {
  try {
    if (DEV_MODE) {
      console.log('[DEV MODE] Creating mock whiteboard:', whiteboardData);
      const mockId = `mock-${Date.now()}`;
      const newWhiteboard = {
        ...whiteboardData,
        id: mockId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      devWhiteboards.push(newWhiteboard);
      
      // Notify any listeners for this whiteboard
      if (mockSnapshotCallbacks[mockId]) {
        mockSnapshotCallbacks[mockId](newWhiteboard);
      }
      
      return mockId;
    }
    
    const whiteboardRef = doc(collection(db, "whiteboards"));
    await setDoc(whiteboardRef, {
      ...whiteboardData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return whiteboardRef.id;
  } catch (error) {
    console.error("Error creating whiteboard:", error);
    throw error;
  }
};

export const getWhiteboard = async (whiteboardId) => {
  try {
    if (DEV_MODE) {
      console.log('[DEV MODE] Getting mock whiteboard:', whiteboardId);
      const mockWhiteboard = devWhiteboards.find(wb => wb.id === whiteboardId);
      
      if (mockWhiteboard) {
        return { ...mockWhiteboard };
      } else {
        // Create a new one if not found
        const newWhiteboard = {
          id: whiteboardId,
          title: 'New Whiteboard - Mock',
          ownerId: 'dev-user-123',
          collaborators: [],
          pages: [
            {
              id: 'mock-page-1',
              objects: []
            }
          ],
          settings: {
            backgroundColor: '#ffffff',
            gridEnabled: true,
            gridSize: 20
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        devWhiteboards.push(newWhiteboard);
        return { ...newWhiteboard };
      }
    }
    
    const whiteboardRef = doc(db, "whiteboards", whiteboardId);
    const whiteboardSnapshot = await getDoc(whiteboardRef);
    
    if (whiteboardSnapshot.exists()) {
      return { id: whiteboardSnapshot.id, ...whiteboardSnapshot.data() };
    } else {
      throw new Error("Whiteboard not found");
    }
  } catch (error) {
    console.error("Error getting whiteboard:", error);
    throw error;
  }
};

export const updateWhiteboard = async (whiteboardId, data) => {
  try {
    if (DEV_MODE) {
      console.log('[DEV MODE] Updating mock whiteboard:', whiteboardId, data);
      const index = devWhiteboards.findIndex(wb => wb.id === whiteboardId);
      
      if (index !== -1) {
        devWhiteboards[index] = {
          ...devWhiteboards[index],
          ...data,
          updatedAt: new Date()
        };
        
        // Notify any listeners for this whiteboard
        if (mockSnapshotCallbacks[whiteboardId]) {
          mockSnapshotCallbacks[whiteboardId](devWhiteboards[index]);
        }
      }
      
      return;
    }
    
    const whiteboardRef = doc(db, "whiteboards", whiteboardId);
    await updateDoc(whiteboardRef, {
      ...data,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error("Error updating whiteboard:", error);
    throw error;
  }
};

export const getUserWhiteboards = async (userId) => {
  try {
    if (DEV_MODE) {
      console.log('[DEV MODE] Getting mock whiteboards for user:', userId);
      return devWhiteboards.filter(wb => wb.ownerId === userId);
    }
    
    // Temporary workaround while index is being built
    try {
      // Try with the intended query that needs the index
      const q = query(
        collection(db, "whiteboards"),
        where("ownerId", "==", userId),
        orderBy("updatedAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (indexError) {
      console.warn("Index not ready yet, using fallback query:", indexError.message);
      
      // Fallback: Just get the whiteboards without ordering
      const fallbackQuery = query(
        collection(db, "whiteboards"),
        where("ownerId", "==", userId)
      );
      const fallbackSnapshot = await getDocs(fallbackQuery);
      const whiteboards = fallbackSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort in memory instead of using the index
      return whiteboards.sort((a, b) => {
        // Convert Firestore timestamps to milliseconds if needed
        const aTime = a.updatedAt instanceof Date ? a.updatedAt.getTime() : 
                      a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 
                      0;
        const bTime = b.updatedAt instanceof Date ? b.updatedAt.getTime() : 
                      b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 
                      0;
        return bTime - aTime; // Descending order
      });
    }
  } catch (error) {
    console.error("Error getting user whiteboards:", error);
    throw error;
  }
};

export const subscribeToWhiteboard = (whiteboardId, callback) => {
  if (DEV_MODE) {
    console.log('[DEV MODE] Subscribing to mock whiteboard:', whiteboardId);
    mockSnapshotCallbacks[whiteboardId] = callback;
    
    // Immediately call with current data
    const whiteboard = devWhiteboards.find(wb => wb.id === whiteboardId);
    if (whiteboard) {
      setTimeout(() => callback({ ...whiteboard }), 0);
    }
    
    // Return an unsubscribe function
    return () => {
      delete mockSnapshotCallbacks[whiteboardId];
    };
  }
  
  const whiteboardRef = doc(db, "whiteboards", whiteboardId);
  return onSnapshot(whiteboardRef, (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() });
    }
  });
};

// File storage methods
export const uploadImage = async (file, path) => {
  try {
    if (DEV_MODE) {
      console.log('[DEV MODE] Mock image upload:', path);
      // Create a mock URL
      return URL.createObjectURL(file);
    }
    
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
};

export const deleteWhiteboard = async (whiteboardId) => {
  try {
    if (DEV_MODE) {
      console.log('[DEV MODE] Deleting mock whiteboard:', whiteboardId);
      // Filter out the deleted whiteboard
      devWhiteboards = devWhiteboards.filter(wb => wb.id !== whiteboardId);
      
      // Remove any snapshot callbacks
      if (mockSnapshotCallbacks[whiteboardId]) {
        delete mockSnapshotCallbacks[whiteboardId];
      }
      
      return true;
    }
    
    const whiteboardRef = doc(db, "whiteboards", whiteboardId);
    await deleteDoc(whiteboardRef);
    return true;
  } catch (error) {
    console.error("Error deleting whiteboard:", error);
    throw error;
  }
};

export { auth, db, storage };

export default app; 