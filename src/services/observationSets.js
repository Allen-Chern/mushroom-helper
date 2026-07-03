import {
  collection,
  addDoc,
  doc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase.js'

// 對應設計文件 §4.2 資料模型:observationSets/{setId}/items/{itemId}
// respawnAt 存成 epoch ms(number),方便前端純函式(respawn.js / sorting.js)直接運算,
// 不需要每次都轉換 Firestore Timestamp

export async function createObservationSet() {
  const ref = await addDoc(collection(db, 'observationSets'), {
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export function subscribeToItems(setId, onChange) {
  const itemsRef = collection(db, 'observationSets', setId, 'items')
  return onSnapshot(itemsRef, (snapshot) => {
    const items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    onChange(items)
  })
}

export async function addItem(setId, itemData) {
  const itemsRef = collection(db, 'observationSets', setId, 'items')
  const ref = await addDoc(itemsRef, {
    ...itemData,
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateItem(setId, itemId, patch) {
  const itemRef = doc(db, 'observationSets', setId, 'items', itemId)
  await updateDoc(itemRef, {
    ...patch,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteItem(setId, itemId) {
  const itemRef = doc(db, 'observationSets', setId, 'items', itemId)
  await deleteDoc(itemRef)
}
