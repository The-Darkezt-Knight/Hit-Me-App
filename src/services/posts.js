import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';

export const PRIVACY_PUBLIC = 'public';
export const PRIVACY_PRIVATE = 'private';

const publicSubscribers = new Set();
const userSubscribers = new Map();
const allSubscribers = new Set();
const optimisticPosts = [];

function normalizePrivacy(value) {
  if (value == null || value === '') {
    return PRIVACY_PUBLIC;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === PRIVACY_PUBLIC || normalized === PRIVACY_PRIVATE) {
      return normalized;
    }
  }

  return value;
}

function createClientRequestId() {
  return `post_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizePost(docLike) {
  const normalizedPrivacy = normalizePrivacy(docLike.data.privacy);
  return {
    id: docLike.id,
    ...docLike.data,
    clientRequestId: docLike.data.clientRequestId || docLike.id,
    pending: Boolean(docLike.data.pending),
    privacy: normalizedPrivacy
  };
}

function summarizePrivacy(posts) {
  return posts.reduce((counts, post) => {
    const key = post.privacy ?? 'undefined';
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function buildVisiblePosts(posts, filter) {
  const snapshotPosts = posts.filter(filter);
  const combined = [...snapshotPosts];

  optimisticPosts.forEach((post) => {
    if (!filter(post)) {
      return;
    }

    const alreadyIncluded = combined.some(
      (item) => item.clientRequestId === post.clientRequestId
    );

    if (!alreadyIncluded) {
      combined.unshift(post);
    }
  });

  return combined.sort((left, right) => {
    const leftTime = left.createdAt?.toMillis?.() ?? left.createdAt?.seconds ?? 0;
    const rightTime = right.createdAt?.toMillis?.() ?? right.createdAt?.seconds ?? 0;
    return rightTime - leftTime;
  });
}

function reconcileOptimisticPosts(snapshotPosts) {
  const confirmedIds = new Set(
    snapshotPosts.map((post) => post.clientRequestId || post.id)
  );

  for (let index = optimisticPosts.length - 1; index >= 0; index -= 1) {
    if (confirmedIds.has(optimisticPosts[index].clientRequestId)) {
      optimisticPosts.splice(index, 1);
    }
  }
}

function notifyPublicSubscribers(snapshotPosts) {
  const visiblePosts = buildVisiblePosts(snapshotPosts, (post) => post.privacy === PRIVACY_PUBLIC && !post.hidden);
  publicSubscribers.forEach((callback) => callback(visiblePosts));
}

function notifyUserSubscribers(userId, snapshotPosts) {
  const visiblePosts = buildVisiblePosts(snapshotPosts, (post) => post.authorId === userId && !post.hidden);
  const subscribers = userSubscribers.get(userId);
  if (!subscribers) {
    return;
  }

  subscribers.forEach((callback) => callback(visiblePosts));
}

function notifyAllSubscribers(snapshotPosts) {
  const visiblePosts = buildVisiblePosts(snapshotPosts, () => true);
  allSubscribers.forEach((callback) => callback(visiblePosts));
}

export async function createPost({
  topic,
  explanation,
  imageUrls,
  privacy,
  authorId,
  authorEmail
}) {
  const clientRequestId = createClientRequestId();
  const payload = {
    topic,
    explanation,
    imageUrls: Array.isArray(imageUrls) ? imageUrls : [],
    privacy,
    authorId,
    authorEmail,
    clientRequestId,
    reactCount: 0,
    reactedBy: [],
    createdAt: serverTimestamp()
  };

  const optimisticPost = {
    id: clientRequestId,
    ...payload,
    createdAt: new Date(),
    pending: true
  };

  optimisticPosts.unshift(optimisticPost);
  notifyPublicSubscribers([]);
  notifyUserSubscribers(authorId, []);
  notifyAllSubscribers([]);

  const docRef = await addDoc(collection(db, 'posts'), payload);
  return docRef;
}

export async function updatePost(postId, updates) {
  if (!postId) {
    throw new Error('Post id is required.');
  }

  if (!updates || Object.keys(updates).length === 0) {
    return;
  }

  const postRef = doc(db, 'posts', postId);
  await updateDoc(postRef, updates);
}

export async function deletePost(postId) {
  if (!postId) {
    throw new Error('Post id is required.');
  }

  const postRef = doc(db, 'posts', postId);
  await deleteDoc(postRef);
}

export async function setPostHidden(postId, hidden) {
  if (!postId) {
    throw new Error('Post id is required.');
  }

  const postRef = doc(db, 'posts', postId);
  await updateDoc(postRef, { hidden });
}

export async function setPostReaction(postId, userId, shouldReact) {
  if (!postId) {
    throw new Error('Post id is required.');
  }

  if (!userId) {
    throw new Error('User id is required.');
  }

  const postRef = doc(db, 'posts', postId);
  await updateDoc(postRef, {
    reactCount: increment(shouldReact ? 1 : -1),
    reactedBy: shouldReact ? arrayUnion(userId) : arrayRemove(userId)
  });
}

export async function backfillPostAuthors() {
  const postsSnapshot = await getDocs(collection(db, 'posts'));
  const usersSnapshot = await getDocs(collection(db, 'users'));

  const usersById = new Map();
  const usersByEmail = new Map();

  usersSnapshot.forEach((userDoc) => {
    const userData = userDoc.data() || {};
    usersById.set(userDoc.id, userData);
    if (userData.email) {
      usersByEmail.set(String(userData.email).toLowerCase(), userData);
    }
  });

  const maxBatchSize = 450;
  let batch = writeBatch(db);
  let batchCount = 0;
  let updated = 0;
  const commits = [];

  postsSnapshot.forEach((postDoc) => {
    const postData = postDoc.data() || {};
    const authorId = postData.authorId;
    const authorEmail = postData.authorEmail;
    const user =
      (authorId && usersById.get(authorId)) ||
      (authorEmail && usersByEmail.get(String(authorEmail).toLowerCase()));

    if (!user) {
      return;
    }

    const nextName = typeof user.fullName === 'string' ? user.fullName.trim() : '';
    const nextImage =
      typeof user.profileImage === 'string' ? user.profileImage.trim() : '';

    if (!nextName || !nextImage) {
      return;
    }

    const currentName =
      typeof postData.authorName === 'string' ? postData.authorName.trim() : '';
    const currentImage =
      typeof postData.authorProfileImage === 'string'
        ? postData.authorProfileImage.trim()
        : '';

    if (currentName === nextName && currentImage === nextImage) {
      return;
    }

    batch.update(postDoc.ref, {
      authorName: nextName,
      authorProfileImage: nextImage
    });
    batchCount += 1;
    updated += 1;

    if (batchCount >= maxBatchSize) {
      commits.push(batch.commit());
      batch = writeBatch(db);
      batchCount = 0;
    }
  });

  if (batchCount > 0) {
    commits.push(batch.commit());
  }

  if (commits.length) {
    await Promise.all(commits);
  }

  return { updated, totalPosts: postsSnapshot.size };
}

export function subscribeToPublicPosts(onData, onError, options = {}) {
  const { debug = false } = options;
  const postsRef = collection(db, 'posts');
  const unsubscribe = onSnapshot(
    postsRef,
    (snapshot) => {
      const posts = snapshot.docs.map((doc) => normalizePost({ id: doc.id, data: doc.data() }));
      const visiblePosts = buildVisiblePosts(posts, (post) => post.privacy === PRIVACY_PUBLIC && !post.hidden);
      publicSubscribers.add(onData);
      reconcileOptimisticPosts(visiblePosts);

      if (debug) {
        const privacySummary = summarizePrivacy(posts);
        const unknownPrivacy = posts.filter(
          (post) => post.privacy !== PRIVACY_PUBLIC && post.privacy !== PRIVACY_PRIVATE
        );
        console.log(
          '[posts] snapshot',
          { docs: snapshot.size, normalized: posts.length, visible: visiblePosts.length, privacySummary }
        );
        if (unknownPrivacy.length) {
          console.warn('[posts] unknown privacy values', unknownPrivacy.slice(0, 5));
        }
      }

      onData(visiblePosts);
    },
    onError
  );

  return () => {
    publicSubscribers.delete(onData);
    unsubscribe();
  };
}

export function subscribeToUserPosts(userId, userEmail, onData, onError) {
  const postsRef = collection(db, 'posts');
  const unsubscribe = onSnapshot(
    postsRef,
    (snapshot) => {
      const posts = snapshot.docs.map((doc) => normalizePost({ id: doc.id, data: doc.data() }));
      const visiblePosts = buildVisiblePosts(
        posts,
        (post) =>
          !post.hidden &&
          (post.authorId === userId ||
            (userEmail && post.authorEmail?.toLowerCase?.() === userEmail.toLowerCase()))
      );
      if (!userSubscribers.has(userId)) {
        userSubscribers.set(userId, new Set());
      }

      userSubscribers.get(userId).add(onData);
      reconcileOptimisticPosts(visiblePosts);
      onData(visiblePosts);
    },
    onError
  );

  return () => {
    const subscribers = userSubscribers.get(userId);
    if (subscribers) {
      subscribers.delete(onData);
      if (subscribers.size === 0) {
        userSubscribers.delete(userId);
      }
    }

    unsubscribe();
  };
}

export function subscribeToAllPosts(onData, onError) {
  const postsRef = collection(db, 'posts');
  const unsubscribe = onSnapshot(
    postsRef,
    (snapshot) => {
      const posts = snapshot.docs.map((doc) => normalizePost({ id: doc.id, data: doc.data() }));
      const visiblePosts = buildVisiblePosts(posts, () => true);
      allSubscribers.add(onData);
      reconcileOptimisticPosts(visiblePosts);
      onData(visiblePosts);
    },
    onError
  );

  return () => {
    allSubscribers.delete(onData);
    unsubscribe();
  };
}
