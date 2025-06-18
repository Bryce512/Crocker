import { View, Text, StyleSheet, ScrollView, Image, useColorScheme } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"
import { Feather } from "@expo/vector-icons"
import Button from "../components/Button"
import Card, { CardHeader, CardContent } from "../components/Card"
import { colors } from "../theme/colors"

export default function HomeScreen() {
  const navigation = useNavigation()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === "dark"

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={[styles.heroTitle, isDark && styles.textLight]}>
            Expert Auto Repairs With Complete Transparency
          </Text>
          <Text style={[styles.heroSubtitle, isDark && styles.textMutedLight]}>
            Mychanic connects you with trusted mechanics who offer transparent pricing, honest service, and expertise
            tailored to your vehicle.
          </Text>

          <View style={styles.buttonGroup}>
            <Button
              title="Find Mechanics"
              onPress={() => navigation.navigate("FindMechanics" as never)}
              icon={<Feather name="arrow-right" size={16} color={colors.white} />}
              size="lg"
            />
            <Button
              title="Join as a Mechanic"
              onPress={() => navigation.navigate("MechanicSignup" as never)}
              variant="outline"
              size="lg"
            />
          </View>

          <Image source={{ uri: "https://via.placeholder.com/600x400" }} style={styles.heroImage} resizeMode="cover" />
        </View>

        {/* How It Works */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDark && styles.textLight]}>How Mychanic Works</Text>
          <Text style={[styles.sectionSubtitle, isDark && styles.textMutedLight]}>
            Your vehicle deserves quality care, and you deserve peace of mind.
          </Text>

          <View style={styles.cardsContainer}>
            <Card style={styles.featureCard}>
              <CardHeader>
                <View style={styles.iconContainer}>
                  <Feather name="search" size={24} color={colors.primary[500]} />
                </View>
                <Text style={[styles.cardTitle, isDark && styles.textLight]}>Find Mechanics</Text>
              </CardHeader>
              <CardContent>
                <Text style={[styles.cardDescription, isDark && styles.textMutedLight]}>
                  Search for trusted mechanics in your area, compare ratings, services, and pricing transparency.
                </Text>
              </CardContent>
            </Card>

            <Card style={styles.featureCard}>
              <CardHeader>
                <View style={styles.iconContainer}>
                  <Feather name="calendar" size={24} color={colors.primary[500]} />
                </View>
                <Text style={[styles.cardTitle, isDark && styles.textLight]}>Book Appointments</Text>
              </CardHeader>
              <CardContent>
                <Text style={[styles.cardDescription, isDark && styles.textMutedLight]}>
                  Our AI-powered scheduling matches your needs with the right mechanic's availability and skills.
                </Text>
              </CardContent>
            </Card>

            <Card style={styles.featureCard}>
              <CardHeader>
                <View style={styles.iconContainer}>
                  <Feather name="truck" size={24} color={colors.primary[500]} />
                </View>
                <Text style={[styles.cardTitle, isDark && styles.textLight]}>Vehicle Profiles</Text>
              </CardHeader>
              <CardContent>
                <Text style={[styles.cardDescription, isDark && styles.textMutedLight]}>
                  Connect your OBD-II data to create a detailed vehicle profile to help mechanics diagnose issues.
                </Text>
              </CardContent>
            </Card>
          </View>
        </View>

        {/* Features */}
        <View style={[styles.section, styles.featuresSection]}>
          <Text style={[styles.sectionTitle, isDark && styles.textLight]}>Why Choose Mychanic</Text>
          <Text style={[styles.sectionSubtitle, isDark && styles.textMutedLight]}>
            We're transforming how drivers and mechanics connect.
          </Text>

          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Feather name="shield" size={24} color={colors.primary[500]} />
              <View style={styles.featureTextContainer}>
                <Text style={[styles.featureTitle, isDark && styles.textLight]}>Trusted Mechanics</Text>
                <Text style={[styles.featureDescription, isDark && styles.textMutedLight]}>
                  All mechanics in our network are vetted and reviewed by customers like you.
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <Feather name="dollar-sign" size={24} color={colors.primary[500]} />
              <View style={styles.featureTextContainer}>
                <Text style={[styles.featureTitle, isDark && styles.textLight]}>Transparent Pricing</Text>
                <Text style={[styles.featureDescription, isDark && styles.textMutedLight]}>
                  See pricing upfront, including whether shops offer part options or use the best value parts.
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <Feather name="star" size={24} color={colors.primary[500]} />
              <View style={styles.featureTextContainer}>
                <Text style={[styles.featureTitle, isDark && styles.textLight]}>Verified Reviews</Text>
                <Text style={[styles.featureDescription, isDark && styles.textMutedLight]}>
                  Real reviews from real customers who have used the services.
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <Feather name="clock" size={24} color={colors.primary[500]} />
              <View style={styles.featureTextContainer}>
                <Text style={[styles.featureTitle, isDark && styles.textLight]}>Smart Scheduling</Text>
                <Text style={[styles.featureDescription, isDark && styles.textMutedLight]}>
                  AI-powered scheduling optimizes appointment times based on your needs and mechanic availability.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Testimonials */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDark && styles.textLight]}>What Our Users Say</Text>
          <Text style={[styles.sectionSubtitle, isDark && styles.textMutedLight]}>
            Join thousands of satisfied drivers and mechanics.
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.testimonialContainer}
          >
            <Card style={styles.testimonialCard}>
              <CardHeader>
                <View style={styles.ratingContainer}>
                  {[...Array(5)].map((_, i) => (
                    <Feather key={i} name="star" size={16} color={colors.primary[500]} />
                  ))}
                </View>
              </CardHeader>
              <CardContent>
                <Text style={[styles.testimonialText, isDark && styles.textMutedLight]}>
                  "I was skeptical at first, but Mychanic made finding a reliable mechanic so easy. The pricing was
                  exactly as listed, and the OBD-II integration helped identify the issue before I even arrived."
                </Text>
                <Text style={[styles.testimonialAuthor, isDark && styles.textLight]}>- Jamie L., Driver</Text>
              </CardContent>
            </Card>

            <Card style={styles.testimonialCard}>
              <CardHeader>
                <View style={styles.ratingContainer}>
                  {[...Array(5)].map((_, i) => (
                    <Feather key={i} name="star" size={16} color={colors.primary[500]} />
                  ))}
                </View>
              </CardHeader>
              <CardContent>
                <Text style={[styles.testimonialText, isDark && styles.textMutedLight]}>
                  "As a mechanic, Mychanic has helped me connect with customers who appreciate quality work. The
                  scheduling system ensures I get jobs that match my expertise, making every repair more efficient."
                </Text>
                <Text style={[styles.testimonialAuthor, isDark && styles.textLight]}>- Michael T., Mechanic</Text>
              </CardContent>
            </Card>

            <Card style={styles.testimonialCard}>
              <CardHeader>
                <View style={styles.ratingContainer}>
                  {[...Array(5)].map((_, i) => (
                    <Feather key={i} name="star" size={16} color={colors.primary[500]} />
                  ))}
                </View>
              </CardHeader>
              <CardContent>
                <Text style={[styles.testimonialText, isDark && styles.textMutedLight]}>
                  "The vehicle profile feature is game-changing. My mechanic knew exactly what was wrong before I
                  arrived, saving me time and money. I'll never go back to the old way of finding auto repair."
                </Text>
                <Text style={[styles.testimonialAuthor, isDark && styles.textLight]}>- Sarah K., Driver</Text>
              </CardContent>
            </Card>
          </ScrollView>
        </View>

        {/* CTA */}
        <View style={styles.ctaSection}>
          <Text style={styles.ctaTitle}>Ready to Transform Your Auto Repair Experience?</Text>
          <Text style={styles.ctaSubtitle}>Join Mychanic today and connect with trusted mechanics in your area.</Text>

          <View style={styles.buttonGroup}>
            <Button
              title="Find a Mechanic"
              onPress={() => navigation.navigate("FindMechanics" as never)}
              variant="secondary"
              size="lg"
            />
            <Button
              title="Join as a Mechanic"
              onPress={() => navigation.navigate("MechanicSignup" as never)}
              variant="outline"
              size="lg"
              textStyle={{ color: colors.white }}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroSection: {
    padding: 20,
    paddingTop: 40,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 12,
    color: colors.gray[900],
  },
  heroSubtitle: {
    fontSize: 16,
    color: colors.gray[600],
    marginBottom: 24,
  },
  buttonGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  heroImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
  },
  section: {
    padding: 20,
  },
  featuresSection: {
    backgroundColor: colors.gray[100],
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
    color: colors.gray[900],
  },
  sectionSubtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    color: colors.gray[600],
  },
  cardsContainer: {
    gap: 16,
  },
  featureCard: {
    marginBottom: 16,
  },
  iconContainer: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
    color: colors.gray[900],
  },
  cardDescription: {
    fontSize: 14,
    color: colors.gray[600],
  },
  featuresList: {
    marginTop: 16,
    gap: 24,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
    color: colors.gray[900],
  },
  featureDescription: {
    fontSize: 14,
    color: colors.gray[600],
  },
  testimonialContainer: {
    paddingRight: 20,
    gap: 16,
  },
  testimonialCard: {
    width: 300,
  },
  ratingContainer: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 8,
  },
  testimonialText: {
    fontSize: 14,
    color: colors.gray[600],
    marginBottom: 12,
  },
  testimonialAuthor: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.gray[900],
  },
  ctaSection: {
    padding: 24,
    backgroundColor: colors.primary[500],
    borderRadius: 12,
    margin: 20,
    alignItems: "center",
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.white,
    textAlign: "center",
    marginBottom: 8,
  },
  ctaSubtitle: {
    fontSize: 16,
    color: colors.white,
    opacity: 0.9,
    textAlign: "center",
    marginBottom: 24,
  },
  textLight: {
    color: colors.white,
  },
  textMutedLight: {
    color: colors.gray[300],
  },
})

