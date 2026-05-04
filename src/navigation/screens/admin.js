import React, { useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import {
  backfillPostAuthors,
  deletePost,
  setPostHidden,
  subscribeToAllPosts
} from '../../services/posts';
import { deleteUserDoc, setUserActiveStatus, subscribeToAllUsers } from '../../services/users';

export default function Admin({ navigation }) {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState('posts');
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [backfilling, setBackfilling] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);

    const unsubscribePosts = subscribeToAllPosts(
      (data) => {
        if (!active) return;
        setPosts(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        if (!active) return;
        setLoading(false);
        setError('Failed to sync posts. ' + err.message);
      }
    );

    const unsubscribeUsers = subscribeToAllUsers(
      (data) => {
        if (!active) return;
        setUsers(data);
        setLoading(false);
      },
      (err) => {
        if (!active) return;
        setLoading(false);
        setError('Failed to sync users. ' + err.message);
      }
    );

    return () => {
      active = false;
      unsubscribePosts();
      unsubscribeUsers();
    };
  }, []);

  const handleToggleHidden = async (post) => {
    try {
      await setPostHidden(post.id, !post.hidden);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handleDeletePost = async (post) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const confirmed = window.confirm(
        'Are you sure you want to delete this post? This action cannot be undone.'
      );
      if (confirmed) {
        try {
          await deletePost(post.id);
        } catch (err) {
          Alert.alert('Error', err.message);
        }
      }
      return;
    }

    Alert.alert(
      'Delete post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePost(post.id);
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          }
        }
      ]
    );
  };

  const handleToggleUserActive = async (user) => {
    try {
      await setUserActiveStatus(user.id, user.isActive === false ? true : false);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handleDeleteUser = async (user) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const confirmed = window.confirm(
        'Are you sure you want to delete this user? This action cannot be undone.'
      );
      if (confirmed) {
        try {
          await deleteUserDoc(user.id);
        } catch (err) {
          Alert.alert('Error', err.message);
        }
      }
      return;
    }

    Alert.alert(
      'Delete user',
      'Are you sure you want to delete this user? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteUserDoc(user.id);
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          }
        }
      ]
    );
  };

  const confirmBackfill = async () => {
    if (backfilling) {
      return;
    }

    setBackfilling(true);
    try {
      const result = await backfillPostAuthors();
      Alert.alert(
        'Backfill complete',
        `Updated ${result.updated} of ${result.totalPosts} posts.`
      );
    } catch (err) {
      Alert.alert('Backfill failed', err.message || 'Please try again.');
    } finally {
      setBackfilling(false);
    }
  };

  const handleBackfillAuthors = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const confirmed = window.confirm(
        'Backfill author names and profile images for existing posts?'
      );
      if (confirmed) {
        confirmBackfill();
      }
      return;
    }

    Alert.alert(
      'Backfill posts',
      'Backfill author names and profile images for existing posts?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Backfill', onPress: confirmBackfill }
      ]
    );
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#f1f5f9' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.shell}>
          <View style={styles.header}>
            <View>
              <Text style={styles.heading}>Greetings, Admin!</Text>
              <Text style={styles.subHeading}>Access your dashboard to see what's new</Text>
            </View>
            <Pressable style={styles.logoutButton} onPress={logout}>
              <Text style={styles.logoutButtonText}>Log out</Text>
            </Pressable>
          </View>

          <View style={styles.tabs}>
            <Pressable
              style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
              onPress={() => setActiveTab('posts')}
            >
              <Text style={[styles.tabText, activeTab === 'posts' && styles.tabTextActive]}>Posts</Text>
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === 'users' && styles.tabActive]}
              onPress={() => setActiveTab('users')}
            >
              <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>Users</Text>
            </Pressable>
          </View>

          <View style={styles.content}>
            {loading ? (
              <Text style={styles.stateText}>Loading...</Text>
            ) : error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : activeTab === 'posts' ? (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, styles.sectionTitleInline]}>
                    All Posts
                  </Text>
                  <Pressable
                    style={[
                      styles.backfillButton,
                      backfilling ? styles.backfillButtonBusy : null
                    ]}
                    onPress={handleBackfillAuthors}
                    disabled={backfilling}
                  >
                    <Text style={styles.backfillButtonText}>
                      {backfilling ? 'Backfilling...' : 'Backfill authors'}
                    </Text>
                  </Pressable>
                </View>
                {posts.length === 0 ? (
                  <Text style={styles.stateText}>No posts available.</Text>
                ) : (
                  <ScrollView style={styles.tableScroll}>
                    <View style={styles.table}>
                      <View style={[styles.tableRow, styles.tableHeader]}>
                        <Text style={[styles.tableCell, styles.flex2, styles.bold]}>Topic</Text>
                        <Text style={[styles.tableCell, styles.flex2, styles.bold]}>Author</Text>
                        <Text style={[styles.tableCell, styles.flex1, styles.bold]}>Privacy</Text>
                        <Text style={[styles.tableCell, styles.flex1, styles.bold]}>Hidden</Text>
                        <Text style={[styles.tableCell, styles.flex2, styles.bold, styles.center]}>Actions</Text>
                      </View>
                      {posts.map((post) => (
                        <View key={post.id} style={styles.tableRow}>
                          <Text style={[styles.tableCell, styles.flex2]} numberOfLines={1}>{post.topic || 'Untitled'}</Text>
                          <Text style={[styles.tableCell, styles.flex2]} numberOfLines={1}>{post.authorEmail || 'Unknown'}</Text>
                          <Text style={[styles.tableCell, styles.flex1]}>{post.privacy}</Text>
                          <Text style={[styles.tableCell, styles.flex1]}>{post.hidden ? 'Yes' : 'No'}</Text>
                          <View style={[styles.tableCell, styles.flex2, styles.actionsContainer]}>
                            <Pressable
                              style={styles.actionButton}
                              onPress={() => handleToggleHidden(post)}
                            >
                              <Text style={styles.actionButtonText}>
                                {post.hidden ? 'Unhide' : 'Hide'}
                              </Text>
                            </Pressable>
                            <Pressable
                              style={[styles.actionButton, styles.actionButtonDanger]}
                              onPress={() => handleDeletePost(post)}
                            >
                              <Text style={styles.actionButtonTextDanger}>Delete</Text>
                            </Pressable>
                          </View>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                )}
              </>
            ) : (
              <>
                <Text style={styles.sectionTitle}>User Management</Text>
                {users.length === 0 ? (
                  <Text style={styles.stateText}>No users available.</Text>
                ) : (
                  <ScrollView style={styles.tableScroll}>
                    <View style={styles.table}>
                      <View style={[styles.tableRow, styles.tableHeader]}>
                        <Text style={[styles.tableCell, styles.flex2, styles.bold]}>Email</Text>
                        <Text style={[styles.tableCell, styles.flex2, styles.bold]}>UID</Text>
                        <Text style={[styles.tableCell, styles.flex1, styles.bold]}>Status</Text>
                        <Text style={[styles.tableCell, styles.flex2, styles.bold, styles.center]}>Actions</Text>
                      </View>
                      {users.map((user) => (
                        <View key={user.id} style={styles.tableRow}>
                          <Text style={[styles.tableCell, styles.flex2]} numberOfLines={1}>{user.email}</Text>
                          <Text style={[styles.tableCell, styles.flex2]} numberOfLines={1}>{user.uid}</Text>
                          <Text style={[styles.tableCell, styles.flex1]}>{user.isActive === false ? 'Inactive' : 'Active'}</Text>
                          <View style={[styles.tableCell, styles.flex2, styles.actionsContainer]}>
                            <Pressable
                              style={styles.actionButton}
                              onPress={() => handleToggleUserActive(user)}
                            >
                              <Text style={styles.actionButtonText}>
                                {user.isActive === false ? 'Activate' : 'Deactivate'}
                              </Text>
                            </Pressable>
                            <Pressable
                              style={[styles.actionButton, styles.actionButtonDanger]}
                              onPress={() => handleDeleteUser(user)}
                            >
                              <Text style={styles.actionButtonTextDanger}>Delete</Text>
                            </Pressable>
                          </View>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                )}
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    width: '94%',
    maxWidth: 1000,
    alignSelf: 'center',
    paddingVertical: 30,
    gap: 20
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  heading: {
    fontSize: 32,
    color: '#0096c7',
    fontWeight: '900',
    fontFamily: 'Georgia'
  },
  subHeading: {
    fontSize: 14,
    color: '#4a5b76',
    fontWeight: '400',
    marginTop: 4,
    fontFamily: 'Trebuchet MS'
  },
  logoutButton: {
    height: 40,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#0096c7',
    justifyContent: 'center',
    alignItems: 'center'
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    fontFamily: 'Trebuchet MS'
  },
  tabs: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 5
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d6e8f6'
  },
  tabActive: {
    backgroundColor: '#0096c7',
    borderColor: '#0096c7'
  },
  tabText: {
    color: '#4a5b76',
    fontWeight: '700',
    fontSize: 14,
    fontFamily: 'Trebuchet MS'
  },
  tabTextActive: {
    color: '#ffffff'
  },
  content: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#d6e8f6',
    shadowColor: '#0a6aa3',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
    fontFamily: 'Georgia'
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16
  },
  sectionTitleInline: {
    marginBottom: 0
  },
  backfillButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#eef6ff',
    borderWidth: 1,
    borderColor: '#0b8bd4'
  },
  backfillButtonBusy: {
    opacity: 0.7
  },
  backfillButtonText: {
    fontSize: 12,
    color: '#0b8bd4',
    fontWeight: '700',
    fontFamily: 'Trebuchet MS'
  },
  stateText: {
    fontSize: 14,
    color: '#4a5b76',
    textAlign: 'center',
    marginTop: 20,
    fontFamily: 'Trebuchet MS'
  },
  errorText: {
    fontSize: 14,
    color: '#b42318',
    textAlign: 'center',
    marginTop: 20,
    fontFamily: 'Trebuchet MS'
  },
  tableScroll: {
    flex: 1
  },
  table: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    overflow: 'hidden'
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16
  },
  tableHeader: {
    backgroundColor: '#f8fafc'
  },
  tableCell: {
    fontSize: 14,
    color: '#334155',
    fontFamily: 'Trebuchet MS'
  },
  flex1: {
    flex: 1
  },
  flex2: {
    flex: 2
  },
  bold: {
    fontWeight: '700',
    color: '#0f172a'
  },
  center: {
    textAlign: 'center'
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center'
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#eef6ff',
    borderWidth: 1,
    borderColor: '#0b8bd4'
  },
  actionButtonText: {
    fontSize: 12,
    color: '#0b8bd4',
    fontWeight: '700',
    fontFamily: 'Trebuchet MS'
  },
  actionButtonDanger: {
    backgroundColor: '#fff1f2',
    borderColor: '#f43f5e'
  },
  actionButtonTextDanger: {
    fontSize: 12,
    color: '#e11d48',
    fontWeight: '700',
    fontFamily: 'Trebuchet MS'
  }
});
