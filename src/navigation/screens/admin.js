import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
  ScrollView,
  Alert
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { subscribeToAllPosts, setPostHidden, deletePost } from '../../services/posts';

export default function Admin({ navigation }) {
  const { logout } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    const unsubscribe = subscribeToAllPosts(
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

    return () => {
      active = false;
      unsubscribe();
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

          <View style={styles.content}>
            <Text style={styles.sectionTitle}>All Posts</Text>
            {loading ? (
              <Text style={styles.stateText}>Loading...</Text>
            ) : error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : posts.length === 0 ? (
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
