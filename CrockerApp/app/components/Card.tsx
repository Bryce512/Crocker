"use client"

import type React from "react"
import { View, StyleSheet, type ViewStyle } from "react-native"
import { useTheme } from "./theme-provider"
import { colors } from "../theme/colors"

type CardProps = {
  children: React.ReactNode
  style?: ViewStyle
}

export default function Card({ children, style }: CardProps) {
  const { isDark } = useTheme()

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? colors.gray[800] : colors.white,
          borderColor: isDark ? colors.gray[700] : colors.gray[200],
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}

export function CardHeader({ children, style }: CardProps) {
  return <View style={[styles.cardHeader, style]}>{children}</View>
}

export function CardContent({ children, style }: CardProps) {
  return <View style={[styles.cardContent, style]}>{children}</View>
}

export function CardFooter({ children, style }: CardProps) {
  return <View style={[styles.cardFooter, style]}>{children}</View>
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
  },
  cardHeader: {
    padding: 16,
    paddingBottom: 8,
  },
  cardContent: {
    padding: 16,
  },
  cardFooter: {
    padding: 16,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
})

