import React from 'react';
import { Image, Pressable, StyleSheet, Text } from 'react-native';

export default function GoogleLogin({onPress}){
    
    return (
        <Pressable
        style={styles.body}
        onPress={onPress}
        >
            <Image
            style={styles.image}
            source={require('../assets/google.png')}
            ></Image>
            <Text>
                Sign in with Google
            </Text>
        </Pressable>
    )
}

const styles = StyleSheet.create({
    body: {
        height: 60,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 3,
        borderRadius: 7,
        backgroundColor: '#fff',
        marginTop: 10
    },
    image : {
        width: 30,
        height: 30,
    }
})