import React, { useState, useEffect } from 'react';
import {
    Alert,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useAuth } from '../../context/AuthContext';

export default function Admin({navigation}) {
    const { logout } = useAuth();
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
            const usersData = [];
            snapshot.forEach((doc) => {
                usersData.push({ id: doc.id, ...doc.data() });
            });
            setUsers(usersData);
        });

        return () => unsubscribe();
    }, []);

    const toggleDeactivateUser = async (userId, currentStatus) => {
        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                status: currentStatus === 'deactivated' ? 'active' : 'deactivated'
            });
        } catch (error) {
            console.error('Error toggling user status:', error);
        }
    };

    const removeUser = (userId) => {
        if (Platform.OS === 'web') {
            const confirmed = window.confirm("Are you sure you want to completely remove this user from the database?");
            if (confirmed) {
                deleteUserDoc(userId);
            }
        } else {
            Alert.alert(
                "Confirm Deletion",
                "Are you sure you want to completely remove this user from the database?",
                [
                    {
                        text: "Cancel",
                        style: "cancel"
                    },
                    {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => deleteUserDoc(userId)
                    }
                ]
            );
        }
    };

    const deleteUserDoc = async (userId) => {
        try {
            await deleteDoc(doc(db, 'users', userId));
        } catch (error) {
            console.error('Error removing user:', error);
        }
    };

    const filteredUsers = users.filter((user) => {
        const matchesSearch = user.email ? user.email.toLowerCase().includes(searchQuery.toLowerCase()) : false;

        let matchesFilter = true;
        if (filterStatus === 'Active') {
            matchesFilter = user.status !== 'deactivated';
        } else if (filterStatus === 'Deactivated') {
            matchesFilter = user.status === 'deactivated';
        }

        return matchesSearch && matchesFilter;
    });

    const renderUser = ({ item }) => (
        <View style={styles.tableRow}>
            <Text style={styles.tableCellEmail} numberOfLines={1} ellipsizeMode="tail">{item.email}</Text>
            <Text style={styles.tableCellStatus}>{item.status === 'deactivated' ? 'Deactivated' : 'Active'}</Text>
            <View style={styles.actionButtons}>
                <Pressable
                    style={[styles.actionBtn, item.status === 'deactivated' ? styles.activateBtn : styles.deactivateBtn]}
                    onPress={() => toggleDeactivateUser(item.id, item.status)}
                >
                    <Text style={styles.actionBtnText}>{item.status === 'deactivated' ? 'Activate' : 'Deactivate'}</Text>
                </Pressable>
                <Pressable
                    style={[styles.actionBtn, styles.removeBtn]}
                    onPress={() => removeUser(item.id)}
                >
                    <Text style={styles.actionBtnText}>Remove</Text>
                </Pressable>
            </View>
        </View>
    );

    return (
    <TouchableWithoutFeedback
        onPress={Keyboard.dismiss}
    >
        <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS == 'ios' ? 'padding' : 'height'}
        >
                <View
                style={styles.body}
                >
                    <View
                    style={styles.header}
                    >
                        <Text
                        style={styles.heading}
                        >Greetings, Admin!</Text>
                        <Text
                        style={styles.subHeading}
                        >Access your dashboard to see what's new</Text>
                    </View>

                    <View style={styles.tableContainer}>
                        <View style={styles.controlsContainer}>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search by email..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                            <View style={styles.filterContainer}>
                                {['All', 'Active', 'Deactivated'].map((status) => (
                                    <Pressable
                                        key={status}
                                        style={[
                                            styles.filterBtn,
                                            filterStatus === status && styles.filterBtnActive
                                        ]}
                                        onPress={() => setFilterStatus(status)}
                                    >
                                        <Text
                                            style={[
                                                styles.filterBtnText,
                                                filterStatus === status && styles.filterBtnTextActive
                                            ]}
                                        >{status}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        <View style={styles.tableHeader}>
                            <Text style={styles.tableHeaderCellEmail}>Email</Text>
                            <Text style={styles.tableHeaderCellStatus}>Status</Text>
                            <Text style={styles.tableHeaderCellAction}>Actions</Text>
                        </View>
                        <FlatList
                            data={filteredUsers}
                            keyExtractor={(item) => item.id}
                            renderItem={renderUser}
                            contentContainerStyle={styles.listContent}
                        />
                    </View>

                    <Pressable
                    style={styles.logoutButton}
                    onPress={logout}
                    >
                        <Text
                        style={styles.logoutButtonText}
                        >Log out</Text>
                    </Pressable>
                    
                </View>
        </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
    )
}

const styles = StyleSheet.create({
    body : {
        flex: 1,
        justifyContent : 'flex-start',
        alignItems : 'center',
        paddingVertical: 30
    },
    header : {
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30
    },
    heading: {
        fontSize: 40,
        color: '#0096c7',
        fontWeight: '900'
    },
    subHeading: {
        fontSize: 12,
        color: '#fff',
        fontWeight: '400'
    },
    logoutButton: {
        marginTop: 20,
        height: 45,
        paddingHorizontal: 20,
        borderRadius: 7,
        backgroundColor: '#0096c7',
        justifyContent: 'center',
        alignItems: 'center'
    },
    logoutButtonText: {
        color: '#fff',
        fontWeight: '700'
    },
    tableContainer: {
        width: '90%',
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 10,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    controlsContainer: {
        marginBottom: 15,
        gap: 10,
    },
    searchInput: {
        height: 40,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 5,
        paddingHorizontal: 10,
        backgroundColor: '#f9f9f9',
    },
    filterContainer: {
        flexDirection: 'row',
        gap: 10,
    },
    filterBtn: {
        paddingVertical: 5,
        paddingHorizontal: 15,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#0096c7',
        backgroundColor: 'transparent',
    },
    filterBtnActive: {
        backgroundColor: '#0096c7',
    },
    filterBtnText: {
        color: '#0096c7',
        fontSize: 12,
        fontWeight: '600',
    },
    filterBtnTextActive: {
        color: '#fff',
    },
    tableHeader: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        paddingBottom: 10,
        marginBottom: 10,
    },
    tableHeaderCellEmail: {
        flex: 2,
        fontWeight: 'bold',
        fontSize: 16,
    },
    tableHeaderCellStatus: {
        flex: 1,
        fontWeight: 'bold',
        fontSize: 16,
        textAlign: 'center',
    },
    tableHeaderCellAction: {
        flex: 2,
        fontWeight: 'bold',
        fontSize: 16,
        textAlign: 'center',
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    tableCellEmail: {
        flex: 2,
        fontSize: 14,
    },
    tableCellStatus: {
        flex: 1,
        fontSize: 14,
        textAlign: 'center',
    },
    actionButtons: {
        flex: 2,
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    actionBtn: {
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activateBtn: {
        backgroundColor: '#28a745',
    },
    deactivateBtn: {
        backgroundColor: '#ffc107',
    },
    removeBtn: {
        backgroundColor: '#dc3545',
    },
    actionBtnText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    listContent: {
        paddingBottom: 10,
    }
})