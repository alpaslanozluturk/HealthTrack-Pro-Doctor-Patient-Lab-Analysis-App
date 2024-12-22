import { View, Text, Button } from "react-native";
import React from "react";
import { FIREBASE_AUTH } from "../../FirebaseConfig";

const AdminScreen = () => {
    return (
        <View>
            <Text>AdminScreen</Text>
            <Button onPress={() => FIREBASE_AUTH.signOut()} title="Çıkış Yap"/>
        </View>
    )
}
export default AdminScreen