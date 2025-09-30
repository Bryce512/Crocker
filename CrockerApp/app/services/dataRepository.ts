// Data Repository - Abstract data access layer
import firebaseService from "./firebaseService";
import {
  Event,
  Kid,
  Vehicle,
  User,
  UserProfile,
  ServiceResponse,
} from "../models";

export interface DataRepository {
  // User operations
  getUserProfile(userId: string): Promise<ServiceResponse<UserProfile>>;
  updateUserProfile(
    userId: string,
    profile: Partial<UserProfile>
  ): Promise<ServiceResponse<UserProfile>>;

  // Event operations
  getEvents(): Promise<ServiceResponse<Event[]>>;
  addEvent(event: Omit<Event, "id">): Promise<ServiceResponse<Event>>;
  updateEvent(
    eventId: string,
    updates: Partial<Event>
  ): Promise<ServiceResponse<Event>>;
  deleteEvent(eventId: string): Promise<ServiceResponse<boolean>>;

  // Kid operations
  getKids(): Promise<ServiceResponse<Kid[]>>;
  addKid(kid: Omit<Kid, "id">): Promise<ServiceResponse<Kid>>;
  updateKid(
    kidId: string,
    updates: Partial<Kid>
  ): Promise<ServiceResponse<Kid>>;
  deleteKid(kidId: string): Promise<ServiceResponse<boolean>>;

  // Vehicle operations
  getVehicles(): Promise<ServiceResponse<Vehicle[]>>;
  addVehicle(vehicle: Omit<Vehicle, "id">): Promise<ServiceResponse<Vehicle>>;
  updateVehicle(
    vehicleId: string,
    updates: Partial<Vehicle>
  ): Promise<ServiceResponse<Vehicle>>;
  deleteVehicle(vehicleId: string): Promise<ServiceResponse<boolean>>;
}

class FirebaseDataRepository implements DataRepository {
  // User operations
  async getUserProfile(userId: string): Promise<ServiceResponse<UserProfile>> {
    try {
      const profile = await firebaseService.getUserProfile(userId);
      return {
        success: true,
        data: profile,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get user profile: ${error}`,
      };
    }
  }

  async updateUserProfile(
    userId: string,
    profile: Partial<UserProfile>
  ): Promise<ServiceResponse<UserProfile>> {
    try {
      // Firebase service doesn't have updateUserProfile, so we'll use writeData
      await firebaseService.writeData(
        userId,
        profile.name || "",
        profile.email || ""
      );
      const updatedProfile = await firebaseService.getUserProfile(userId);
      return {
        success: true,
        data: updatedProfile,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update user profile: ${error}`,
      };
    }
  }

  // Event operations
  async getEvents(): Promise<ServiceResponse<Event[]>> {
    try {
      const events = await firebaseService.getEvents();
      return {
        success: true,
        data: events,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get events: ${error}`,
      };
    }
  }

  async addEvent(
    eventData: Omit<Event, "id">
  ): Promise<ServiceResponse<Event>> {
    try {
      const event = await firebaseService.addEvent({
        ...eventData,
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      });
      return {
        success: true,
        data: event,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to add event: ${error}`,
      };
    }
  }

  async updateEvent(
    eventId: string,
    updates: Partial<Event>
  ): Promise<ServiceResponse<Event>> {
    try {
      await firebaseService.updateEvent(eventId, updates);

      // Get updated event (we need to reconstruct it since updateEvent returns boolean)
      const events = await firebaseService.getEvents();
      const updatedEvent = events.find((event) => event.id === eventId);

      if (!updatedEvent) {
        throw new Error("Event not found after update");
      }

      return {
        success: true,
        data: updatedEvent,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update event: ${error}`,
      };
    }
  }

  async deleteEvent(eventId: string): Promise<ServiceResponse<boolean>> {
    try {
      await firebaseService.deleteEvent(eventId);
      return {
        success: true,
        data: true,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete event: ${error}`,
      };
    }
  }

  // Kid operations
  async getKids(): Promise<ServiceResponse<Kid[]>> {
    try {
      const kids = await firebaseService.getKids();
      return {
        success: true,
        data: kids,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get kids: ${error}`,
      };
    }
  }

  async addKid(kidData: Omit<Kid, "id">): Promise<ServiceResponse<Kid>> {
    try {
      const kid = {
        ...kidData,
        id: `kid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };
      await firebaseService.addKid(kid);
      return {
        success: true,
        data: kid,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to add kid: ${error}`,
      };
    }
  }

  async updateKid(
    kidId: string,
    updates: Partial<Kid>
  ): Promise<ServiceResponse<Kid>> {
    try {
      // Firebase service doesn't have updateKid, so we need to get all kids and update
      const kids = await firebaseService.getKids();
      const kidIndex = kids.findIndex((kid) => kid.id === kidId);

      if (kidIndex === -1) {
        throw new Error("Kid not found");
      }

      const updatedKid = { ...kids[kidIndex], ...updates };
      kids[kidIndex] = updatedKid;

      await firebaseService.addKid(kids); // This saves all kids
      return {
        success: true,
        data: updatedKid,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update kid: ${error}`,
      };
    }
  }

  async deleteKid(kidId: string): Promise<ServiceResponse<boolean>> {
    try {
      // Firebase service doesn't have deleteKid, so we need to get all kids and filter
      const kids = await firebaseService.getKids();
      const filteredKids = kids.filter((kid) => kid.id !== kidId);

      await firebaseService.addKid(filteredKids);
      return {
        success: true,
        data: true,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete kid: ${error}`,
      };
    }
  }

  // Vehicle operations
  async getVehicles(): Promise<ServiceResponse<Vehicle[]>> {
    try {
      const user = firebaseService.getCurrentUser();
      if (!user) {
        throw new Error("No authenticated user");
      }

      const vehicles = await firebaseService.getVehicles(user.uid);
      return {
        success: true,
        data: vehicles,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get vehicles: ${error}`,
      };
    }
  }

  async addVehicle(
    vehicleData: Omit<Vehicle, "id">
  ): Promise<ServiceResponse<Vehicle>> {
    try {
      const user = firebaseService.getCurrentUser();
      if (!user) {
        throw new Error("No authenticated user");
      }

      const vehicle = await firebaseService.addVehicle(user.uid, vehicleData);
      return {
        success: true,
        data: vehicle,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to add vehicle: ${error}`,
      };
    }
  }

  async updateVehicle(
    vehicleId: string,
    updates: Partial<Vehicle>
  ): Promise<ServiceResponse<Vehicle>> {
    try {
      const user = firebaseService.getCurrentUser();
      if (!user) {
        throw new Error("No authenticated user");
      }

      const vehicle = await firebaseService.updateVehicle(
        user.uid,
        vehicleId,
        updates
      );
      return {
        success: true,
        data: vehicle,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update vehicle: ${error}`,
      };
    }
  }

  async deleteVehicle(vehicleId: string): Promise<ServiceResponse<boolean>> {
    try {
      const user = firebaseService.getCurrentUser();
      if (!user) {
        throw new Error("No authenticated user");
      }

      await firebaseService.deleteVehicle(user.uid, vehicleId);
      return {
        success: true,
        data: true,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete vehicle: ${error}`,
      };
    }
  }
}

// Export singleton instance
export const dataRepository: DataRepository = new FirebaseDataRepository();

export default dataRepository;
