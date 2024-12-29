import { View, Text, Button, StyleSheet } from "react-native";
import React from "react";
import { FIREBASE_AUTH } from "../../FirebaseConfig";
import { NavigationProp } from "@react-navigation/native";

interface RouterProps {
    navigation: NavigationProp<any, any>;
}

const AdminScreen = ({ navigation }: RouterProps) => {
    return (
        <View style={styles.container}>
            <Button 
                onPress={() => navigation.navigate('PatientList')} 
                title="Hasta Listesi"
            />
            <View style={styles.spacing} />
            <Button 
                onPress={() => FIREBASE_AUTH.signOut()} 
                title="Çıkış Yap"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 16,
    },
    spacing: {
        height: 16,
    },
});

export default AdminScreen;