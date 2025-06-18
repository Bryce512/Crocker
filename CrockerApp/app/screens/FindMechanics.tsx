"use client"

import { useState } from "react"
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, useColorScheme } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"
import { Feather } from "@expo/vector-icons"
import Button from "../components/Button"
import Card, { CardContent } from "../components/Card"
import { colors } from "../theme/colors"

// Mock data
const mechanicData = [
  {
    id: 1,
    name: "Precision Auto Care",
    image: "https://via.placeholder.com/300x200",
    location: "Austin, TX",
    distance: 2.4,
    availability: "Available Today",
    rating: 4.8,
    reviewCount: 243,
    services: ["Oil Change", "Brake Service", "Engine Repair"],
    pricingTransparency: "Customer can choose parts",
    certification: "ASE Certified Master Technician",
    startingPrice: 49,
    estimatedTime: "Est. time: 1-2 hours",
  },
  {
    id: 2,
    name: "Hometown Mechanics",
    image: "https://via.placeholder.com/300x200",
    location: "Austin, TX",
    distance: 3.1,
    availability: "Available Tomorrow",
    rating: 4.6,
    reviewCount: 187,
    services: ["Transmission", "Engine Diagnostics", "Brake Service"],
    pricingTransparency: "Uses best value parts",
    certification: "Factory Trained Specialists",
    startingPrice: 39,
    estimatedTime: "Est. time: 1-3 hours",
  },
  {
    id: 3,
    name: "AutoTech Solutions",
    image: "https://via.placeholder.com/300x200",
    location: "Austin, TX",
    distance: 4.5,
    availability: "Available Today",
    rating: 4.9,
    reviewCount: 311,
    services: ["Engine Repair", "Electrical Systems", "Transmission"],
    pricingTransparency: "Customer can choose parts",
    certification: "ASE and Factory Certified",
    startingPrice: 59,
    estimatedTime: "Est. time: 2-4 hours",
  },
]

