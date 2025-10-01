// Data Repository - Abstract data access layer
import firebaseService from "./firebaseService";
import {
  Event,
  Kid,
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
  addKid(Kid: Omit<Kid, "id">): Promise<ServiceResponse<Kid>>;
  updateKid(
    KidId: string,
    updates: Partial<Kid>
  ): Promise<ServiceResponse<Kid>>;
  deleteKid(KidId: string): Promise<ServiceResponse<boolean>>;

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
      const Kids = await firebaseService.getKids();
      return {
        success: true,
        data: Kids,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get Kids: ${error}`,
      };
    }
  }

  async addKid(KidData: Omit<Kid, "id">): Promise<ServiceResponse<Kid>> {
    try {
      const Kid = {
        ...KidData,
        id: `Kid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };
      await firebaseService.addKid(Kid);
      return {
        success: true,
        data: Kid,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to add Kid: ${error}`,
      };
    }
  }

  async updateKid(
    KidId: string,
    updates: Partial<Kid>
  ): Promise<ServiceResponse<Kid>> {
    try {
      // Firebase service doesn't have updateKid, so we need to get all Kids and update
      const Kids = await firebaseService.getKids();
      const KidIndex = Kids.findIndex((Kid) => Kid.id === KidId);

      if (KidIndex === -1) {
        throw new Error("Kid not found");
      }

      const updatedKid = { ...Kids[KidIndex], ...updates };
      Kids[KidIndex] = updatedKid;

      await firebaseService.addKid(Kids); // This saves all Kids
      return {
        success: true,
        data: updatedKid,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update Kid: ${error}`,
      };
    }
  }

  async deleteKid(KidId: string): Promise<ServiceResponse<boolean>> {
    try {
      // Firebase service doesn't have deleteKid, so we need to get all Kids and filter
      const Kids = await firebaseService.getKids();
      const filteredKids = Kids.filter((Kid) => Kid.id !== KidId);

      await firebaseService.addKid(filteredKids);
      return {
        success: true,
        data: true,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete Kid: ${error}`,
      };
    }
  }
}

// Export singleton instance
export const dataRepository: DataRepository = new FirebaseDataRepository();

export default dataRepository;
