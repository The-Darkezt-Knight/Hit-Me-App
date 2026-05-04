import { collection, doc, deleteDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

const subscribers = new Set();

export function subscribeToAllUsers(onData, onError) {
  const usersRef = collection(db, 'users');
  const unsubscribe = onSnapshot(
    usersRef,
    (snapshot) => {
      const users = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      subscribers.add(onData);
      onData(users);
    },
    onError
  );

  return () => {
    subscribers.delete(onData);
    unsubscribe();
  };
}

export async function setUserActiveStatus(userId, isActive) {
  if (!userId) {
    throw new Error('User id is required.');
  }

  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { isActive });
}

export async function deleteUserDoc(userId) {
  if (!userId) {
    throw new Error('User id is required.');
  }

  const userRef = doc(db, 'users', userId);
  await deleteDoc(userRef);
}
