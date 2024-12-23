import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Login from './app/screens/Login';
import List from './app/screens/List';
import Details from './app/screens/Details';
import AdminScreen from './app/screens/AdminScreen';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { FIREBASE_APP, FIREBASE_AUTH, FIRESTORE_DB } from "./FirebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
async function getUserRole(email: string) {
  try {
    const usersRef = collection(FIRESTORE_DB, "admins");
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      return "admin";
    } else {
      console.log("No admin found with this email.");
      return "user"
    }
  } catch (error) {
    console.error("Error retrieving user role:", error);
  }
}

const Stack = createNativeStackNavigator();
const InsideStack = createNativeStackNavigator();
function InsideLayout() {
  return (
    <InsideStack.Navigator>
      <InsideStack.Screen name="Tahliller" component={List} />
      <InsideStack.Screen name="Detaylar" component={Details} />
    </InsideStack.Navigator>
  );
}

function InsideLayout2() {
  return (
    <InsideStack.Navigator>
      <InsideStack.Screen name="Admin" component={AdminScreen} />
    </InsideStack.Navigator>
  );
}

export default function App() {
  const [userState, setUserState] = useState<{ user: User | null; role: string }>({ user: null, role: "user" });
  useEffect(() => {
    onAuthStateChanged(FIREBASE_AUTH, (user) => {
      
      if (user) {
        const email = user["email"] || "";
        getUserRole(email).then((role) => {
          if (role) {
            setUserState({ user, role: role })
          } else {
            console.log("User not found or no role assigned.");
          }
        });
      }
      else {
        setUserState({ user, role: "" })
      }
    });
  }, [])

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName='Login'>
        {userState["user"] ? (
          userState["role"] === 'admin' ? (
            <Stack.Screen name='AdminScreen' component={InsideLayout2} options={{ headerShown: false }}></Stack.Screen>
          ) : (
            <Stack.Screen name='UserScreen' component={InsideLayout} options={{ headerShown: false }}></Stack.Screen>
          )
        ) : (
          <Stack.Screen name='Login' component={Login} options={{ headerShown: false }}></Stack.Screen>
        )}

      </Stack.Navigator>
    </NavigationContainer>
  );
}

