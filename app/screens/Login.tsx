import { View, Text, StyleSheet, TextInput, ActivityIndicator, Button, KeyboardAvoidingView } from "react-native";
import React, { useState } from "react";
import { FIREBASE_APP, FIREBASE_AUTH } from "../../FirebaseConfig";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const auth = FIREBASE_AUTH;  
    
    const singIn = async () => {
        setLoading(true);
        try {
            const response = await signInWithEmailAndPassword(auth, email, password);
            console.log(response);
            
        } catch (error: any) {
            console.log(error);
            alert('Kayıt başarısız' + error.message);
        } finally {
            setLoading(false);
        }
    }

    const singUp = async () => {
        setLoading(true);
        try {
            const response = await createUserWithEmailAndPassword(auth, email, password);
            console.log(response);
            alert('Kayıt Başarılı!');
        } catch (error: any) {
            console.log(error);
            alert('Kayıt başarısız' + error.message);
        } finally {
            setLoading(false);
        }
    }
    return(
        <View style={styles.container}>
            <KeyboardAvoidingView behavior="padding"></KeyboardAvoidingView>
         <TextInput value={email} style={styles.input} placeholder="Email" autoCapitalize="none"onChangeText={(text)=>setEmail(text)}></TextInput>
         <TextInput secureTextEntry={true} value={password} style={styles.input} placeholder="Password" autoCapitalize="none"onChangeText={(text)=>setPassword(text)}></TextInput>
        {loading ? (<ActivityIndicator size="large" color="#0000ff"/> 
        ):( 
        <>
        <Button title="Giriş" onPress={singIn}/>
        <Button title="Kayıt Ol" onPress={singUp}/>
        </>
        )} 
        </View>
    );
};

export default Login;

const styles= StyleSheet.create({
    container:{
        marginHorizontal: 20,
        flex: 1,
        justifyContent: 'center'
    },
    input: {
        marginVertical: 4,
        height: 50,
        borderWidth: 1,
        borderRadius: 4,
        padding: 10,
        backgroundColor: '#fff'
    }
});