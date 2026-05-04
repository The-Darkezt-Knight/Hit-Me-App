import React from 'react';
import {
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function Admin({navigation}) {
    const { logout } = useAuth();

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
    }
})