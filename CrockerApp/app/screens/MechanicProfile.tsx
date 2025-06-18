"use client"

import { useState } from "react"
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, useColorScheme, Dimensions } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation, useRoute } from "@react-navigation/native"
import { Feather } from "@expo/vector-icons"
import Button from "../components/Button"
import Card, { CardContent, CardHeader } from "../components/Card"
import { colors } from "../theme/colors"

const { width } = Dimensions.get("window")

export default function MechanicProfileScreen() {
  const navigation = useNavigation()
  const route = useRoute()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"

  const [activeTab, setActiveTab] = useState("services")

  // In a real app, you would fetch the mechanic data based on the ID
  const mechanic = {
    id: route.params?.id || 1,
    name: "Precision Auto Care",
    address: "1234 Auto Lane, Austin, TX 78701",
    phone: "(512) 555-1234",
    email: "info@precisionautocare.com",
    website: "www.precisionautocare.com",
    hours: {
      Monday: "8:00 AM - 6:00 PM",
      Tuesday: "8:00 AM - 6:00 PM",
      Wednesday: "8:00 AM - 6:00 PM",
      Thursday: "8:00 AM - 6:00 PM",
      Friday: "8:00 AM - 6:00 PM",
      Saturday: "9:00 AM - 4:00 PM",
      Sunday: "Closed",
    },
    images: [
      "https://via.placeholder.com/600x400",
      "https://via.placeholder.com/600x400",
      "https://via.placeholder.com/600x400",
    ],
    description:
      "Precision Auto Care is a family-owned business with over 20 years of experience. We specialize in all makes and models, providing honest and transparent service to keep your vehicle running smoothly.",
    rating: 4.8,
    reviewCount: 243,
    services: [
      {
        name: "Oil Change",
        price: "$49 - $89",
        description: "Full-service oil change with filter replacement and fluid check",
      },
      {
        name: "Brake Service",
        price: "$249 - $499",
        description: "Includes pad/shoe replacement, rotor/drum resurfacing, and brake fluid flush",
      },
      {
        name: "Engine Diagnostics",
        price: "$89",
        description: "Comprehensive computer diagnostics with detailed report",
      },
      {
        name: "Transmission Service",
        price: "$149 - $299",
        description: "Fluid exchange, filter replacement, and pan gasket replacement",
      },
    ],
    certifications: [
      "ASE Certified Master Technician",
      "Factory Trained for Toyota and Honda",
      "AAA Approved Auto Repair",
    ],
    partsPolicy: "Customer can choose parts for most repairs. We offer OEM, aftermarket, and economy options.",
    reviews: [
      {
        name: "Sarah K.",
        rating: 5,
        date: "3 days ago",
        comment:
          "I've been coming to Precision Auto Care for years and have always had excellent service. They explain everything clearly and never try to upsell unnecessary services.",
      },
      {
        name: "James L.",
        rating: 5,
        date: "2 weeks ago",
        comment:
          "My check engine light came on while on a road trip. They got me in same day, fixed the issue quickly and for a fair price. Highly recommend!",
      },
      {
        name: "Michelle P.",
        rating: 4,
        date: "1 month ago",
        comment:
          "Good service, fair pricing. The only reason I'm giving 4 stars instead of 5 is that it took a bit longer than the estimated time.",
      },
    ],
  }

  const handleBookAppointment = () => {
    navigation.navigate("BookAppointment", { id: mechanic.id })
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, isDark && styles.textLight]}>{mechanic.name}</Text>
            <View style={styles.addressContainer}>
              <Feather name="map-pin" size={14} color={isDark ? colors.gray[400] : colors.gray[500]} />
              <Text style={[styles.address, isDark && styles.textMutedLight]}>{mechanic.address}</Text>
            </View>
          </View>

          <View style={styles.ratingContainer}>
            <View style={styles.starsContainer}>
              {[...Array(5)].map((_, i) => (
                <Feather
                  key={i}
                  name="star"
                  size={16}
                  color={i < Math.floor(mechanic.rating) ? colors.primary[500] : colors.gray[300]}
                  style={i < Math.floor(mechanic.rating) && { fill: colors.primary[500] }}
                />
              ))}
            </View>
            <Text style={[styles.ratingText, isDark && styles.textLight]}>{mechanic.rating.toFixed(1)}</Text>
            <Text style={[styles.reviewCount, isDark && styles.textMutedLight]}>({mechanic.reviewCount} reviews)</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageGallery}>
          {mechanic.images.map((image, index) => (
            <Image key={index} source={{ uri: image }} style={styles.galleryImage} resizeMode="cover" />
          ))}
        </ScrollView>

        <View style={styles.descriptionContainer}>
          <Text style={[styles.description, isDark && styles.textMutedLight]}>{mechanic.description}</Text>
        </View>

        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsHeader}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "services" && styles.activeTabButton,
                isDark && styles.tabButtonDark,
                activeTab === "services" && isDark && styles.activeTabButtonDark,
              ]}
              onPress={() => setActiveTab("services")}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === "services" && styles.activeTabButtonText,
                  isDark && styles.textLight,
                ]}
              >
                Services
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "about" && styles.activeTabButton,
                isDark && styles.tabButtonDark,
                activeTab === "about" && isDark && styles.activeTabButtonDark,
              ]}
              onPress={() => setActiveTab("about")}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === "about" && styles.activeTabButtonText,
                  isDark && styles.textLight,
                ]}
              >
                About
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "reviews" && styles.activeTabButton,
                isDark && styles.tabButtonDark,
                activeTab === "reviews" && isDark && styles.activeTabButtonDark,
              ]}
              onPress={() => setActiveTab("reviews")}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === "reviews" && styles.activeTabButtonText,
                  isDark && styles.textLight,
                ]}
              >
                Reviews
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "location" && styles.activeTabButton,
                isDark && styles.tabButtonDark,
                activeTab === "location" && isDark && styles.activeTabButtonDark,
              ]}
              onPress={() => setActiveTab("location")}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === "location" && styles.activeTabButtonText,
                  isDark && styles.textLight,
                ]}
              >
                Location
              </Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.tabContent}>
            {activeTab === "services" && (
              <View style={styles.servicesContainer}>
                {mechanic.services.map((service, index) => (
                  <Card key={index} style={styles.serviceCard}>
                    <CardHeader style={styles.serviceCardHeader}>
                      <Text style={[styles.serviceName, isDark && styles.textLight]}>{service.name}</Text>
                      <Text style={[styles.servicePrice, isDark && styles.textLight]}>{service.price}</Text>
                    </CardHeader>
                    <CardContent>
                      <Text style={[styles.serviceDescription, isDark && styles.textMutedLight]}>
                        {service.description}
                      </Text>
                    </CardContent>
                  </Card>
                ))}
              </View>
            )}

            {activeTab === "about" && (
              <View style={styles.aboutContainer}>
                <Card style={styles.aboutCard}>
                  <CardHeader style={styles.aboutCardHeader}>
                    <View style={styles.aboutCardTitleContainer}>
                      <Feather name="award" size={16} color={isDark ? colors.white : colors.gray[900]} />
                      <Text style={[styles.aboutCardTitle, isDark && styles.textLight]}>Certifications</Text>
                    </View>
                  </CardHeader>
                  <CardContent>
                    <View style={styles.certificationsList}>
                      {mechanic.certifications.map((cert, index) => (
                        <View key={index} style={styles.certificationItem}>
                          <Feather name="check-circle" size={14} color={colors.primary[500]} />
                          <Text style={[styles.certificationText, isDark && styles.textLight]}>{cert}</Text>
                        </View>
                      ))}
                    </View>
                  </CardContent>
                </Card>

                <Card style={styles.aboutCard}>
                  <CardHeader style={styles.aboutCardHeader}>
                    <View style={styles.aboutCardTitleContainer}>
                      <Feather name="dollar-sign" size={16} color={isDark ? colors.white : colors.gray[900]} />
                      <Text style={[styles.aboutCardTitle, isDark && styles.textLight]}>Parts Policy</Text>
                    </View>
                  </CardHeader>
                  <CardContent>
                    <Text style={[styles.partsPolicy, isDark && styles.textMutedLight]}>{mechanic.partsPolicy}</Text>
                  </CardContent>
                </Card>
              </View>
            )}

            {activeTab === "reviews" && (
              <View style={styles.reviewsContainer}>
                <Card>
                  <CardHeader style={styles.reviewsCardHeader}>
                    <Text style={[styles.reviewsTitle, isDark && styles.textLight]}>Customer Reviews</Text>
                    <Text style={[styles.reviewsSubtitle, isDark && styles.textMutedLight]}>
                      Based on {mechanic.reviewCount} verified reviews
                    </Text>
                  </CardHeader>
                  <CardContent>
                    {mechanic.reviews.map((review, index) => (
                      <View
                        key={index}
                        style={[
                          styles.reviewItem,
                          index < mechanic.reviews.length - 1 && styles.reviewItemBorder,
                          isDark && styles.reviewItemBorderDark,
                        ]}
                      >
                        <View style={styles.reviewHeader}>
                          <Text style={[styles.reviewerName, isDark && styles.textLight]}>{review.name}</Text>
                          <Text style={[styles.reviewDate, isDark && styles.textMutedLight]}>{review.date}</Text>
                        </View>

                        <View style={styles.reviewRating}>
                          {[...Array(5)].map((_, i) => (
                            <Feather
                              key={i}
                              name="star"
                              size={14}
                              color={i < review.rating ? colors.primary[500] : colors.gray[300]}
                              style={i < review.rating && { fill: colors.primary[500] }}
                            />
                          ))}
                        </View>

                        <Text style={[styles.reviewComment, isDark && styles.textMutedLight]}>{review.comment}</Text>
                      </View>
                    ))}
                  </CardContent>
                </Card>
              </View>
            )}

            {activeTab === "location" && (
              <View style={styles.locationContainer}>
                <Card>
                  <CardHeader style={styles.locationCardHeader}>
                    <View style={styles.locationCardTitleContainer}>
                      <Feather name="map-pin" size={16} color={isDark ? colors.white : colors.gray[900]} />
                      <Text style={[styles.locationCardTitle, isDark && styles.textLight]}>Location & Hours</Text>
                    </View>
                  </CardHeader>
                  <CardContent>
                    <View style={[styles.mapPlaceholder, isDark && styles.mapPlaceholderDark]}>
                      <Text style={[styles.mapPlaceholderText, isDark && styles.textMutedLight]}>
                        Interactive map would be displayed here
                      </Text>
                    </View>

                    <View style={styles.locationDetails}>
                      <View style={styles.addressSection}>
                        <Text style={[styles.sectionTitle, isDark && styles.textLight]}>Address</Text>
                        <Text style={[styles.addressText, isDark && styles.textMutedLight]}>{mechanic.address}</Text>

                        <View style={styles.contactInfo}>
                          <View style={styles.contactItem}>
                            <Feather name="phone" size={14} color={isDark ? colors.gray[400] : colors.gray[500]} />
                            <Text style={[styles.contactText, isDark && styles.textLight]}>{mechanic.phone}</Text>
                          </View>

                          <View style={styles.contactItem}>
                            <Feather name="mail" size={14} color={isDark ? colors.gray[400] : colors.gray[500]} />
                            <Text style={[styles.contactText, isDark && styles.textLight]}>{mechanic.email}</Text>
                          </View>

                          <View style={styles.contactItem}>
                            <Feather name="globe" size={14} color={isDark ? colors.gray[400] : colors.gray[500]} />
                            <Text style={[styles.contactText, isDark && styles.textLight]}>{mechanic.website}</Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.hoursSection}>
                        <Text style={[styles.sectionTitle, isDark && styles.textLight]}>Business Hours</Text>

                        <View style={styles.hoursList}>
                          {Object.entries(mechanic.hours).map(([day, hours], index) => (
                            <View key={index} style={styles.hoursItem}>
                              <Text style={[styles.dayText, isDark && styles.textLight]}>{day}</Text>
                              <Text style={[styles.hoursText, isDark && styles.textMutedLight]}>{hours}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    </View>
                  </CardContent>
                </Card>
              </View>
            )}
          </View>
        </View>

        <View style={styles.bookingSection}>
          <Card>
            <CardHeader style={styles.bookingCardHeader}>
              <Text style={[styles.bookingTitle, isDark && styles.textLight]}>Book an Appointment</Text>
              <Text style={[styles.bookingSubtitle, isDark && styles.textMutedLight]}>
                Schedule service with this mechanic
              </Text>
            </CardHeader>
            <CardContent style={styles.bookingCardContent}>
              <View style={styles.responseTime}>
                <Feather name="clock" size={14} color={isDark ? colors.gray[400] : colors.gray[500]} />
                <Text style={[styles.responseTimeText, isDark && styles.textMutedLight]}>
                  Typically responds within 1 hour
                </Text>
              </View>

              <Button
                title="Book Now"
                onPress={handleBookAppointment}
                icon={<Feather name="calendar" size={16} color={colors.white} />}
                fullWidth
                style={styles.bookButton}
              />

              <Button
                title="Call Mechanic"
                onPress={() => {}}
                variant="outline"
                icon={<Feather name="phone" size={16} color={isDark ? colors.white : colors.primary[500]} />}
                fullWidth
              />
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.gray[900],
    marginBottom: 4,
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  address: {
    fontSize: 14,
    color: colors.gray[600],
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
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
  imageGallery: {
    paddingHorizontal: 20,
    gap: 12,
  },
  galleryImage: {
    width: width * 0.7,
    height: 200,
    borderRadius: 8,
  },
  descriptionContainer: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.gray[600],
  },
  tabsContainer: {
    paddingHorizontal: 20,
  },
  tabsHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  tabButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  tabButtonDark: {
    borderBottomColor: colors.gray[700],
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary[500],
  },
  activeTabButtonDark: {
    borderBottomColor: colors.primary[500],
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.gray[600],
  },
  activeTabButtonText: {
    color: colors.primary[500],
  },
  tabContent: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  servicesContainer: {
    gap: 16,
  },
  serviceCard: {
    marginBottom: 8,
  },
  serviceCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  serviceName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.gray[900],
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.gray[900],
  },
  serviceDescription: {
    fontSize: 14,
    color: colors.gray[600],
  },
  aboutContainer: {
    gap: 16,
  },
  aboutCard: {
    marginBottom: 8,
  },
  aboutCardHeader: {
    paddingBottom: 8,
  },
  aboutCardTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  aboutCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.gray[900],
  },
  certificationsList: {
    gap: 8,
  },
  certificationItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  certificationText: {
    fontSize: 14,
    color: colors.gray[900],
  },
  partsPolicy: {
    fontSize: 14,
    color: colors.gray[600],
    lineHeight: 20,
  },
  reviewsContainer: {
    marginBottom: 8,
  },
  reviewsCardHeader: {
    paddingBottom: 8,
  },
  reviewsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.gray[900],
  },
  reviewsSubtitle: {
    fontSize: 14,
    color: colors.gray[600],
  },
  reviewItem: {
    paddingVertical: 12,
  },
  reviewItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  reviewItemBorderDark: {
    borderBottomColor: colors.gray[700],
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.gray[900],
  },
  reviewDate: {
    fontSize: 12,
    color: colors.gray[500],
  },
  reviewRating: {
    flexDirection: "row",
    gap: 2,
    marginBottom: 8,
  },
  reviewComment: {
    fontSize: 14,
    color: colors.gray[600],
    lineHeight: 20,
  },
  locationContainer: {
    marginBottom: 8,
  },
  locationCardHeader: {
    paddingBottom: 8,
  },
  locationCardTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  locationCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.gray[900],
  },
  mapPlaceholder: {
    height: 200,
    borderRadius: 8,
    backgroundColor: colors.gray[100],
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  mapPlaceholderDark: {
    backgroundColor: colors.gray[800],
    borderColor: colors.gray[700],
  },
  mapPlaceholderText: {
    color: colors.gray[500],
  },
  locationDetails: {
    gap: 16,
  },
  addressSection: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.gray[900],
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: colors.gray[600],
  },
  contactInfo: {
    marginTop: 8,
    gap: 8,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  contactText: {
    fontSize: 14,
    color: colors.gray[900],
  },
  hoursSection: {
    gap: 8,
  },
  hoursList: {
    gap: 4,
  },
  hoursItem: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.gray[900],
  },
  hoursText: {
    fontSize: 14,
    color: colors.gray[600],
  },
  bookingSection: {
    padding: 20,
    paddingTop: 8,
  },
  bookingCardHeader: {
    paddingBottom: 8,
  },
  bookingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.gray[900],
  },
  bookingSubtitle: {
    fontSize: 14,
    color: colors.gray[600],
  },
  bookingCardContent: {
    gap: 16,
  },
  responseTime: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  responseTimeText: {
    fontSize: 14,
    color: colors.gray[600],
  },
  bookButton: {
    marginBottom: 8,
  },
  textLight: {
    color: colors.white,
  },
  textMutedLight: {
    color: colors.gray[400],
  },
})

