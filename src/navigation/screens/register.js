import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import {
    ImageBackground,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { auth, db, provider } from '../../../firebaseConfig';
import SignInWithGoogle from '../../component/SignInWithGoogleButton';

export default function Register({navigation}) {

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [alert, setAlert] = useState('');

    const handleSignUp = async () => {
        const trimmedEmail = email.trim();

        if (trimmedEmail === '') {
            setAlert('Email is empty');
            return;
        }

        if (password === '' || confirmPassword === '') {
            setAlert('Password is empty');
            return;
        }

        if (password !== confirmPassword) {
            setAlert("Password doesn't match");
            return;
        }

        setAlert('');

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
            const { user } = userCredential;

            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                email: user.email,
                authProvider: 'password',
                createdAt: serverTimestamp(),
                isActive: true
            });
        } catch (error) {
            setAlert(error.message);
        }
    }

    const handleSignInWithGoogle = () => {
                    signInWithPopup(auth, provider)
                    .then((result) => {
                        const credential = GoogleAuthProvider.credentialFromResult(result);
                        const token = credential.accessToken;
                        const user = result.user;
                    }).catch((error) => {
                        const errorCode = error.code;
                        const errorMessage = error.message;
                        // The email of the user's account used.
                        const email = error.customData.email;
                        // The AuthCredential type that was used.
                        const credential = GoogleAuthProvider.credentialFromError(error);
                    });
            }

    return (

            <ImageBackground
            source={require('../../assets/beach-sand-big.jpg')}
            style={styles.body}
            resizeMode='cover'
            >
                <View
                >
                    <View
                    style={styles.header}
                    >
                        <Text
                        style={styles.heading}
                        >Welcome!</Text>
                        <Text
                        style={styles.subHeading}
                        >Share your experiences to the world!</Text>
                    </View>
                    <View
                    style={styles.form}
                    >
                        <View
                        style={styles.inputGroup}
                        >
                            <Text
                            style={styles.label}
                            >Email</Text>
                            <TextInput
                            style={styles.textInput}
                            placeholder='Enter email'
                            value= {email}
                            onChangeText={setEmail}
                            ></TextInput>
                        </View>

                        <View
                        style={styles.inputGroup}
                        >
                            <Text
                            style={styles.label}
                            >Password</Text>
                            <TextInput
                            style={styles.textInput}
                            placeholder='Enter password'
                            value={password}
                            onChangeText={setPassword}
                            ></TextInput>
                        </View>

                        <View
                        style={styles.inputGroup}
                        >
                            <Text
                            style={styles.label}
                            >Confirm Password</Text>
                            <TextInput
                            style={styles.textInput}
                            placeholder='Re-enter password'
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            ></TextInput>
                            <Text
                            style={{
                                color: 'red',
                                fontSize: 12
                            }}
                            >{alert}</Text>
                        </View>

                        <Pressable>
                            <Text
                            style={styles.linkButtonText}
                            onPress={()=>{navigation.navigate('Login')}}
                            >Already have an account?</Text>
                        </Pressable>

                        <Pressable
                        style={styles.registerButton}
                        onPress={()=> {handleSignUp()}}
                        >
                            <Text
                            style={styles.registerButtonText}
                            >Register</Text>
                        </Pressable>
                        
                        <SignInWithGoogle
                            onPress={handleSignInWithGoogle}
                        ></SignInWithGoogle>

                    </View>
                </View>
            </ImageBackground>
    )
}

const styles = StyleSheet.create({
    body : {
        flex: 1,
        justifyContent : 'center',
        alignItems : 'center'
    },
    header : {
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30
    },
    heading: {
        fontSize: 60,
        color: '#0096c7',
        fontWeight: '900'
    },
    subHeading: {
        fontSize: 12,
        color: '#fff',
        fontWeight: '400'
    },
    form : {
        width : 450,
        height: 'auto',
        paddingVertical: 50,
        paddingHorizontal: 30,
        backgroundColor: '#f1f1f1',
        borderRadius: 7,
        gap: 10
    },
    inputGroup: {
        gap: 5
    },
    label : {
        fontSize: 20
    },
    textInput : {
        backgroundColor: '#fff',
        borderRadius: 7,
        paddingStart: 10,
        height: 50
    },
    registerButton: {
        marginTop: 30,
        backgroundColor: '#bbb',
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 7,
        backgroundColor: '#0096c7'
    },
    registerButtonText: {
        color: '#fff'
    },
    linkButtonText: {
        marginTop: 5,
        fontSize: 16,
        fontWeight: '700',
        color: '#0096c7'
    }
    
})