export default function FindMechanicsScreen() {
  const navigation = useNavigation()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"

  const [searchQuery, setSearchQuery] = useState("")
  const [locationQuery, setLocationQuery] = useState("")
  const [activeTab, setActiveTab] = useState("list")

  const renderMechanicCard = ({ item }: { item: typeof mechanicData[0] }) => <MechanicCard mechanic={item} isDark={isDark} />

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, isDark && styles.textLight]}>Find Mechanics</Text>
          <Text style={[styles.subtitle, isDark && styles.textMutedLight]}>
            Search for trusted mechanics in your area with transparent pricing and verified reviews.
          </Text>

          <View style={styles.searchContainer}>
            <View style={styles.inputContainer}>
              <Feather
                name="search"
                size={16}
                color={isDark ? colors.gray[400] : colors.gray[500]}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, isDark && styles.inputDark, { paddingLeft: 36 }]}
                placeholder="Search for services or shops..."
                placeholderTextColor={isDark ? colors.gray[400] : colors.gray[500]}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <View style={styles.inputContainer}>
              <Feather
                name="map-pin"
                size={16}
                color={isDark ? colors.gray[400] : colors.gray[500]}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, isDark && styles.inputDark, { paddingLeft: 36 }]}
                placeholder="Zip Code or Location"
                placeholderTextColor={isDark ? colors.gray[400] : colors.gray[500]}
                value={locationQuery}
                onChangeText={setLocationQuery}
              />
            </View>

            <Button title="Search" onPress={() => {}} style={styles.searchButton} />
          </View>
        </View>

        <View style={styles.filtersRow}>
          <TouchableOpacity style={[styles.filterButton, isDark && styles.filterButtonDark]}>
            <Feather name="filter" size={14} color={isDark ? colors.white : colors.gray[900]} />
            <Text style={[styles.filterButtonText, isDark && styles.textLight]}>Filters</Text>
          </TouchableOpacity>

          <View style={styles.sortContainer}>
            <Text style={[styles.sortLabel, isDark && styles.textMutedLight]}>Sort by:</Text>
            <TouchableOpacity style={styles.sortButton}>
              <Text style={[styles.sortButtonText, isDark && styles.textLight]}>Recommended</Text>
              <Feather name="chevron-down" size={16} color={isDark ? colors.white : colors.gray[900]} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabsContainer}>
          <View style={styles.tabsHeader}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "list" && styles.activeTabButton,
                isDark && styles.tabButtonDark,
                activeTab === "list" && isDark && styles.activeTabButtonDark,
              ]}
              onPress={() => setActiveTab("list")}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === "list" && styles.activeTabButtonText,
                  isDark && styles.textLight,
                ]}
              >
                List View
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "map" && styles.activeTabButton,
                isDark && styles.tabButtonDark,
                activeTab === "map" && isDark && styles.activeTabButtonDark,
              ]}
              onPress={() => setActiveTab("map")}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === "map" && styles.activeTabButtonText,
                  isDark && styles.textLight,
                ]}
              >
                Map View
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === "list" ? (
            <View style={styles.mechanicsContainer}>
              {mechanicData.map((mechanic) => (
                <MechanicCard key={mechanic.id} mechanic={mechanic} isDark={isDark} />
              ))}
            </View>
          ) : (
            <View style={styles.mapContainer}>
              <Text style={[styles.mapPlaceholder, isDark && styles.textMutedLight]}>
                Interactive map would be displayed here
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function MechanicCard({ mechanic, isDark }) {
  const navigation = useNavigation()

  return (
    <Card style={styles.mechanicCard}>
      <CardContent style={styles.mechanicCardContent}>
        <Image source={{ uri: mechanic.image }} style={styles.mechanicImage} resizeMode="cover" />

        <View style={styles.mechanicInfo}>
          <View style={styles.mechanicHeader}>
            <View>
              <Text style={[styles.mechanicName, isDark && styles.textLight]}>{mechanic.name}</Text>
              <View style={styles.locationContainer}>
                <Feather name="map-pin" size={12} color={isDark ? colors.gray[400] : colors.gray[500]} />
                <Text style={[styles.locationText, isDark && styles.textMutedLight]}>
                  {mechanic.location} • {mechanic.distance} miles away
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.availabilityBadge,
                mechanic.availability === "Available Today" ? styles.availabilityToday : styles.availabilityTomorrow,
                isDark && styles.availabilityBadgeDark,
              ]}
            >
              <Text
                style={[
                  styles.availabilityText,
                  mechanic.availability === "Available Today"
                    ? styles.availabilityTodayText
                    : styles.availabilityTomorrowText,
                  isDark && styles.availabilityTextDark,
                ]}
              >
                {mechanic.availability}
              </Text>
            </View>
          </View>

          <View style={styles.ratingContainer}>
            <View style={styles.starsContainer}>
              {[...Array(5)].map((_, i) => (
                <Feather
                  key={i}
                  name="star"
                  size={14}
                  color={i < Math.floor(mechanic.rating) ? colors.primary[500] : colors.gray[300]}
                  style={i < Math.floor(mechanic.rating) && { fill: colors.primary[500] }}
                />
              ))}
            </View>
            <Text style={[styles.ratingText, isDark && styles.textLight]}>{mechanic.rating.toFixed(1)}</Text>
            <Text style={[styles.reviewCount, isDark && styles.textMutedLight]}>({mechanic.reviewCount} reviews)</Text>
          </View>

          <View style={styles.servicesContainer}>
            {mechanic.services.map((service, index) => (
              <View key={index} style={[styles.serviceBadge, isDark && styles.serviceBadgeDark]}>
                <Text style={[styles.serviceText, isDark && styles.textLight]}>{service}</Text>
              </View>
            ))}
          </View>

          <View style={styles.detailsContainer}>
            <View style={styles.detailItem}>
              <Feather name="dollar-sign" size={14} color={isDark ? colors.gray[400] : colors.gray[500]} />
              <Text style={[styles.detailText, isDark && styles.textMutedLight]}>{mechanic.pricingTransparency}</Text>
            </View>

            <View style={styles.detailItem}>
              <Feather name="check-circle" size={14} color={isDark ? colors.gray[400] : colors.gray[500]} />
              <Text style={[styles.detailText, isDark && styles.textMutedLight]}>{mechanic.certification}</Text>
            </View>
          </View>

          <View style={styles.mechanicFooter}>
            <Text style={[styles.priceText, isDark && styles.textLight]}>
              Starting at ${mechanic.startingPrice} • {mechanic.estimatedTime}
            </Text>

            <Button
              title="View Profile"
              onPress={() => navigation.navigate("MechanicProfile", { id: mechanic.id })}
              size="sm"
            />
          </View>
        </View>
      </CardContent>
    </Card>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    color: colors.gray[900],
  },
  subtitle: {
    fontSize: 16,
    color: colors.gray[600],
    marginBottom: 16,
  },
  searchContainer: {
    gap: 12,
  },
  inputContainer: {
    position: "relative",
  },
  inputIcon: {
    position: "absolute",
    left: 12,
    top: 12,
    zIndex: 1,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.white,
  },
  inputDark: {
    borderColor: colors.gray[700],
    backgroundColor: colors.gray[800],
    color: colors.white,
  },
  searchButton: {
    height: 44,
  },
  filtersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.gray[300],
    backgroundColor: colors.white,
    gap: 6,
  },
  filterButtonDark: {
    borderColor: colors.gray[700],
    backgroundColor: colors.gray[800],
  },
  filterButtonText: {
    fontSize: 14,
    color: colors.gray[900],
  },
  sortContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sortLabel: {
    fontSize: 14,
    color: colors.gray[600],
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.gray[900],
  },
  tabsContainer: {
    paddingHorizontal: 20,
  },
  tabsHeader: {
    flexDirection: "row",
    marginBottom: 16,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.gray[300],
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: colors.white,
  },
  tabButtonDark: {
    backgroundColor: colors.gray[800],
    borderColor: colors.gray[700],
  },
  activeTabButton: {
    backgroundColor: colors.primary[500],
  },
  activeTabButtonDark: {
    backgroundColor: colors.primary[600],
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.gray[900],
  },
  activeTabButtonText: {
    color: colors.white,
  },
  mechanicsContainer: {
    marginBottom: 20,
  },
  mapContainer: {
    height: 300,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gray[300],
    backgroundColor: colors.gray[100],
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  mapPlaceholder: {
    color: colors.gray[500],
  },
  mechanicCard: {
    marginBottom: 16,
  },
  mechanicCardContent: {
    padding: 0,
  },
  mechanicImage: {
    width: "100%",
    height: 150,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  mechanicInfo: {
    padding: 16,
  },
  mechanicHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  mechanicName: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.gray[900],
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: colors.gray[600],
  },
  availabilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  availabilityToday: {
    backgroundColor: colors.green[500] + "20", // 20% opacity
  },
  availabilityTomorrow: {
    backgroundColor: colors.gray[200],
  },
  availabilityBadgeDark: {
    backgroundColor: colors.gray[700],
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: "500",
  },
  availabilityTodayText: {
    color: colors.green[500],
  },
  availabilityTomorrowText: {
    color: colors.gray[700],
  },
  availabilityTextDark: {
    color: colors.white,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 4,
  },
  starsContainer: {
    flexDirection: "row",
    gap: 2,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.gray[900],
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: colors.gray[600],
  },
  servicesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  serviceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.gray[300],
    backgroundColor: colors.white,
  },
  serviceBadgeDark: {
    borderColor: colors.gray[700],
    backgroundColor: colors.gray[800],
  },
  serviceText: {
    fontSize: 12,
    color: colors.gray[900],
  },
  detailsContainer: {
    gap: 8,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: colors.gray[600],
  },
  mechanicFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  priceText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.gray[900],
  },
  textLight: {
    color: colors.white,
  },
  textMutedLight: {
    color: colors.gray[400],
  },
})

