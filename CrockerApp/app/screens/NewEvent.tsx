import React, { useState } from "react";
import { View } from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/AppNavigator";
import EventForm from "../components/EventForm";

const EventCreation = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [showForm, setShowForm] = useState(true);

  const handleSave = () => {
    setShowForm(false);
    navigation.navigate("CalendarScreen");
  };

  const handleCancel = () => {
    setShowForm(false);
    navigation.goBack();
  };

  return (
    <View style={{ flex: 1 }}>
      <EventForm
        mode="create"
        visible={showForm}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </View>
  );
};

export default EventCreation;
