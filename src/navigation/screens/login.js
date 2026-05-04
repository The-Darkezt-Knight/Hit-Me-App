import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import React, { useState } from 'react';
import {
    ImageBackground,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { auth, provider } from '../../../firebaseConfig';
import SignInWithGoogle from '../../component/SignInWithGoogleButton';

export default function Index({navigation}) {

    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [emailAlert, setEmailAlert] = useState('');
    const [passwordAlert, setPasswordAlert] = useState('');

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

    const handleLogin = () => {

        (email === '') ? setEmailAlert("Email is empty") : setEmailAlert('');

        (password === '') ? setPasswordAlert('Password is empty') : setPasswordAlert('');


        signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            setEmail('')
            setPassword('')
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
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
                            value={email}
                            onChangeText={setEmail}
                            style={styles.textInput}
                            placeholder='Enter email'
                            ></TextInput>
                            <Text
                            style={{
                                color: 'red',
                                fontSize: 12
                            }}
                            >{emailAlert}</Text>
                        </View>

                        <View
                        style={styles.inputGroup}
                        >
                            <Text
                            style={styles.label}
                            >Password</Text>

                            <TextInput
                            value={password}
                            onChangeText={setPassword}
                            style={styles.textInput}
                            placeholder='Enter password'
                            ></TextInput>
                            <Text
                            style={{
                                color: 'red',
                                fontSize: 12
                            }}
                            >{passwordAlert}</Text>
                        </View>

                        <Pressable>
                            <Text
                            style={styles.linkButtonText}
                            onPress={()=>{navigation.navigate('Register')}}
                            >Don't have an account?</Text>
                        </Pressable>

                        <Pressable
                        style={styles.loginButton}
                        onPress={()=> {handleLogin()}}
                        >
                            <Text
                            style={styles.loginButtonText}
                            >Log in</Text>
                        </Pressable>

                        <SignInWithGoogle
                            onPress={()=>handleSignInWithGoogle()}
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
        fontSize: 20,
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
    loginButton: {
        marginTop: 30,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 7,
        backgroundColor: '#0096c7'
    },
    loginButtonText: {
        color: '#fff'
    },
    linkButtonText: {
        marginTop: 5,
        fontSize: 16,
        fontWeight: '700',
        color: '#0096c7'
    }
    
})