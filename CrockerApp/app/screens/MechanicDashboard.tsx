"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Activity,
  CalendarDays,
  Clock,
  Car,
  Users,
  DollarSign,
  Star,
  CalendarIcon,
  ChevronDown,
  MessageSquare,
  Settings,
  PenToolIcon as Tool,
  MessageCircle,
  CheckCircle,
  ChevronRight,
  BellPlus,
  ClipboardList,
} from "lucide-react"
import Link from "next/link"

export default function MechanicDashboard() {
  const [date, setDate] = useState(new Date())

  return (
    <div className="container px-4 py-6 md:px-6 md:py-8">
      <div className="grid gap-8 md:grid-cols-[240px_1fr] lg:grid-cols-[280px_1fr]">
        {/* Sidebar - Desktop */}
        <div className="hidden md:block">
          <div className="sticky top-24 grid gap-4">
            <div className="flex items-center gap-4 rounded-lg border p-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src="/placeholder.svg?height=40&width=40" alt="Precision Auto Care" />
                <AvatarFallback>PA</AvatarFallback>
              </Avatar>
              <div className="grid gap-1">
                <div className="font-medium">Precision Auto Care</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  Active
                </div>
              </div>
            </div>
            <nav className="grid gap-2">
              <Button variant="ghost" className="justify-start" asChild>
                <Link href="/mechanic-dashboard">
                  <Activity className="mr-2 h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
              <Button variant="ghost" className="justify-start" asChild>
                <Link href="/mechanic-dashboard/appointments">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Appointments
                </Link>
              </Button>
              <Button variant="ghost" className="justify-start" asChild>
                <Link href="/mechanic-dashboard/customers">
                  <Users className="mr-2 h-4 w-4" />
                  Customers
                </Link>
              </Button>
              <Button variant="ghost" className="justify-start" asChild>
                <Link href="/mechanic-dashboard/services">
                  <Tool className="mr-2 h-4 w-4" />
                  Services
                </Link>
              </Button>
              <Button variant="ghost" className="justify-start" asChild>
                <Link href="/mechanic-dashboard/messages">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Messages
                  <Badge className="ml-auto h-5 w-5 rounded-full p-0 text-xs">3</Badge>
                </Link>
              </Button>
              <Button variant="ghost" className="justify-start" asChild>
                <Link href="/mechanic-dashboard/reviews">
                  <Star className="mr-2 h-4 w-4" />
                  Reviews
                </Link>
              </Button>
              <Button variant="ghost" className="justify-start" asChild>
                <Link href="/mechanic-dashboard/payments">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Payments
                </Link>
              </Button>
              <Button variant="ghost" className="justify-start" asChild>
                <Link href="/mechanic-dashboard/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </Button>
            </nav>
            <div className="rounded-lg border">
              <div className="flex items-center justify-between p-4">
                <h4 className="font-medium">Upcoming</h4>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronDown className="h-4 w-4" />
                  <span className="sr-only">Toggle</span>
                </Button>
              </div>
              <div className="px-4 pb-4">
                <Calendar mode="single" selected={date} onSelect={setDate} className="rounded-md border" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Mobile Header */}
          <div className="md:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="/placeholder.svg?height=40&width=40" alt="Precision Auto Care" />
                  <AvatarFallback>PA</AvatarFallback>
                </Avatar>
                <div className="font-medium">Precision Auto Care</div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                  <MessageCircle className="h-5 w-5" />
                  <span className="sr-only">Messages</span>
                </Button>
                <Button variant="ghost" size="icon">
                  <BellPlus className="h-5 w-5" />
                  <span className="sr-only">Notifications</span>
                </Button>
                <Button variant="ghost" size="icon">
                  <Settings className="h-5 w-5" />
                  <span className="sr-only">Settings</span>
                </Button>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Button variant="outline" className="flex flex-col items-center justify-center p-2 h-auto">
                <CalendarDays className="h-5 w-5 mb-1" />
                <span className="text-xs">Appointments</span>
              </Button>
              <Button variant="outline" className="flex flex-col items-center justify-center p-2 h-auto">
                <Users className="h-5 w-5 mb-1" />
                <span className="text-xs">Customers</span>
              </Button>
              <Button variant="outline" className="flex flex-col items-center justify-center p-2 h-auto">
                <DollarSign className="h-5 w-5 mb-1" />
                <span className="text-xs">Payments</span>
              </Button>
            </div>
          </div>

          {/* Dashboard Content */}
          <div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
              <div className="flex items-center gap-2">
                <Select defaultValue="today">
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">6</div>
                  <div className="text-xs text-muted-foreground">
                    <span className="text-green-500 font-medium">+2</span> from yesterday
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$1,245</div>
                  <div className="text-xs text-muted-foreground">
                    <span className="text-green-500 font-medium">+15%</span> from last week
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">New Customers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">3</div>
                  <div className="text-xs text-muted-foreground">
                    <span className="text-green-500 font-medium">+1</span> from yesterday
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">4.8</div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Star className="h-3 w-3 fill-primary text-primary mr-1" />
                    Based on 243 reviews
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Appointment Requests */}
            <div className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>New Appointment Requests</CardTitle>
                  <CardDescription>Review and respond to appointment requests</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[1, 2].map((_, i) => (
                      <div key={i} className="rounded-lg border p-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={`/placeholder.svg?height=40&width=40&text=${i + 1}`} alt="Customer" />
                                <AvatarFallback>{i === 0 ? "JL" : "SK"}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{i === 0 ? "James Lee" : "Sarah Kim"}</div>
                                <div className="text-sm text-muted-foreground">
                                  {i === 0 ? "2018 Toyota Camry" : "2015 Honda Civic"}
                                </div>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="font-medium">{i === 0 ? "Oil Change" : "Brake Inspection"}</div>
                              <div className="text-sm text-muted-foreground">
                                {i === 0 ? "Thursday, Mar 23, 2023 at 10:00 AM" : "Friday, Mar 24, 2023 at 2:00 PM"}
                              </div>
                              <div className="flex items-center gap-1 text-xs">
                                <ClipboardList className="h-3 w-3" />
                                <span>
                                  {i === 0 ? "OBD-II data available" : "Customer reports squeaking noise when braking"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button size="sm" className="w-full sm:w-auto">
                              Accept
                            </Button>
                            <Button size="sm" variant="outline" className="w-full sm:w-auto">
                              Reschedule
                            </Button>
                            <Button size="sm" variant="ghost" className="w-full sm:w-auto">
                              Decline
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Today's Schedule */}
            <div className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Today's Schedule</CardTitle>
                      <CardDescription>
                        {new Date().toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      View Calendar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    {[
                      {
                        time: "9:00 AM",
                        name: "Michael Johnson",
                        vehicle: "2019 Ford F-150",
                        service: "Oil Change & Tire Rotation",
                        status: "Completed",
                      },
                      {
                        time: "11:00 AM",
                        name: "Lisa Chen",
                        vehicle: "2017 Tesla Model 3",
                        service: "Brake Fluid Flush",
                        status: "In Progress",
                      },
                      {
                        time: "1:30 PM",
                        name: "Robert Garcia",
                        vehicle: "2020 Honda CR-V",
                        service: "Engine Diagnostics",
                        status: "Upcoming",
                      },
                      {
                        time: "3:00 PM",
                        name: "Emily Wilson",
                        vehicle: "2016 Subaru Outback",
                        service: "Transmission Service",
                        status: "Upcoming",
                      },
                      {
                        time: "4:30 PM",
                        name: "David Patel",
                        vehicle: "2021 Audi Q5",
                        service: "AC System Check",
                        status: "Upcoming",
                      },
                    ].map((appointment, i) => (
                      <div key={i} className="relative flex items-start gap-4">
                        <div className="absolute left-0 top-0 flex h-full w-6 items-center justify-center">
                          <div className="h-full w-[2px] bg-muted"></div>
                        </div>
                        <div className="absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full border bg-background text-xs">
                          {appointment.status === "Completed" ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : appointment.status === "In Progress" ? (
                            <div className="h-2 w-2 rounded-full bg-yellow-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 pl-10">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                            <div>
                              <div className="font-medium">
                                {appointment.time} - {appointment.name}
                              </div>
                              <div className="text-sm text-muted-foreground">{appointment.vehicle}</div>
                              <div className="text-sm">{appointment.service}</div>
                            </div>
                            <div className="flex items-center gap-2 mt-2 md:mt-0">
                              <Badge
                                variant={
                                  appointment.status === "Completed"
                                    ? "default"
                                    : appointment.status === "In Progress"
                                      ? "secondary"
                                      : "outline"
                                }
                              >
                                {appointment.status}
                              </Badge>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Vehicle Diagnostic Data */}
            <div className="mt-6">
              <Tabs defaultValue="upcoming">
                <div className="flex items-center justify-between">
                  <TabsList>
                    <TabsTrigger value="upcoming">Upcoming Vehicles</TabsTrigger>
                    <TabsTrigger value="alerts">Diagnostic Alerts</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="upcoming" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Connected Vehicle Data</CardTitle>
                      <CardDescription>OBD-II data for upcoming appointments</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {[
                          {
                            name: "James Lee",
                            vehicle: "2018 Toyota Camry",
                            appointment: "Tomorrow at 10:00 AM",
                            issues: ["Oil life: 12%", "Check engine light active", "Code P0301 - Cylinder 1 Misfire"],
                          },
                          {
                            name: "Sarah Kim",
                            vehicle: "2020 Honda Accord",
                            appointment: "Friday at 2:00 PM",
                            issues: ["Brake pad wear: 20% remaining", "Battery health: 65%"],
                          },
                        ].map((customer, i) => (
                          <div key={i} className="rounded-lg border p-4">
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Car className="h-5 w-5 text-muted-foreground" />
                                  <div className="font-medium">{customer.vehicle}</div>
                                </div>
                                <div className="text-sm">
                                  <span className="font-medium">Owner:</span> {customer.name}
                                </div>
                                <div className="text-sm">
                                  <span className="font-medium">Appointment:</span> {customer.appointment}
                                </div>
                                <div className="space-y-1 mt-2">
                                  <div className="text-sm font-medium">Diagnostic Data:</div>
                                  <ul className="text-sm text-muted-foreground space-y-1">
                                    {customer.issues.map((issue, j) => (
                                      <li key={j} className="flex items-start gap-1">
                                        <div className="mt-1 h-1 w-1 rounded-full bg-muted-foreground" />
                                        {issue}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                              <div className="flex flex-col gap-2">
                                <Button size="sm" variant="outline">
                                  <ClipboardList className="mr-2 h-4 w-4" />
                                  View Full Report
                                </Button>
                                <Button size="sm" variant="ghost">
                                  <MessageSquare className="mr-2 h-4 w-4" />
                                  Contact Customer
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="alerts" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Critical Diagnostic Alerts</CardTitle>
                      <CardDescription>Urgent issues detected in connected vehicles</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-red-600">
                              <Car className="h-5 w-5" />
                              <div className="font-medium">2018 Toyota Camry - James Lee</div>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium">Last Connection:</span> 3 hours ago
                            </div>
                            <div className="space-y-1 mt-2">
                              <div className="text-sm font-medium text-red-600">Critical Issues:</div>
                              <ul className="text-sm text-red-600 space-y-1">
                                <li className="flex items-start gap-1">
                                  <div className="mt-1 h-1 w-1 rounded-full bg-red-600" />
                                  Engine misfire detected (Code P0301)
                                </li>
                                <li className="flex items-start gap-1">
                                  <div className="mt-1 h-1 w-1 rounded-full bg-red-600" />
                                  Coolant temperature: 118°C (Overheating)
                                </li>
                              </ul>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button size="sm" variant="destructive">
                              <MessageSquare className="mr-2 h-4 w-4" />
                              Contact Urgently
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

