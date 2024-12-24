import { View, Text, ScrollView, StyleSheet } from "react-native";
import React, { useEffect, useState } from "react";
import { FIREBASE_AUTH, FIRESTORE_DB } from "../../FirebaseConfig";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";

interface TestResult {
  date: string;
  testname: string;
  result: string;
}

interface GroupedResults {
  [date: string]: TestResult[];
}

const Details = () => {
    const [groupedTestResults, setGroupedTestResults] = useState<GroupedResults>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTestResults = async () => {
            try {
                const currentUser = FIREBASE_AUTH.currentUser;
                if (!currentUser?.email) return;

                const testResultsRef = collection(FIRESTORE_DB, "testresults");
                const q = query(
                    testResultsRef,
                    where("email", "==", currentUser.email),
                    orderBy("date", "desc")
                );

                const querySnapshot = await getDocs(q);
                const results: GroupedResults = {};

                querySnapshot.forEach((doc) => {
                    const data = doc.data() as TestResult;
                    if (!results[data.date]) {
                        results[data.date] = [];
                    }
                    results[data.date].push(data);
                });

                setGroupedTestResults(results);
            } catch (error) {
                console.error("Error fetching test results:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTestResults();
    }, []);

    if (loading) {
        return (
            <View style={styles.container}>
                <Text>Yükleniyor...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            {Object.keys(groupedTestResults).length === 0 ? (
                <Text style={styles.noData}>Test sonucu bulunamadı.</Text>
            ) : (
                Object.entries(groupedTestResults).map(([date, results]) => (
                    <View key={date} style={styles.dateGroup}>
                        <Text style={styles.dateHeader}>{date}</Text>
                        {results.map((result, index) => (
                            <View key={index} style={styles.testResult}>
                                <Text style={styles.testName}>{result.testname}</Text>
                                <Text style={styles.testValue}>{result.result}</Text>
                            </View>
                        ))}
                    </View>
                ))
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f5f5f5',
    },
    dateGroup: {
        marginBottom: 20,
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    dateHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    testResult: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    testName: {
        fontSize: 16,
        color: '#444',
    },
    testValue: {
        fontSize: 16,
        fontWeight: '500',
        color: '#222',
    },
    noData: {
        textAlign: 'center',
        fontSize: 16,
        color: '#666',
        marginTop: 20,
    }
});

export default Details;