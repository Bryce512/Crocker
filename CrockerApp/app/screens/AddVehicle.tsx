import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  FlatList,
  PermissionsAndroid,
} from "react-native";
import { getDatabase, ref, get } from "@react-native-firebase/database";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/AppNavigator";
import { Feather } from "@expo/vector-icons";
import Button from "../components/Button";
import Card, { CardContent, CardHeader } from "../components/Card";
import { colors } from "../theme/colors";
import firebaseService from "../services/firebaseService";
import ImagePicker, {
  launchCamera,
  launchImageLibrary,
  ImageLibraryOptions,
  CameraOptions,
  ImagePickerResponse,
} from "react-native-image-picker";

export default function AddVehicleScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Form state
  const [vehicleName, setVehicleName] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [mileage, setMileage] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [isOBDConnected, setIsOBDConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showMakePicker, setShowMakePicker] = useState(false);

  // Available makes and models (could fetch from Firebase)
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);

  // Input validation
  const [errors, setErrors] = useState<{
    name?: string;
    make?: string;
    model?: string;
    year?: string;
    mileage?: string;
  }>({});

  useEffect(() => {
    // Fetch available makes from Firebase
    const fetchVehicleInfo = async () => {
      try {
        const database = getDatabase();
        const vehicleInfoRef = ref(database, "vehicle_info/makes");
        const snapshot = await get(vehicleInfoRef);

        if (snapshot.exists()) {
          const makesData = snapshot.val();
          setMakes(Object.keys(makesData));
        }
      } catch (error) {
        console.error("Error fetching vehicle makes:", error);
      }
    };

    fetchVehicleInfo();
  }, []);

  // Update models when make changes
  useEffect(() => {
    if (make) {
      const fetchModels = async () => {
        try {
          const database = getDatabase();
          const modelsRef = ref(database, `vehicle_info/makes/${make}/models`);
          const snapshot = await get(modelsRef);

          if (snapshot.exists()) {
            setModels(snapshot.val());
          } else {
            setModels([]);
          }
        } catch (error) {
          console.error("Error fetching models for make:", error);
          setModels([]);
        }
      };

      fetchModels();
    } else {
      setModels([]);
    }
  }, [make]);

  const validateForm = () => {
    const newErrors: {
      name?: string;
      make?: string;
      model?: string;
      year?: string;
      mileage?: string;
    } = {};

    if (!vehicleName.trim()) {
      newErrors.name = "Vehicle name is required";
    }

    if (!make) {
      newErrors.make = "Make is required";
    }

    if (!model) {
      newErrors.model = "Model is required";
    }

    if (!year) {
      newErrors.year = "Year is required";
    } else if (
      !/^\d{4}$/.test(year) ||
      parseInt(year) < 1900 ||
      parseInt(year) > new Date().getFullYear() + 1
    ) {
      newErrors.year = "Please enter a valid year";
    }

    if (!mileage) {
      newErrors.mileage = "Mileage is required";
    } else if (!/^\d+$/.test(mileage)) {
      newErrors.mileage = "Please enter a valid mileage";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Function to launch image picker
  const openImagePicker = () => {
    Alert.alert(
      "Choose Image",
      "Select a photo for your vehicle",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Take Photo",
          onPress: () => takePhoto(),
        },
        {
          text: "Choose from Gallery",
          onPress: () => selectFromGallery(),
        },
      ],
      { cancelable: true }
    );
  };

  // Function to take a photo with the camera
  const takePhoto = () => {
    try {
      // Request permissions first...

      const options = {
        mediaType: "photo" as const,
        saveToPhotos: true,
      };

      console.log("Launching camera with callback...");
      launchCamera(options, (response) => {
        console.log("Camera response:", response);

        if (response.assets && response.assets.length > 0) {
          console.log("Image captured:", response.assets[0].uri);
          setImage(response.assets[0].uri ?? null);
        }
      });
    } catch (err) {
      console.error("Camera error:", err);
      Alert.alert("Error", "Failed to open camera");
    }
  };

  // Function to select from gallery
  const selectFromGallery = async () => {
    try {
      const options: ImageLibraryOptions = {
        mediaType: "photo",
        selectionLimit: 1,
      };

      console.log("Launching gallery directly...");
      const result = await launchImageLibrary(options);
      console.log("Gallery result:", result);

      if (result.assets && result.assets.length > 0) {
        console.log("Image selected:", result.assets[0].uri);
        setImage(result.assets[0].uri ?? null);
      }
    } catch (err) {
      console.error("Gallery error:", err);
      Alert.alert("Error", "Failed to open photo gallery");
    }
  };

  // Handle image picker response
  const handleImagePickerResponse = (response: ImagePickerResponse) => {
    if (response.didCancel) {
      console.log("User cancelled image picker");
    } else if (response.errorCode) {
      console.log("ImagePicker Error: ", response.errorMessage);
      Alert.alert("Error", "There was an error selecting the image");
    } else if (response.assets && response.assets.length > 0) {
      // Get the selected image uri
      const selectedImage = response.assets[0];
      setImage(selectedImage.uri ?? null);

      // Here you would typically upload the image to Firebase Storage
      // For now, we'll just set it to state
      console.log("Selected image URI: ", selectedImage.uri);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const currentUser = firebaseService.getCurrentUser();

      if (!currentUser) {
        Alert.alert("Error", "You must be signed in to add a vehicle.");
        setLoading(false);
        return;
      }

      // Upload image to Firebase Storage if available
      let imageUrl =
        "gs://fluid-tangent-405719.firebasestorage.app/public/car_default.png"; // Default image

      if (image) {
        try {
          setImageUploading(true);
          console.log("Starting image upload: ", image);

          // Get the file name from the URI
          const imagePath = image.split("/").pop();
          const imageRef = `vehicles/${currentUser.uid}/${Date.now()}-${
            imagePath || "vehicle_image"
          }`;

          // First, fetch the image as a blob
          const response = await fetch(image);
          const blob = await response.blob();

          // Upload to Firebase Storage
          const storage = firebaseService.getStorage();
          const storageRef = firebaseService.storageRef(storage, imageRef);

          // Upload the blob
          const uploadTask = await firebaseService.uploadBytes(
            storageRef,
            blob
          );
          console.log("Image uploaded successfully");

          // Get download URL
          imageUrl = await firebaseService.getDownloadURL(storageRef);
          console.log("Image download URL:", imageUrl);
        } catch (uploadError) {
          console.error("Error uploading image:", uploadError);
          Alert.alert(
            "Warning",
            "Failed to upload image. Vehicle will be added with default image."
          );
          // Continue with default image
        } finally {
          setImageUploading(false);
        }
      }

      // Prepare vehicle data with the proper image URL
      const vehicleData = {
        name: vehicleName.trim(),
        make: make,
        model: model,
        year: parseInt(year),
        mileage: parseInt(mileage),
        image: imageUrl, // Now this will be the Firebase Storage URL or default
        status: "Good",
        obd: isOBDConnected,
        progress: 100,
        lastService: "3 months ago",
        nextService: "In 2 months",
        alerts: 0,
        createdAt: new Date().toISOString(),
      };

      console.log("Adding vehicle with data:", vehicleData);

      // Add vehicle to Firebase
      await firebaseService.addVehicle(currentUser.uid, vehicleData);

      Alert.alert("Success", "Vehicle added successfully!", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error("Error adding vehicle:", error);
      Alert.alert("Error", "Failed to add vehicle. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Convert your makes array to the format required
  const makeOptions = makes.map((make) => ({ key: make, value: make }));

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Feather
                name="arrow-left"
                size={24}
                color={isDark ? colors.white : colors.gray[900]}
              />
            </TouchableOpacity>

            <Text style={[styles.title, isDark && styles.textLight]}>
              Add New Vehicle
            </Text>
          </View>

          <View style={styles.content}>
            <Card>
              <CardHeader>
                <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
                  Vehicle Information
                </Text>
              </CardHeader>

              <CardContent style={styles.formContainer}>
                {/* Vehicle Name */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, isDark && styles.textMutedLight]}>
                    Vehicle Name
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      isDark && styles.inputDark,
                      errors.name && styles.inputError,
                    ]}
                    value={vehicleName}
                    onChangeText={setVehicleName}
                    placeholder="E.g. My Bronco"
                    placeholderTextColor={
                      isDark ? colors.gray[600] : colors.gray[400]
                    }
                  />
                  {errors.name && (
                    <Text style={styles.errorText}>{errors.name}</Text>
                  )}
                </View>

                {/* Vehicle Image URL */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, isDark && styles.textMutedLight]}>
                    Vehicle Image
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.imagePickerButton,
                      isDark && styles.imagePickerButtonDark,
                    ]}
                    onPress={openImagePicker}
                  >
                    {image ? (
                      <Image
                        source={{ uri: image }}
                        style={styles.vehicleImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <Feather
                          name="camera"
                          size={32}
                          color={isDark ? colors.gray[400] : colors.gray[500]}
                        />
                        <Text
                          style={[
                            styles.imagePlaceholderText,
                            isDark && styles.textMutedLight,
                          ]}
                        >
                          Tap to select image
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  {image && (
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => setImage(null)}
                    >
                      <Text style={styles.removeImageText}>Remove image</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Make */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, isDark && styles.textMutedLight]}>
                    Make
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.input,
                      isDark && styles.inputDark,
                      errors.make && styles.inputError,
                    ]}
                    onPress={() => setShowMakePicker(true)}
                  >
                    <Text
                      style={{
                        color: isDark ? colors.white : colors.gray[900],
                      }}
                    >
                      {make || "Select Make"}
                    </Text>
                  </TouchableOpacity>

                  {/* Make Picker Modal */}
                  <Modal
                    visible={showMakePicker}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowMakePicker(false)}
                  >
                    <View style={styles.modalOverlay}>
                      <View
                        style={[
                          styles.modalContent,
                          isDark && styles.modalContentDark,
                        ]}
                      >
                        <Text
                          style={[
                            styles.modalTitle,
                            isDark && styles.textLight,
                          ]}
                        >
                          Select Make
                        </Text>
                        <FlatList
                          data={makes}
                          keyExtractor={(item) => item}
                          renderItem={({ item }) => (
                            <TouchableOpacity
                              style={styles.modalItem}
                              onPress={() => {
                                setMake(item);
                                setModel("");
                                setShowMakePicker(false);
                              }}
                            >
                              <Text style={isDark ? styles.textLight : null}>
                                {item}
                              </Text>
                            </TouchableOpacity>
                          )}
                        />
                        <Button
                          title="Cancel"
                          onPress={() => setShowMakePicker(false)}
                          variant="outline"
                        />
                      </View>
                    </View>
                  </Modal>

                  {errors.make && (
                    <Text style={styles.errorText}>{errors.make}</Text>
                  )}
                </View>

                {/* Model */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, isDark && styles.textMutedLight]}>
                    Model
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.input,
                      isDark && styles.inputDark,
                      errors.model && styles.inputError,
                    ]}
                    onPress={() => setModel("FJ40")} // Keep the model input as is
                  >
                    <Text
                      style={{
                        color: isDark ? colors.white : colors.gray[900],
                      }}
                    >
                      {model || "Select Model"}
                    </Text>
                  </TouchableOpacity>

                  {errors.model && (
                    <Text style={styles.errorText}>{errors.model}</Text>
                  )}
                </View>

                {/* Year */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, isDark && styles.textMutedLight]}>
                    Year
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      isDark && styles.inputDark,
                      errors.year && styles.inputError,
                    ]}
                    value={year}
                    onChangeText={setYear}
                    placeholder="E.g. 2023"
                    placeholderTextColor={
                      isDark ? colors.gray[600] : colors.gray[400]
                    }
                    keyboardType="numeric"
                    maxLength={4}
                  />
                  {errors.year && (
                    <Text style={styles.errorText}>{errors.year}</Text>
                  )}
                </View>

                {/* Mileage */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, isDark && styles.textMutedLight]}>
                    Current Mileage
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      isDark && styles.inputDark,
                      errors.mileage && styles.inputError,
                    ]}
                    value={mileage}
                    onChangeText={setMileage}
                    placeholder="E.g. 35000"
                    placeholderTextColor={
                      isDark ? colors.gray[600] : colors.gray[400]
                    }
                    keyboardType="numeric"
                  />
                  {errors.mileage && (
                    <Text style={styles.errorText}>{errors.mileage}</Text>
                  )}
                </View>

                {/* OBD Connection toggle */}
                <View style={styles.formGroup}>
                  <View style={styles.checkboxContainer}>
                    <TouchableOpacity
                      style={[
                        styles.checkbox,
                        isOBDConnected && styles.checkboxChecked,
                        isDark && styles.checkboxDark,
                        isOBDConnected && isDark && styles.checkboxCheckedDark,
                      ]}
                      onPress={() => setIsOBDConnected(!isOBDConnected)}
                    >
                      {isOBDConnected && (
                        <Feather
                          name="check"
                          size={16}
                          color={isDark ? colors.black : colors.white}
                        />
                      )}
                    </TouchableOpacity>
                    <Text
                      style={[styles.checkboxLabel, isDark && styles.textLight]}
                    >
                      This vehicle is connected to an OBD-II device
                    </Text>
                  </View>
                </View>

                <View style={styles.buttonContainer}>
                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={() => navigation.goBack()}
                    style={styles.cancelButton}
                  />
                  <Button
                    title={loading ? "Adding..." : "Add Vehicle"}
                    onPress={handleSubmit}
                    disabled={loading}
                    icon={
                      loading ? undefined : (
                        <Feather name="plus" size={16} color={colors.white} />
                      )
                    }
                  />
                </View>
              </CardContent>
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.gray[900],
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.gray[900],
  },
  formContainer: {
    gap: 20,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.gray[700],
  },
  input: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.white,
    color: colors.gray[900],
  },
  inputDark: {
    borderColor: colors.gray[700],
    backgroundColor: colors.gray[800],
    color: colors.white,
  },
  inputError: {
    borderColor: colors.red[500],
  },
  errorText: {
    color: colors.red[500],
    fontSize: 12,
    marginTop: 4,
  },
  imagePreviewContainer: {
    marginTop: 8,
    height: 150,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.gray[300],
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 8,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  pickerContainerDark: {
    borderColor: colors.gray[700],
    backgroundColor: colors.gray[800],
  },
  picker: {
    height: 50,
    width: "100%",
    color: colors.gray[900],
  },
  pickerDark: {
    color: colors.white,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: colors.primary[500],
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.white,
  },
  checkboxDark: {
    borderColor: colors.primary[400],
    backgroundColor: colors.gray[800],
  },
  checkboxChecked: {
    backgroundColor: colors.primary[500],
  },
  checkboxCheckedDark: {
    backgroundColor: colors.primary[400],
  },
  checkboxLabel: {
    fontSize: 14,
    color: colors.gray[900],
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
  },
  textLight: {
    color: colors.white,
  },
  textMutedLight: {
    color: colors.gray[400],
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  modalContent: {
    width: "80%",
    borderRadius: 8,
    padding: 20,
    backgroundColor: colors.white,
  },
  modalContentDark: {
    backgroundColor: colors.gray[800],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[300],
  },
  imagePickerButton: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    height: 150,
    position: "relative",
  },
  imagePickerButtonDark: {
    borderColor: colors.gray[700],
    backgroundColor: colors.gray[800],
  },
  vehicleImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  imagePlaceholderText: {
    marginTop: 8,
    color: colors.gray[500],
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: colors.red[500],
    borderRadius: 16,
    padding: 6,
  },
  removeImageText: {
    color: colors.white,
    fontSize: 12,
  },
});
