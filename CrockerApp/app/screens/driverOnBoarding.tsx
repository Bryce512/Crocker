"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle, ChevronRight, Car, User, CreditCard, UploadCloud } from "lucide-react"
import Link from "next/link"

export default function DriverOnboarding() {
  const [step, setStep] = useState(1)
  const [progress, setProgress] = useState(25)

  const nextStep = () => {
    if (step < 4) {
      setStep(step + 1)
      setProgress((step + 1) * 25)
    }
  }

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1)
      setProgress((step - 1) * 25)
    }
  }

  return (
    <div className="container px-4 py-8 md:px-6 md:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Driver Onboarding</h1>
          <p className="mt-2 text-muted-foreground">Complete your profile to get started with Mychanic</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 w-full">
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="absolute h-full bg-primary transition-all" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="mt-2 flex justify-between text-xs">
            <div className={step >= 1 ? "font-medium text-primary" : "text-muted-foreground"}>Account</div>
            <div className={step >= 2 ? "font-medium text-primary" : "text-muted-foreground"}>Vehicle</div>
            <div className={step >= 3 ? "font-medium text-primary" : "text-muted-foreground"}>Payment</div>
            <div className={step >= 4 ? "font-medium text-primary" : "text-muted-foreground"}>Complete</div>
          </div>
        </div>

        {/* Step 1: Account Information */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Account Information
              </CardTitle>
              <CardDescription>Set up your profile and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first-name">First Name</Label>
                  <Input id="first-name" placeholder="Enter your first name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Last Name</Label>
                  <Input id="last-name" placeholder="Enter your last name" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" placeholder="Enter your email address" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" placeholder="Enter your phone number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">Zip Code</Label>
                <Input id="zip" placeholder="Enter your zip code" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Create Password</Label>
                <Input id="password" type="password" placeholder="Create a secure password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input id="confirm-password" type="password" placeholder="Confirm your password" />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" asChild>
                <Link href="/">Cancel</Link>
              </Button>
              <Button onClick={nextStep}>
                Continue <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 2: Vehicle Information */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5 text-primary" />
                Vehicle Information
              </CardTitle>
              <CardDescription>Add your vehicle details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs defaultValue="manual" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="manual">Enter Manually</TabsTrigger>
                  <TabsTrigger value="obd">Connect OBD-II</TabsTrigger>
                </TabsList>
                <TabsContent value="manual" className="space-y-4 pt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="year">Year</Label>
                      <Select>
                        <SelectTrigger id="year">
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          {[...Array(30)].map((_, i) => (
                            <SelectItem key={i} value={(new Date().getFullYear() - i).toString()}>
                              {new Date().getFullYear() - i}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="make">Make</Label>
                      <Select>
                        <SelectTrigger id="make">
                          <SelectValue placeholder="Select make" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="toyota">Toyota</SelectItem>
                          <SelectItem value="honda">Honda</SelectItem>
                          <SelectItem value="ford">Ford</SelectItem>
                          <SelectItem value="chevrolet">Chevrolet</SelectItem>
                          <SelectItem value="bmw">BMW</SelectItem>
                          <SelectItem value="mercedes">Mercedes-Benz</SelectItem>
                          <SelectItem value="audi">Audi</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="model">Model</Label>
                      <Input id="model" placeholder="Enter model" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="trim">Trim (Optional)</Label>
                      <Input id="trim" placeholder="Enter trim" />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="mileage">Current Mileage</Label>
                      <Input id="mileage" type="number" placeholder="Enter mileage" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vin">VIN (Optional)</Label>
                      <Input id="vin" placeholder="Enter VIN number" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="issues">Known Issues (Optional)</Label>
                    <Textarea id="issues" placeholder="Describe any known issues with your vehicle" className="h-20" />
                  </div>
                </TabsContent>
                <TabsContent value="obd" className="pt-4">
                  <div className="rounded-lg border p-6 text-center space-y-4">
                    <div className="flex justify-center">
                      <Car className="h-12 w-12 text-primary" />
                    </div>
                    <h3 className="text-lg font-medium">Connect OBD-II Scanner</h3>
                    <p className="text-sm text-muted-foreground mx-auto max-w-md">
                      Connect your OBD-II scanner to your vehicle and sync with our app to automatically populate your
                      vehicle details and provide mechanics with diagnostic information.
                    </p>
                    <div className="pt-4">
                      <Button>Connect OBD-II Device</Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Compatible with most Bluetooth OBD-II scanners. You can also add your vehicle manually.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
              <div className="flex items-center gap-2 pt-4">
                <Button variant="outline" className="w-full">
                  <UploadCloud className="mr-2 h-4 w-4" />
                  Upload Vehicle Photos (Optional)
                </Button>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                Back
              </Button>
              <Button onClick={nextStep}>
                Continue <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 3: Payment Information */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Payment Information
              </CardTitle>
              <CardDescription>Add a payment method (optional)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  Adding a payment method is optional. You can skip this step and add payment details later when booking
                  your first appointment.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="card-name">Name on Card</Label>
                <Input id="card-name" placeholder="Enter name as it appears on card" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="card-number">Card Number</Label>
                <Input id="card-number" placeholder="0000 0000 0000 0000" />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2 md:col-span-1">
                  <Label htmlFor="expiry-month">Expiry Month</Label>
                  <Select>
                    <SelectTrigger id="expiry-month">
                      <SelectValue placeholder="MM" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...Array(12)].map((_, i) => (
                        <SelectItem key={i} value={(i + 1).toString().padStart(2, "0")}>
                          {(i + 1).toString().padStart(2, "0")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-1">
                  <Label htmlFor="expiry-year">Expiry Year</Label>
                  <Select>
                    <SelectTrigger id="expiry-year">
                      <SelectValue placeholder="YY" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...Array(10)].map((_, i) => {
                        const year = (new Date().getFullYear() + i).toString().slice(2)
                        return (
                          <SelectItem key={i} value={year}>
                            {year}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-1">
                  <Label htmlFor="cvv">CVV</Label>
                  <Input id="cvv" placeholder="123" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing-zip">Billing Zip Code</Label>
                <Input id="billing-zip" placeholder="Enter billing zip code" />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={nextStep}>
                  Skip for Now
                </Button>
                <Button onClick={nextStep}>Save & Continue</Button>
              </div>
            </CardFooter>
          </Card>
        )}

        {/* Step 4: Complete */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-center">Registration Complete!</CardTitle>
              <CardDescription className="text-center">Your account has been created successfully</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-muted-foreground">
                Thank you for joining Mychanic. You can now find and book appointments with trusted mechanics in your
                area.
              </p>
              <div className="rounded-lg border p-4 space-y-3">
                <h3 className="font-medium">Download our mobile app</h3>
                <p className="text-sm text-muted-foreground">
                  Get the full Mychanic experience on your mobile device. Connect OBD-II devices, receive real-time
                  updates, and manage your appointments on the go.
                </p>
                <div className="flex justify-center gap-2">
                  <Button variant="outline" className="w-32">
                    App Store
                  </Button>
                  <Button variant="outline" className="w-32">
                    Google Play
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center gap-4">
              <Link href="/find-mechanics">
                <Button>Find Mechanics</Button>
              </Link>
              <Link href="/vehicle-profiles">
                <Button variant="outline">
                  <Car className="mr-2 h-4 w-4" />
                  View Vehicle Profile
                </Button>
              </Link>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  )
}

