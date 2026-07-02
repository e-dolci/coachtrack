import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, setPersistence, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [coachData, setCoachData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const docSnap = await getDoc(doc(db, 'coaches', firebaseUser.uid));
        if (docSnap.exists()) setCoachData(docSnap.data());
      } else { setUser(null); setCoachData(null); }
      setLoading(false);
    });
    return unsubscribe;
  }, []);
  const signup = useCallback(async (name, email, password, schoolName, phone) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    const coachInfo = {
      uid: cred.user.uid,
      name,
      email,
      phone: phone || '',
      schoolName: schoolName || '',
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'coaches', cred.user.uid), coachInfo);
    setUser(cred.user);
    setCoachData(coachInfo);
    return cred.user;
  }, []);
  const login = useCallback(async (email, password, staySignedIn = false) => {
    const persistence = staySignedIn ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, persistence);
    const cred = await signInWithEmailAndPassword(auth, email, password);
    setUser(cred.user);
    const docSnap = await getDoc(doc(db, 'coaches', cred.user.uid));
    if (docSnap.exists()) setCoachData(docSnap.data());
    return cred.user;
  }, []);
  const updateCoachProfile = useCallback(async (update) => {
    if (!user?.uid) throw new Error('No user available');
    await updateDoc(doc(db, 'coaches', user.uid), update);
    const updatedData = { ...coachData, ...update };
    setCoachData(updatedData);
    return updatedData;
  }, [user, coachData]);
  const logout = useCallback(async () => { await signOut(auth); setUser(null); setCoachData(null); }, []);
  return <AuthContext.Provider value={{ user, coachData, loading, signup, login, logout, updateCoachProfile }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const ctx = useContext(AuthContext); if (!ctx) throw new Error('useAuth must be used within AuthProvider'); return ctx; }
